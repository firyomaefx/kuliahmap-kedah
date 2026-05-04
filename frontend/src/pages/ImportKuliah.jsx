import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, CheckCircle, AlertCircle, Loader2, Trash2, Plus, Copy } from 'lucide-react'
import api from '../api'

export default function ImportKuliah() {
  const [text, setText] = useState('')
  const [districtHint, setDistrictHint] = useState('')
  const [events, setEvents] = useState([])
  const [page, setPage] = useState('paste') // paste | preview | done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const districts = [ 'Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan' ]

  async function handleParse() {
    if (!text.trim()) { setError('Sila tampal teks jadual kuliah.'); return }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/events/parse', {
        text: text.trim(),
        district_hint: districtHint || undefined
      })
      setEvents(data.events || [])
      setPage('preview')
    } catch (err) {
      setError(err.response?.data?.error || 'Ralat semasa menganalisis teks.')
    } finally { setLoading(false) }
  }

  async function handleBulkInsert() {
    const token = localStorage.getItem('userToken')
    if (!token) { setError('Sila log masuk sebagai admin untuk mengimport.'); return }
    setLoading(true); setError('');
    const toImport = events.filter(e => e._checked !== false)
    try {
      const { data } = await api.post('/events/bulk', { events: toImport }, { headers: { Authorization: `Bearer ${token}` } })
      setResult(data)
      setPage('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Ralat semasa mengimport rekod.')
    } finally { setLoading(false) }
  }

  function updateEvent(idx, field, value) {
    setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, [field]: value } : ev))
  }

  function toggleCheck(idx) {
    setEvents(prev => prev.map((ev, i) => i === idx ? { ...ev, _checked: ev._checked !== false } : ev))
  }

  function removeEvent(idx) {
    setEvents(prev => prev.filter((_, i) => i !== idx))
  }

  function addEvent() {
    setEvents(prev => [...prev, { masjid_name:'', district:districtHint||'Kulim', title:'', ustaz_name:'', kuliah_type:'kuliah_maghrib', time_start:'19:15', recurrence:'weekly', recurrence_day:null, _checked:true }])
  }

  function copyJson() {
    navigator.clipboard.writeText(JSON.stringify(events, null, 2))
  }

  if (page === 'done') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-emerald-800 mb-2">Import Selesai!</h2>
        <p className="text-gray-600 mb-2">Berjaya: {result?.inserted_count || 0} rekod | Gagal: {result?.failed_count || 0}</p>
        {result?.failed_count > 0 && (
          <div className="text-left bg-red-50 text-red-700 text-sm p-3 rounded-lg mt-3 max-h-48 overflow-auto">
            {result.failed.map((f,i) => <div key={i}><b>{f.event.masjid_name}</b>: {f.error}</div>)}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => { setPage('paste'); setText(''); setEvents([]); setResult(null) }} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Import Lagi</button>
          <Link to="/admin" className="text-emerald-700 underline py-2">Ke Panel Admin</Link>
        </div>
      </div>
    )
  }

  if (page === 'preview') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2"><Upload className="w-5 h-5" />Semakan AI ({events.length} rekod)</h1>
          <div className="flex gap-2">
            <button onClick={copyJson} className="text-sm flex items-center gap-1 text-gray-600 hover:text-emerald-700"><Copy className="w-4 h-4" />Salin JSON</button>
            <button onClick={addEvent} className="text-sm flex items-center gap-1 text-emerald-700 hover:text-emerald-800"><Plus className="w-4 h-4" />Tambah</button>
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-emerald-50 text-emerald-800">
              <tr>
                <th className="px-3 py-2 text-left w-8"><input type="checkbox" checked={events.every(e => e._checked !== false)} onChange={() => setEvents(prev => { const allOn = prev.every(e => e._checked !== false); return prev.map(e => ({...e, _checked: !allOn })) })} /></th>
                <th className="px-3 py-2 text-left">Masjid</th>
                <th className="px-3 py-2 text-left">Daerah</th>
                <th className="px-3 py-2 text-left">Tajuk</th>
                <th className="px-3 py-2 text-left">Ustaz</th>
                <th className="px-3 py-2 text-left">Jenis</th>
                <th className="px-3 py-2 text-left">Masa</th>
                <th className="px-3 py-2 text-left">Ulangan</th>
                <th className="px-3 py-2 text-left w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((ev, i) => (
                <tr key={i} className={ev._checked === false ? 'opacity-40 bg-gray-50' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2"><input type="checkbox" checked={ev._checked !== false} onChange={() => toggleCheck(i)} /></td>
                  <td className="px-3 py-2">
                    <input value={ev.masjid_name} onChange={e => updateEvent(i, 'masjid_name', e.target.value)} className="w-40 border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-emerald-400" />
                    {ev.address && <div className="text-xs text-gray-400 mt-0.5">{ev.address}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <select value={ev.district} onChange={e => updateEvent(i, 'district', e.target.value)} className="w-28 border rounded px-2 py-1 text-sm">
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input value={ev.title} onChange={e => updateEvent(i, 'title', e.target.value)} className="w-40 border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2"><input value={ev.ustaz_name} onChange={e => updateEvent(i, 'ustaz_name', e.target.value)} className="w-32 border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2">
                    <select value={ev.kuliah_type} onChange={e => updateEvent(i, 'kuliah_type', e.target.value)} className="w-28 border rounded px-2 py-1 text-sm">
                      {[{v:'kuliah_maghrib',l:'Maghrib'},{v:'kuliah_subuh',l:'Subuh'},{v:'ceramah_khas',l:'Ceramah'},{v:'tazkirah',l:'Tazkirah'},{v:'kuliah_muslimat',l:'Muslimat'},{v:'kuliah_jumaat',l:'Jumaat'}].map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="time" value={ev.time_start} onChange={e => updateEvent(i, 'time_start', e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <select value={ev.recurrence} onChange={e => updateEvent(i, 'recurrence', e.target.value)} className="w-20 border rounded px-2 py-1 text-sm">
                        <option value="one_time">1x</option><option value="weekly">Mgu</option><option value="monthly">Bln</option>
                      </select>
                      {ev.recurrence === 'weekly' && (
                        <select value={ev.recurrence_day || ''} onChange={e => updateEvent(i, 'recurrence_day', e.target.value || null)} className="w-20 border rounded px-2 py-1 text-sm">
                          <option value="">Hari?</option>
                          {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => <option key={d} value={d}>{({monday:'Isnin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Khamis',friday:'Jumaat',saturday:'Sabtu',sunday:'Ahad'})[d]}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2"><button onClick={() => removeEvent(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <button onClick={() => setPage('paste')} className="text-gray-500 hover:text-gray-700 text-sm">← Kembali ke Teks</button>
          <button onClick={handleBulkInsert} disabled={loading || events.filter(e => e._checked !== false).length === 0} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Import {events.filter(e => e._checked !== false).length} Rekod
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2 mb-2"><Upload className="w-5 h-5" />Import Jadual Kuliah (AI)</h1>
      <p className="text-gray-500 text-sm mb-4">Tampal teks jadual kuliah (cth: dari WhatsApp / Poster) dan AI akan ekstrak maklumat secara automatik.</p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Daerah (hint)</label>
        <select value={districtHint} onChange={e => setDistrictHint(e.target.value)} className="w-full sm:w-64 border rounded-lg px-3 py-2 text-sm">
          <option value="">Pilih daerah (opsional)</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={12}
        className="w-full border rounded-xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
        placeholder={`Contoh:\nSurau Al-Hidayah, Taman Ria Jaya\nIsnin - Ustaz Ahmad - Kuliah Maghrib (7:15pm)\n\nKhamis - Ustazah Siti - Kuliah Muslimat (9:00pm)\n\nMasjid Zahir, Alor Setar\nSetiap Jumaat - Ceramah Khas - 8:30pm`}
      />

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-gray-400">{text.length} aksara</p>
        <button onClick={handleParse} disabled={loading} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Analisis dengan AI
        </button>
      </div>
    </div>
  )
}
