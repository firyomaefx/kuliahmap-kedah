import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, MapPin, Clock, Calendar, User, Search,
  Navigation, ChevronRight, Send, CheckCircle, Loader2,
  BellRing, Phone, X
} from 'lucide-react'
import api from '../api'
import useWebSocket from '../hooks/useWebSocket'

const DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']
const DAY_NAMES = {sunday:'Ahad',monday:'Isnin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Khamis',friday:'Jumaat',saturday:'Sabtu'}
const TYPE_BADGES = {kuliah_maghrib:'bg-emerald-100 text-emerald-700',kuliah_subuh:'bg-sky-100 text-sky-700',ceramah_khas:'bg-amber-100 text-amber-700',tazkirah:'bg-purple-100 text-purple-700',kuliah_muslimat:'bg-pink-100 text-pink-700',kuliah_jumaat:'bg-indigo-100 text-indigo-700'}
const TYPE_LABELS = {kuliah_maghrib:'Maghrib',kuliah_subuh:'Subuh',ceramah_khas:'Ceramah',tazkirah:'Tazkirah',kuliah_muslimat:'Muslimat',kuliah_jumaat:'Jumaat'}

const FILTER_PILLS = [{key:'',label:'Semua'},{key:'kuliah_maghrib',label:'Maghrib'},{key:'kuliah_subuh',label:'Subuh'},{key:'tazkirah',label:'Tazkirah'},{key:'ceramah_khas',label:'Ceramah'},{key:'kuliah_muslimat',label:'Muslimat'},{key:'kuliah_jumaat',label:'Jumaat'}]

function formatTime(t) {
  if (!t) return ''
  const [h,m] = t.split(':'); const hr = parseInt(h)
  return `${hr>12?hr-12:hr===0?12:hr}:${m} ${hr>=12?'PM':'AM'}`
}
function formatDate(d) {
  if (!d) return ''
  return new Date(d+'T00:00:00').toLocaleDateString('ms-MY',{weekday:'short',day:'numeric',month:'short'})
}
function formatSchedule(k) {
  if (k.date) return formatDate(k.date)
  if (k.recurrence === 'weekly') { const d = DAY_NAMES[k.recurrence_day]; return d ? `Setiap ${d}` : 'Mingguan' }
  if (k.recurrence === 'monthly') return 'Bulanan'
  return formatDate(k.next_date || k.date)
}

function isValidMYPhone(v) {
  if (!v) return false
  const clean = v.replace(/\s/g, '')
  return /^(01[0-9]{1}-[0-9]{7,8}|01[0-9]{8,9})$/.test(clean)
}

export default function Home() {
  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('')
  const [type, setType] = useState('')
  const [kuliahList, setKuliahList] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadText, setUploadText] = useState('')
  const [uploadPhone, setUploadPhone] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const { lastEvent } = useWebSocket()
  const [liveNotice, setLiveNotice] = useState('')

  useEffect(() => { fetchKuliah() }, [district, type])
  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'kuliah_update') {
      setLiveNotice(lastEvent.data.action === 'approved' ? 'Jadual baru diluluskan!' : 'Jadual dikemas kini.')
      fetchKuliah()
    }
    const t = setTimeout(() => setLiveNotice(''), 4000)
    return () => clearTimeout(t)
  }, [lastEvent])

  function fetchKuliah() {
    const p = {}
    if (district) p.district = district
    if (type) p.type = type
    api.get('/kuliah', { params: p }).then(r => setKuliahList(r.data)).catch(() => {})
  }

  const filtered = useMemo(() => {
    let l = [...kuliahList]
    if (search) {
      const s = search.toLowerCase()
      l = l.filter(k => k.masjid_name?.toLowerCase().includes(s) || k.ustaz_name?.toLowerCase().includes(s) || k.title?.toLowerCase().includes(s))
    }
    l.sort((a, b) => {
      const aD = a.date || a.next_date || '9999-12-31'
      const bD = b.date || b.next_date || '9999-12-31'
      return aD.localeCompare(bD)
    })
    return l
  }, [kuliahList, search])

  async function handleUpload() {
    setUploadError('')
    setUploadSuccess('')
    if (!uploadText.trim()) { setUploadError('Sila tampal teks jadual kuliah.'); return }
    if (!isValidMYPhone(uploadPhone)) { setUploadError('Sila masukkan nombor telefon Malaysia yang sah.'); return }
    setUploading(true)
    try {
      const { data } = await api.post('/events/auto-insert', {
        text: uploadText.trim(),
        phone: uploadPhone.trim(),
        name: uploadName.trim() || null
      })
      setUploadSuccess(data.message || `${data.inserted_count} jadual berjaya dimasukkan.`)
      setUploadText('')
      fetchKuliah()
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Ralat. Sila cuba lagi.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-emerald-700">
            <BookOpen size={24} strokeWidth={2.5} />
            <h1 className="text-xl font-bold tracking-tight">KuliahMap</h1>
          </Link>
          <Link to="/auth" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-700 bg-slate-100 px-3 py-1.5 rounded-lg">
            <User size={14} />Log Masuk
          </Link>
        </div>
      </header>

      {/* Live notice */}
      {liveNotice && (
        <div className="max-w-xl mx-auto px-4 mt-3">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg animate-pulse">
            <BellRing className="w-4 h-4 shrink-0" />{liveNotice}
            <button onClick={()=>setLiveNotice('')} className="ml-auto"><X size={14}/></button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="max-w-xl mx-auto px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Cari ustaz, masjid, tajuk..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none shadow-sm" />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTER_PILLS.map((t, idx) => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-colors ${type === t.key || (t.key === '' && type === '' && idx === 0) ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select value={district} onChange={e => setDistrict(e.target.value)}
            className="flex-1 text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-200 shadow-sm">
            <option value="">Semua Daerah</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => { setDistrict(''); setType(''); setSearch('') }}
            className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200">
            Reset
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-xl mx-auto px-4 mt-5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Senarai Kuliah ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Tiada kuliah dijumpai</p>
          </div>
        ) : filtered.map(k => (
          <Link to={`/kuliah/${k.id}`} key={k.id}
            className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${TYPE_BADGES[k.kuliah_type] || 'bg-slate-100 text-slate-600'}`}>
                {TYPE_LABELS[k.kuliah_type] || (k.kuliah_type || '').replace(/_/g, ' ')}
              </span>
              {k.is_today && <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">HARI INI</span>}
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug mb-1">{k.title}</h3>
            <div className="space-y-2 mt-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700">{k.ustaz_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span>{k.masjid_name}</span>
                {k.district && <span className="text-slate-400 text-xs">{k.district}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className={k.date ? 'font-semibold text-emerald-700' : ''}>{formatSchedule(k)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400 shrink-0" />
                <span>{formatTime(k.time_start)}{k.time_end ? ` - ${formatTime(k.time_end)}` : ''}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end text-emerald-600 text-sm font-semibold gap-1">
              Lihat Detail <ChevronRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {/* Upload Form */}
      <div className="max-w-xl mx-auto px-4 mt-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-600 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Hantar Jadual Kuliah</h2>
              <p className="text-emerald-100 text-xs">Tampal teks jadual — AI akan proses automatik</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {uploadSuccess && (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border border-emerald-200">
                <CheckCircle size={16} className="shrink-0" />
                {uploadSuccess}
                <button onClick={() => setUploadSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-700"><X size={14} /></button>
              </div>
            )}
            {uploadError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">{uploadError}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nama <span className="text-slate-300">(opsional)</span></label>
                <input type="text" value={uploadName} onChange={e => setUploadName(e.target.value)}
                  placeholder="Abdullah"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Telefon <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={uploadPhone} onChange={e => setUploadPhone(e.target.value)}
                    placeholder="012-3456789"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Teks Jadual Kuliah <span className="text-red-500">*</span></label>
              <textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
                rows={8}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y bg-slate-50"
                placeholder={`Tampal teks WhatsApp / poster di sini...\n\nContoh:\nMasjid Zahir, Alor Setar\n5 Mei 2026 - Ustaz Ahmad - Kuliah Maghrib\nKhamis - Ustazah Siti - Kuliah Muslimat`}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{uploadText.length} aksara</p>
            </div>

            <button onClick={handleUpload} disabled={uploading}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {uploading ? 'Memproses...' : 'Hantar Jadual'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-8" />

      {/* Mobile bottom nav (Home is standalone, needs its own) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="max-w-xl mx-auto flex justify-around items-center py-1.5 px-2">
          <Link to="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-emerald-600">
            <BookOpen className="w-5 h-5" /><span className="text-[10px] font-medium">Utama</span>
          </Link>
          <Link to="/submit" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-emerald-600">
            <Send className="w-5 h-5" /><span className="text-[10px] font-medium">Hantar</span>
          </Link>
          <Link to="/admin" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-emerald-600">
            <Navigation className="w-5 h-5" /><span className="text-[10px] font-medium">Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
