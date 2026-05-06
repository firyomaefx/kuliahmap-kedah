import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, MapPin, Clock, Calendar, User, Search,
  ChevronRight, Send, CheckCircle, Loader2,
  BellRing, Phone, X, RefreshCw, Sparkles, Megaphone
} from 'lucide-react'
import api from '../api'
import useWebSocket from '../hooks/useWebSocket'

const PAS_GREEN = '#008000'
const PAS_DARK = '#004d00'
const PAS_LIGHT = '#e6ffe6'

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
  const [uploadText, setUploadText] = useState('')
  const [uploadPhone, setUploadPhone] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [featured, setFeatured] = useState(null)
  const [featuredLoading, setFeaturedLoading] = useState(false)
  const { lastEvent } = useWebSocket()
  const [liveNotice, setLiveNotice] = useState('')

  useEffect(() => { fetchKuliah() }, [district, type])
  useEffect(() => { fetchFeatured() }, [])
  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'kuliah_update') {
      setLiveNotice(lastEvent.data.action === 'approved' ? 'Jadual baru diluluskan!' : 'Jadual dikemas kini.')
      fetchKuliah()
      fetchFeatured()
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

  function fetchFeatured(force) {
    setFeaturedLoading(true)
    const url = force ? '/events/featured?t=' + Date.now() : '/events/featured'
    api.get(url).then(r => setFeatured(r.data)).catch(() => {}).finally(() => setFeaturedLoading(false))
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
      fetchFeatured()
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Ralat. Sila cuba lagi.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-8" style={{background: PAS_LIGHT}}>
      {/* Header */}
      <header className="sticky top-0 z-40 shadow-md" style={{background: 'white', borderBottom: `3px solid ${PAS_GREEN}`}}>
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" style={{color: PAS_DARK}}>
            <BookOpen size={24} strokeWidth={2.5} />
            <h1 className="text-xl font-bold tracking-tight">KuliahMap</h1>
          </Link>
          <Link to="/auth" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{background: PAS_GREEN, color:'white'}}>
            <User size={14} />Log Masuk
          </Link>
        </div>
      </header>

      {/* Live notice */}
      {liveNotice && (
        <div className="max-w-xl mx-auto px-4 mt-3">
          <div className="text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg animate-pulse"
            style={{background: `linear-gradient(135deg, ${PAS_GREEN}, ${PAS_DARK})`}}>
            <BellRing className="w-4 h-4 shrink-0" />{liveNotice}
            <button onClick={()=>setLiveNotice('')} className="ml-auto"><X size={14}/></button>
          </div>
        </div>
      )}

      {/* Featured Event of the Day */}
      <div className="max-w-xl mx-auto px-4 mt-4">
        {featured ? (
          <div className="text-white rounded-2xl p-6 shadow-lg relative overflow-hidden"
            style={{background: `linear-gradient(135deg, ${PAS_GREEN}, ${PAS_DARK})`}}>
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone size={18} className="opacity-80" />
                  <span className="text-xs font-bold tracking-wider opacity-80 uppercase">Acara Pilihan Hari Ini</span>
                </div>
                <h2 className="text-2xl font-extrabold leading-tight mb-3">{featured.headline}</h2>
                <p className="text-base leading-relaxed opacity-90 mb-4">{featured.subhead}</p>
                {featured.ajakan && (
                  <span className="inline-block text-sm font-bold px-4 py-2 rounded-full"
                    style={{background: 'rgba(255,255,255,0.2)'}}>{featured.ajakan}</span>
                )}
              </div>
              <button
                onClick={() => fetchFeatured(true)}
                disabled={featuredLoading}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0"
                title="Segarkan">
                <RefreshCw size={20} className={featuredLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Sparkles size={14} className="opacity-60" />
              <span className="text-xs opacity-70">{featured.count} kuliah hari ini</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{background: 'white', border: `2px dashed ${PAS_GREEN}`}}>
            <Megaphone size={32} className="mx-auto mb-2" style={{color: PAS_GREEN, opacity: 0.4}} />
            <p className="text-slate-400 font-medium">Memuatkan acara pilihan...</p>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="max-w-xl mx-auto px-4 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Cari ustaz, masjid, tajuk..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm outline-none shadow-sm"
            style={{borderColor: '#c8e6c8', focusRing: PAS_GREEN}} />
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTER_PILLS.map((t, idx) => (
            <button key={t.key} onClick={() => setType(t.key)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-colors"
              style={type === t.key || (t.key === '' && type === '' && idx === 0)
                ? {background: PAS_GREEN, color: 'white'}
                : {background: 'white', color: '#555', border: '1px solid #c8e6c8'}}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select value={district} onChange={e => setDistrict(e.target.value)}
            className="flex-1 text-xs font-medium bg-white border rounded-xl px-3 py-2.5 outline-none shadow-sm"
            style={{borderColor: '#c8e6c8'}}>
            <option value="">Semua Daerah</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => { setDistrict(''); setType(''); setSearch('') }}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl hover:opacity-80"
            style={{background: PAS_GREEN, color: 'white'}}>
            Reset
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-xl mx-auto px-4 mt-5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{color: '#888'}}>Senarai Kuliah ({filtered.length})</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border shadow-sm" style={{borderColor: '#c8e6c8'}}>
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Tiada kuliah dijumpai</p>
          </div>
        ) : filtered.map(k => (
          <Link to={`/kuliah/${k.id}`} key={k.id}
            className="block bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all"
            style={{borderLeft: `4px solid ${PAS_GREEN}`, borderColor: '#c8e6c8'}}>
            <div className="flex justify-between items-start mb-3">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${TYPE_BADGES[k.kuliah_type] || 'bg-slate-100 text-slate-600'}`}>
                {TYPE_LABELS[k.kuliah_type] || (k.kuliah_type || '').replace(/_/g, ' ')}
              </span>
              {k.is_today && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background: '#fff3cd', color: '#856404'}}>HARI INI</span>
              )}
            </div>
            <h3 className="text-lg font-bold leading-snug mb-1" style={{color: PAS_DARK}}>{k.title}</h3>
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
                <span style={k.date ? {fontWeight: 'bold', color: PAS_GREEN} : {}}>{formatSchedule(k)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400 shrink-0" />
                <span>{formatTime(k.time_start)}{k.time_end ? ` - ${formatTime(k.time_end)}` : ''}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end text-sm font-semibold gap-1" style={{color: PAS_GREEN}}>
              Lihat Detail <ChevronRight size={16} />
            </div>
          </Link>
        ))}
      </div>

      {/* Upload Form */}
      <div className="max-w-xl mx-auto px-4 mt-10">
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{borderColor: '#c8e6c8'}}>
          <div className="px-5 py-4 flex items-center gap-3" style={{background: PAS_GREEN}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'rgba(255,255,255,0.2)'}}>
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Hantar Jadual Kuliah</h2>
              <p className="text-xs" style={{color: 'rgba(255,255,255,0.8)'}}>Tampal teks jadual — AI akan proses automatik</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {uploadSuccess && (
              <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2 border"
                style={{background: PAS_LIGHT, color: PAS_DARK, borderColor: PAS_GREEN}}>
                <CheckCircle size={16} className="shrink-0" />
                {uploadSuccess}
                <button onClick={() => setUploadSuccess('')} className="ml-auto hover:opacity-70"><X size={14} /></button>
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
                  className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none bg-slate-50"
                  style={{borderColor: '#c8e6c8'}} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Telefon <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={uploadPhone} onChange={e => setUploadPhone(e.target.value)}
                    placeholder="012-3456789"
                    className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm outline-none bg-slate-50"
                    style={{borderColor: '#c8e6c8'}} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Teks Jadual Kuliah <span className="text-red-500">*</span></label>
              <textarea value={uploadText} onChange={e => setUploadText(e.target.value)}
                rows={8}
                className="w-full border rounded-xl p-3 text-sm font-mono outline-none resize-y bg-slate-50"
                style={{borderColor: '#c8e6c8'}}
                placeholder={`Tampal teks WhatsApp / poster di sini...\n\nContoh:\nMasjid Zahir, Alor Setar\n5 Mei 2026 - Ustaz Ahmad - Kuliah Maghrib\nKhamis - Ustazah Siti - Kuliah Muslimat`}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{uploadText.length} aksara</p>
            </div>

            <button onClick={handleUpload} disabled={uploading}
              className="w-full text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
              style={{background: uploading ? PAS_DARK : PAS_GREEN}}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {uploading ? 'Memproses...' : 'Hantar Jadual'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-24" />

      {/* Credits */}
      <div className="max-w-xl mx-auto px-4 py-4 text-center">
        <p className="text-xs" style={{color: '#999'}}>
          KuliahMap Kedah | Disediakan oleh <a href="https://t.me/PedotTTRG" target="_blank" rel="noreferrer" style={{color: PAS_GREEN, fontWeight: 700}}>@PedotTTRG</a>
        </p>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 shadow-lg" style={{borderColor: PAS_GREEN}}>
        <div className="max-w-xl mx-auto flex justify-around items-center py-1.5 px-2">
          <Link to="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl" style={{color: PAS_GREEN}}>
            <BookOpen className="w-5 h-5" /><span className="text-[10px] font-medium">Utama</span>
          </Link>
          <Link to="/submit" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400"
            onMouseOver={e => e.currentTarget.style.color = PAS_GREEN} onMouseOut={e => e.currentTarget.style.color = ''}>
            <Send className="w-5 h-5" /><span className="text-[10px] font-medium">Hantar</span>
          </Link>
          <Link to="/admin" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400"
            onMouseOver={e => e.currentTarget.style.color = PAS_GREEN} onMouseOut={e => e.currentTarget.style.color = ''}>
            <Megaphone className="w-5 h-5" /><span className="text-[10px] font-medium">Admin</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
