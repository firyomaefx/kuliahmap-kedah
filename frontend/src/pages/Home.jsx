import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  BookOpen, MapPin, Clock, Calendar, User, Search, SlidersHorizontal,
  Navigation, ChevronRight, ArrowLeft, X, Map as MapIcon, List as ListIcon,
  BellRing, Share2, ExternalLink, AlertTriangle, Send, Upload, Shield
} from 'lucide-react'
import api from '../api'
import useWebSocket from '../hooks/useWebSocket'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34],
})

const DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']
const DAY_NAMES = {sunday:'Ahad',monday:'Isnin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Khamis',friday:'Jumaat',saturday:'Sabtu'}
const TYPE_BADGES = {kuliah_maghrib:'bg-emerald-100 text-emerald-700',kuliah_subuh:'bg-sky-100 text-sky-700',ceramah_khas:'bg-amber-100 text-amber-700',tazkirah:'bg-purple-100 text-purple-700',kuliah_muslimat:'bg-pink-100 text-pink-700',kuliah_jumaat:'bg-indigo-100 text-indigo-700'}

const SORT_OPTIONS = {soonest:'Paling Awal',nearest:'Paling Dekat'}
const FILTER_PILLS = [{key:'',label:'Semua'},{key:'kuliah_maghrib',label:'Maghrib'},{key:'kuliah_subuh',label:'Subuh'},{key:'tazkirah',label:'Tazkirah'},{key:'ceramah_khas',label:'Ceramah'},{key:'kuliah_muslimat',label:'Muslimat'},{key:'kuliah_jumaat',label:'Jumaat'}]
const TIMES = [{value:'',label:'Semua Masa'},{value:'today',label:'Hari Ini'},{value:'week',label:'Minggu Ini'},{value:'month',label:'Bulan Ini'}]

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
  if (k.recurrence==='weekly') { const d=DAY_NAMES[k.recurrence_day]; return `Setiap ${d||'Minggu'}${k.next_date?' \u00B7 '+formatDate(k.next_date):''}` }
  if (k.recurrence==='monthly') return `Setiap Bulan${k.next_date?' \u00B7 '+formatDate(k.next_date):''}`
  return formatDate(k.next_date||k.date)
}
function getUserLocation(setPos) {
  if (!navigator.geolocation) return alert('Geolokasi tidak disokong')
  navigator.geolocation.getCurrentPosition(
    p => setPos({lat:p.coords.latitude,lng:p.coords.longitude}),
    () => alert('Tidak dapat mengesan lokasi')
  )
}

function RecenterMap({pos}) { const map=useMap(); useEffect(()=>{if(pos)map.setView([pos.lat,pos.lng],14)},[pos]); return null }

export default function Home() {
  const [mobileView, setMobileView] = useState('list')
  const [search, setSearch] = useState('')
  const [district, setDistrict] = useState('')
  const [time, setTime] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('soonest')
  const [userPos, setUserPos] = useState(null)
  const [kuliahList, setKuliahList] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedKuliah, setSelectedKuliah] = useState(null)
  const { lastEvent } = useWebSocket()
  const [liveNotice, setLiveNotice] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => { fetchKuliah() }, [district, type, time, userPos])
  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type==='kuliah_update') { setLiveNotice(lastEvent.data.action==='approved'?'Kuliah baru diluluskan!':lastEvent.data.action==='deleted'?'Kuliah dipadam.':'Jadual dikemas kini.'); fetchKuliah() }
    else if (lastEvent.type==='new_submission') setLiveNotice('Hantaran baru diterima.')
    const t=setTimeout(()=>setLiveNotice(''),4000); return ()=>clearTimeout(t)
  }, [lastEvent])
  useEffect(() => {
    if (!selectedId) { setSelectedKuliah(null); return }
    api.get(`/kuliah/${selectedId}`).then(r=>setSelectedKuliah(r.data)).catch(()=>{})
  }, [selectedId])

  function fetchKuliah() {
    const p={}
    if(district) p.district=district
    if(type) p.type=type
    if(time) p.time=time
    if(userPos) { p.lat=userPos.lat; p.lng=userPos.lng }
    api.get('/kuliah',{params:p}).then(r=>setKuliahList(r.data)).catch(()=>{})
  }

  function handleReport() {
    if(!reportReason.trim()) return alert('Sila nyatakan sebab')
    api.post('/reports',{kuliah_id:selectedId,reason:reportReason}).then(()=>{setReportSent(true);setReportOpen(false)})
  }

  const filtered = useMemo(() => {
    let l=[...kuliahList]
    if(search) { const s=search.toLowerCase(); l=l.filter(k=>k.masjid_name?.toLowerCase().includes(s)||k.ustaz_name?.toLowerCase().includes(s)||k.title?.toLowerCase().includes(s)) }
    if(sort==='nearest'&&l[0]?.distance!==undefined) l.sort((a,b)=>a.distance-b.distance)
    else if(sort==='soonest') l.sort((a,b)=>{const aD=a.next_date||a.date||'9999-12-31';const bD=b.next_date||b.date||'9999-12-31';return aD.localeCompare(bD)})
    return l
  }, [kuliahList,search,sort])

  const center = userPos ? [userPos.lat,userPos.lng] : [5.3650,100.5556]

  const wazeUrl = selectedKuliah ? `https://waze.com/ul?ll=${selectedKuliah.latitude},${selectedKuliah.longitude}&navigate=yes` : '#'
  const gmapsUrl = selectedKuliah ? `https://www.google.com/maps/dir/?api=1&destination=${selectedKuliah.latitude},${selectedKuliah.longitude}` : '#'

  async function handleShare() {
    if(!selectedKuliah) return
    const t=`${selectedKuliah.title} oleh ${selectedKuliah.ustaz_name} di ${selectedKuliah.masjid_name}`
    if(navigator.share) { try{await navigator.share({title:selectedKuliah.title,text:t,url:window.location.href})}catch{} }
    else { try{await navigator.clipboard.writeText(`${t}\n${window.location.href}`);alert('Pautan disalin!')}catch{} }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row overflow-hidden">
      {/* ========== LEFT PANEL ========== */}
      <div className={`w-full md:w-[420px] lg:w-[480px] bg-white border-r border-slate-200 flex flex-col h-screen z-10 shadow-xl md:shadow-none ${mobileView==='map'?'hidden md:flex':'flex'}`}>

        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-emerald-700" onClick={()=>setSelectedId(null)}>
              <BookOpen size={24} strokeWidth={2.5} />
              <h1 className="text-2xl font-bold tracking-tight">KuliahMap</h1>
            </Link>
            <Link to="/auth" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
              <User size={18} />
            </Link>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium mt-1">
            <Navigation size={14} className="text-emerald-600" />
            <span>{userPos ? `${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)}` : 'Kedah, Malaysia'}</span>
          </div>
        </header>

        {liveNotice && (
          <div className="mx-6 mt-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg animate-pulse shrink-0">
            <BellRing className="w-4 h-4 shrink-0" />{liveNotice}
          </div>
        )}

        {/* Detail Panel (slides over list) */}
        {selectedKuliah && (
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <button onClick={()=>setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <ArrowLeft size={18} />
              </button>
              <span className="font-semibold text-slate-700 text-sm">Butiran Kuliah</span>
              <button onClick={()=>setReportOpen(true)} className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                <AlertTriangle size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${TYPE_BADGES[selectedKuliah.kuliah_type]||'bg-slate-100 text-slate-600'}`}>
                  {(selectedKuliah.kuliah_type||'').replace(/_/g,' ')}
                </span>
                {selectedKuliah.is_today && <span className="ml-2 inline-block bg-gradient-to-r from-amber-400 to-orange-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">HARI INI</span>}
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">{selectedKuliah.title}</h2>

              <div className="space-y-3">
                <Row icon={User} text={selectedKuliah.ustaz_name} />
                <Row icon={MapPin} text={selectedKuliah.masjid_name} sub={selectedKuliah.district} distance={selectedKuliah.distance} />
                <Row icon={Calendar} text={formatSchedule(selectedKuliah)} />
                <Row icon={Clock} text={`${formatTime(selectedKuliah.time_start)}${selectedKuliah.time_end?` - ${formatTime(selectedKuliah.time_end)}`:''}`} />
              </div>

              {selectedKuliah.description && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">{selectedKuliah.description}</p>}

              <div className="rounded-xl overflow-hidden border h-44">
                <MapContainer center={[selectedKuliah.latitude,selectedKuliah.longitude]} zoom={15} scrollWheelZoom={false} style={{height:'100%',width:'100%'}}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[selectedKuliah.latitude,selectedKuliah.longitude]}><Popup>{selectedKuliah.masjid_name}</Popup></Marker>
                </MapContainer>
              </div>

              <div className="flex flex-wrap gap-2">
                <a href={wazeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"><Navigation size={14}/>Waze</a>
                <a href={gmapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 shadow-sm"><ExternalLink size={14}/>Maps</a>
                <button onClick={handleShare} className="flex items-center gap-1.5 bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 shadow-sm"><Share2 size={14}/>Kongsi</button>
              </div>
            </div>
          </div>
        )}

        {/* List mode */}
        {!selectedKuliah && (
          <>
            {/* Sticky Search & Filters */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Cari ustaz, masjid, tajuk..." value={search} onChange={e=>setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none" />
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                {FILTER_PILLS.map((t,idx)=>(
                  <button key={t.key} onClick={()=>setType(t.key)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${type===t.key||(t.key===''&&type===''&&idx===0)?'bg-emerald-600 text-white shadow-sm shadow-emerald-200':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* District + Time row */}
              <div className="flex gap-2 mt-3">
                <select value={district} onChange={e=>setDistrict(e.target.value)} className="flex-1 text-xs font-medium bg-slate-100 border-0 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Semua Daerah</option>
                  {DISTRICTS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <select value={time} onChange={e=>setTime(e.target.value)} className="flex-1 text-xs font-medium bg-slate-100 border-0 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200">
                  {TIMES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* Lecture List */}
            <div className="flex-1 overflow-y-auto p-4 md:px-6 bg-slate-50 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Senarai Kuliah ({filtered.length})</h2>
                <select value={sort} onChange={e=>setSort(e.target.value)} className="text-xs font-medium text-slate-500 bg-transparent border-0 outline-none">
                  {Object.entries(SORT_OPTIONS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {filtered.length===0?(
                <div className="text-center py-16 text-slate-400"><Clock className="w-10 h-10 mx-auto mb-3 opacity-40"/><p className="font-medium">Tiada kuliah dijumpai</p></div>
              ):filtered.map(k=>(
                <div key={k.id} onClick={()=>setSelectedId(k.id)}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${TYPE_BADGES[k.kuliah_type]||'bg-slate-100 text-slate-600'}`}>
                      {(k.kuliah_type||'').replace(/_/g,' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      {k.is_today && <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">HARI INI</span>}
                      {k.distance!=null && <span className="text-xs font-semibold text-slate-400 flex items-center gap-0.5"><Navigation size={11}/>{k.distance} km</span>}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug mb-1 group-hover:text-emerald-700 transition-colors">{k.title}</h3>
                  <div className="space-y-2 mt-4">
                    <RowSm icon={User} text={k.ustaz_name}/>
                    <RowSm icon={MapPin} text={k.masjid_name}/>
                    <RowSm icon={Calendar} text={formatSchedule(k)}/>
                    <RowSm icon={Clock} text={`${formatTime(k.time_start)}${k.time_end?` - ${formatTime(k.time_end)}`:''}`}/>
                  </div>
                  <button className="w-full mt-4 py-2.5 flex items-center justify-center gap-2 bg-slate-50 text-emerald-700 font-semibold text-sm rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    Lihat Detail <ChevronRight size={16}/>
                  </button>
                </div>
              ))}
              <div className="h-20 md:h-4 w-full"/>
            </div>
          </>
        )}
      </div>

      {/* ========== RIGHT PANEL: MAP ========== */}
      <div className={`flex-1 relative ${mobileView==='list'?'hidden md:block':'block'} h-screen`}>
        <MapContainer center={center} zoom={userPos?14:10} scrollWheelZoom style={{height:'100%',width:'100%'}}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userPos && <Marker position={[userPos.lat,userPos.lng]} icon={userIcon}><Popup>Lokasi Anda</Popup></Marker>}
          {userPos && <RecenterMap pos={userPos}/>}
          {kuliahList.filter(k=>k.latitude&&k.latitude!==0).slice(0,200).map(k=>(
            <Marker key={k.id} position={[k.latitude,k.longitude]}
              eventHandlers={{click:()=>{setSelectedId(k.id);setMobileView('list')}}}>
              <Popup><div className="text-sm min-w-[160px]"><strong className="text-emerald-700">{k.title}</strong><br/>{k.masjid_name}<br/><span className="text-xs text-slate-400">{k.ustaz_name}</span></div></Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map overlay info card */}
        <div className="absolute top-4 left-4 right-4 md:left-4 md:right-auto md:w-64 bg-white/90 backdrop-blur-md p-3.5 rounded-2xl shadow-lg border border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><MapIcon size={16} className="text-emerald-600"/>Peta Kuliah</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">Klik pin untuk lihat detail kuliah. GPS untuk pencarian berdekatan.</p>
          <button onClick={()=>getUserLocation(setUserPos)} className="mt-3 w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5"><Navigation size={14}/>Kesan Lokasi Saya</button>
        </div>
      </div>

      {/* ========== MOBILE FLOATING TOGGLE ========== */}
      <div className="md:hidden fixed bottom-[4.5rem] left-1/2 -translate-x-1/2 z-50">
        <div className="bg-slate-900 p-1.5 rounded-full shadow-2xl shadow-slate-900/50 flex items-center gap-1">
          <button onClick={()=>setMobileView('list')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${mobileView==='list'?'bg-white text-slate-900':'text-slate-400 hover:text-white'}`}>
            <ListIcon size={16}/>Senarai
          </button>
          <button onClick={()=>setMobileView('map')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${mobileView==='map'?'bg-white text-slate-900':'text-slate-400 hover:text-white'}`}>
            <MapIcon size={16}/>Peta
          </button>
        </div>
      </div>

      {/* ========== BOTTOM NAV (mobile only) ========== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-40">
        <div className="flex justify-around items-center py-1.5 px-2">
          {[
            {to:'/',icon:BookOpen,label:'Utama'},
            {to:'/submit',icon:Send,label:'Hantar'},
            {to:'/import',icon:Upload,label:'Import'},
            {to:'/admin',icon:Shield,label:'Admin'},
          ].map(n=>(
            <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors">
              <n.icon className="w-5 h-5"/><span className="text-[10px] font-medium">{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ========== REPORT MODAL ========== */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle size={18}/>Lapor Maklumat Salah</h3>
            <textarea value={reportReason} onChange={e=>setReportReason(e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="Nyatakan sebab laporan..."/>
            <div className="flex gap-2 mt-3">
              <button onClick={handleReport} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-600 font-medium">Hantar</button>
              <button onClick={()=>setReportOpen(false)} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium">Batal</button>
            </div>
          </div>
        </div>
      )}
      {reportSent && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium z-[60] shadow-lg">Laporan dihantar!</div>}
    </div>
  )
}

function Row({icon:Icon,text,sub,distance}) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Icon size={14}/></div>
      <span className="font-medium text-slate-800">{text}</span>
      {sub && <span className="text-slate-400 text-xs ml-1">{sub}</span>}
      {distance!=null && <span className="text-emerald-600 font-semibold text-xs ml-auto">{distance} km</span>}
    </div>
  )
}
function RowSm({icon:Icon,text}) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Icon size={12}/></div>
      <span className="truncate text-sm">{text}</span>
    </div>
  )
}