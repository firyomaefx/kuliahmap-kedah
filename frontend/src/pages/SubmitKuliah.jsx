import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import api from '../api'

export default function SubmitKuliah() {
  const [step, setStep] = useState('paste') // paste | preview | done
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleParse() {
    if (!text.trim()) { setError('Sila tampal teks jadual kuliah.'); return }
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/events/parse', { text: text.trim() })
      const enriched = (data.events || []).map(e => ({ ...e, contact_phone: phone || e.contact_phone || null, submitted_by: name || null }))
      setEvents(enriched)
      setStep('preview')
    } catch (err) {
      setError(err.response?.data?.error || 'Ralat semasa menganalisis teks.')
    } finally { setLoading(false) }
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    const token = localStorage.getItem('adminToken') || localStorage.getItem('userToken')
    try {
      const toSubmit = events.filter(e => e._checked !== false)
      for (const ev of toSubmit) {
        await api.post('/kuliah/submit', {
          masjid_name: ev.masjid_name, address: ev.address, district: ev.district,
          title: ev.title, ustaz_name: ev.ustaz_name, description: ev.description,
          kuliah_type: ev.kuliah_type, date: ev.date, time_start: ev.time_start, time_end: ev.time_end,
          recurrence: ev.recurrence, recurrence_day: ev.recurrence_day, contact_phone: ev.contact_phone
        })
      }
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Ralat menghantar.')
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

  const DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']
  const TYPES = [{v:'kuliah_maghrib',l:'Kuliah Maghrib'},{v:'kuliah_subuh',l:'Kuliah Subuh'},{v:'ceramah_khas',l:'Ceramah Khas'},{v:'tazkirah',l:'Tazkirah'},{v:'kuliah_muslimat',l:'Kuliah Muslimat'},{v:'kuliah_jumaat',l:'Kuliah Jumaat'}]
  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
  const DAY_LABELS = {monday:'Isnin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Khamis',friday:'Jumaat',saturday:'Sabtu',sunday:'Ahad'}

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">Berjaya Dihantar!</h2>
        <p className="text-gray-500 mb-6">{events.length} jadual kuliah sedang disemak oleh admin.</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => { setStep('paste'); setText(''); setEvents([]); setError('') }} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 shadow-md">Hantar Lagi</button>
          <Link to="/" className="text-emerald-700 underline py-2.5">Kembali</Link>
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" />Semakan AI ({events.length} jadual)</h1>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}
        <div className="card-glass overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-3 py-2 text-left w-8"><input type="checkbox" checked={events.every(e => e._checked !== false)} onChange={() => setEvents(prev => { const allOn = prev.every(e => e._checked !== false); return prev.map(e => ({...e, _checked: !allOn})) })} /></th>
                <th className="px-3 py-2 text-left text-emerald-800">Masjid</th>
                <th className="px-3 py-2 text-left text-emerald-800">Daerah</th>
                <th className="px-3 py-2 text-left text-emerald-800">Tajuk</th>
                <th className="px-3 py-2 text-left text-emerald-800">Ustaz</th>
                <th className="px-3 py-2 text-left text-emerald-800">Jenis</th>
                <th className="px-3 py-2 text-left text-emerald-800">Masa</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((ev, i) => (
                <tr key={i} className={ev._checked === false ? 'opacity-40 bg-gray-50' : 'hover:bg-emerald-50/30'}>
                  <td className="px-3 py-2"><input type="checkbox" checked={ev._checked !== false} onChange={() => toggleCheck(i)} /></td>
                  <td className="px-3 py-2"><input value={ev.masjid_name} onChange={e => updateEvent(i, 'masjid_name', e.target.value)} className="w-36 border border-emerald-200 rounded-lg px-2 py-1 text-sm bg-white/80" /></td>
                  <td className="px-3 py-2">
                    <select value={ev.district} onChange={e => updateEvent(i, 'district', e.target.value)} className="w-28 border border-emerald-200 rounded-lg px-2 py-1 text-sm bg-white/80">
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input value={ev.title} onChange={e => updateEvent(i, 'title', e.target.value)} className="w-36 border border-emerald-200 rounded-lg px-2 py-1 text-sm bg-white/80" /></td>
                  <td className="px-3 py-2"><input value={ev.ustaz_name} onChange={e => updateEvent(i, 'ustaz_name', e.target.value)} className="w-32 border border-emerald-200 rounded-lg px-2 py-1 text-sm bg-white/80" /></td>
                  <td className="px-3 py-2">
                    <select value={ev.kuliah_type} onChange={e => updateEvent(i, 'kuliah_type', e.target.value)} className="w-24 border border-emerald-200 rounded-lg px-1 py-1 text-xs bg-white/80">
                      {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input type="time" value={ev.time_start} onChange={e => updateEvent(i, 'time_start', e.target.value)} className="w-20 border border-emerald-200 rounded-lg px-1 py-1 text-sm bg-white/80" /></td>
                  <td className="px-3 py-2"><button onClick={() => removeEvent(i)} className="text-red-400 hover:text-red-600 transition-colors">&times;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-5">
          <button onClick={() => setStep('paste')} className="text-gray-500 hover:text-gray-700 text-sm">&larr; Kembali</button>
          <button onClick={handleSubmit} disabled={loading || events.filter(e => e._checked !== false).length === 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-emerald-200">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Hantar {events.filter(e => e._checked !== false).length} Jadual
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
          <Send className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-emerald-800">Hantar Jadual</h1>
        <p className="text-gray-500 text-sm mt-1">Tampal teks jadual kuliah — AI kami akan extract secara automatik</p>
      </div>

      <div className="card-glass p-5 space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama (opsional)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Abdullah" className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white/80" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Telefon (opsional)</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="012-3456789" className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white/80" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Teks jadual kuliah</label>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            rows={10}
            className="w-full border border-emerald-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y bg-white/80"
            placeholder={"Tampal teks WhatsApp/Poster di sini...\n\nContoh:\nMasjid Zahir, Alor Setar\nSetiap Isnin - Ustaz Ahmad - Kuliah Maghrib\nKhamis - Ustazah Siti - Kuliah Muslimat"}
          />
          <p className="text-xs text-gray-400 mt-1">{text.length} aksara</p>
        </div>

        <button onClick={handleParse} disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Sparkles className="w-4 h-4" />
          Analisis dengan AI
        </button>
      </div>
    </div>
  )
}