import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { MapPin, Clock, User, Navigation, Crosshair, Search, BellRing, Filter } from 'lucide-react'
import api from '../api'
import { useAuth } from '../App'
import useWebSocket from '../hooks/useWebSocket'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const masjidIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']
const TYPES = [
  { value: '', label: 'Semua Jenis' },{ value: 'kuliah_maghrib', label: 'Kuliah Maghrib', badge: 'badge-maghrib' },
  { value: 'kuliah_subuh', label: 'Kuliah Subuh', badge: 'badge-subuh' },{ value: 'ceramah_khas', label: 'Ceramah Khas', badge: 'badge-ceramah' },
  { value: 'tazkirah', label: 'Tazkirah', badge: 'badge-tazkirah' },{ value: 'kuliah_muslimat', label: 'Kuliah Muslimat', badge: 'badge-muslimat' },
  { value: 'kuliah_jumaat', label: 'Kuliah Jumaat', badge: 'badge-jumaat' },
]
const TIMES = [{ value: '', label: 'Semua Masa' },{ value: 'today', label: 'Hari Ini' },{ value: 'week', label: 'Minggu Ini' },{ value: 'month', label: 'Bulan Ini' }]
const DAY_NAMES = { sunday:'Ahad',monday:'Isnin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Khamis',friday:'Jumaat',saturday:'Sabtu' }

function RecenterMap({ lat, lng }) {
  const map = useMap()
  useEffect(() => { if (lat && lng) map.setView([lat, lng], 14) }, [lat, lng, map])
  return null
}

function MapClickHandler({ onMapClick, clickMode }) {
  useMapEvents({ click(e) { if (clickMode) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }) } })
  return null
}

function GeocodeSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    api.get(`/geocode?q=${encodeURIComponent(query + ', Kedah, Malaysia')}`).then(r => {
      setResults(r.data || [])
      setShow(true)
    }).catch(() => setResults([])).finally(() => setLoading(false))
  }

  return (
    <div className="relative">
      <form onSubmit={search} className="flex gap-1.5">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari lokasi..."
          className="flex-1 border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white/80" />
        <button type="submit" className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <Search className="w-4 h-4" />
        </button>
      </form>
      {show && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto border">
          {results.map((r, i) => (
            <button key={i} onClick={() => { onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) }); setShow(false); setQuery(r.display_name.split(',')[0]) }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 border-b last:border-0">
              <span className="font-medium text-emerald-700">{r.display_name.split(',')[0]}</span>
              <span className="text-gray-400 text-xs ml-1">{r.display_name.split(',').slice(1,3).join(',')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getBadgeClass(type) {
  const m = { kuliah_maghrib: 'badge-maghrib', kuliah_subuh: 'badge-subuh', ceramah_khas: 'badge-ceramah', tazkirah: 'badge-tazkirah', kuliah_muslimat: 'badge-muslimat', kuliah_jumaat: 'badge-jumaat' }
  return m[type] || 'badge-maghrib'
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { weekday:'short', day:'numeric', month:'short' })
}

function formatSchedule(k) {
  if (k.recurrence === 'weekly') {
    const day = DAY_NAMES[k.recurrence_day]
    const base = day ? `Setiap ${day}` : 'Setiap Minggu'
    if (k.next_date) return `${base} · ${formatDate(k.next_date)}`
    return base
  }
  if (k.recurrence === 'monthly') return k.next_date ? `Bulanan · ${formatDate(k.next_date)}` : 'Setiap Bulan'
  return formatDate(k.next_date || k.date)
}

export default function Home() {
  const { user } = useAuth()
  const [masjidList, setMasjidList] = useState([])
  const [kuliahList, setKuliahList] = useState([])
  const [district, setDistrict] = useState('')
  const [type, setType] = useState('')
  const [time, setTime] = useState('')
  const [search, setSearch] = useState('')
  const [userPos, setUserPos] = useState(null)
  const [sortBy, setSortBy] = useState('soonest')
  const [clickMode, setClickMode] = useState(false)
  const { lastEvent, connected } = useWebSocket()
  const [liveNotice, setLiveNotice] = useState('')

  useEffect(() => { api.get('/masjid').then(r => setMasjidList(r.data)).catch(() => {}) }, [])
  useEffect(() => { fetchKuliah() }, [district, type, time, userPos])
  useEffect(() => {
    if (!lastEvent) return
    if (lastEvent.type === 'kuliah_update') {
      const { action } = lastEvent.data
      setLiveNotice(action === 'approved' ? 'Kuliah baru diluluskan!' : action === 'deleted' ? 'Kuliah dipadam.' : 'Jadual dikemas kini.')
      fetchKuliah()
    } else if (lastEvent.type === 'new_submission') {
      setLiveNotice('Hantaran baru diterima.')
    } else if (lastEvent.type === 'geocode_update') {
      fetchKuliah()
    }
    const t = setTimeout(() => setLiveNotice(''), 4000)
    return () => clearTimeout(t)
  }, [lastEvent])

  function fetchKuliah() {
    const params = {}
    if (district) params.district = district
    if (type) params.type = type
    if (time) params.time = time
    if (userPos) { params.lat = userPos.lat; params.lng = userPos.lng }
    api.get('/kuliah', { params }).then(r => setKuliahList(r.data)).catch(() => {})
  }

  function detectLocation() {
    if (!navigator.geolocation) return alert('Geolokasi tidak disokong')
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setClickMode(false) },
      () => alert('Tidak dapat mengesan lokasi')
    )
  }

  function handleMapClick(pos) { setUserPos(pos); setClickMode(false) }

  const filteredKuliah = useMemo(() => {
    let list = [...kuliahList]
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(k => k.masjid_name?.toLowerCase().includes(s) || k.ustaz_name?.toLowerCase().includes(s) || k.title?.toLowerCase().includes(s) || k.district?.toLowerCase().includes(s))
    }
    if (sortBy === 'nearest' && list[0]?.distance !== undefined) list.sort((a, b) => a.distance - b.distance)
    else if (sortBy === 'soonest') list.sort((a, b) => {
      const aDate = a.next_date || a.date || '9999-12-31'
      const bDate = b.next_date || b.date || '9999-12-31'
      return aDate.localeCompare(bDate)
    })
    return list
  }, [kuliahList, search, sortBy])

  const mapCenter = userPos ? [userPos.lat, userPos.lng] : [5.3650, 100.5556]
  const mapZoom = userPos ? 14 : 10

  const filteredMasjid = useMemo(() => {
    if (!district) return masjidList
    return masjidList.filter(m => m.district === district)
  }, [masjidList, district])

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {liveNotice && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-xl mb-3 text-sm flex items-center gap-2 shadow-lg animate-pulse">
          <BellRing className="w-4 h-4 shrink-0" />{liveNotice}
        </div>
      )}

      <div className="card-glass p-4 mb-4 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="flex-1"><GeocodeSearch onSelect={pos => setUserPos(pos)} /></div>
          <button onClick={detectLocation} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200" title="GPS">
            <Navigation className="w-4 h-4" /><span className="hidden sm:inline">GPS</span>
          </button>
          <button onClick={() => setClickMode(p => !p)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm shadow-md transition-all ${clickMode ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'}`}>
            <Crosshair className="w-4 h-4" />
            <span className="hidden sm:inline">{clickMode ? 'Klik Peta...' : 'Pilih Lokasi'}</span>
          </button>
        </div>
        {clickMode && <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 font-medium">Klik pada peta untuk menandakan lokasi anda.</p>}
        <input type="text" placeholder="Cari ustaz, masjid, tajuk..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white/80" />
        <div className="flex flex-wrap gap-2">
          <select value={district} onChange={e => setDistrict(e.target.value)} className="border border-emerald-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[130px] bg-white/80">
            <option value="">Semua Daerah</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className="border border-emerald-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[130px] bg-white/80">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={time} onChange={e => setTime(e.target.value)} className="border border-emerald-200 rounded-xl px-3 py-2 text-sm flex-1 min-w-[130px] bg-white/80">
            {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-lg border border-emerald-100 mb-4" style={{ height: '380px' }}>
        <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} style={{ height:'100%', width:'100%' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={handleMapClick} clickMode={clickMode} />
          {userPos && (<Marker position={[userPos.lat, userPos.lng]} icon={userIcon}><Popup><div className="text-sm"><strong>Lokasi Anda</strong></div></Popup></Marker>)}
          {userPos && <RecenterMap lat={userPos.lat} lng={userPos.lng} />}
          {filteredMasjid.map(m => (
            <Marker key={m.id} position={[m.latitude, m.longitude]} icon={masjidIcon}>
              <Popup><div className="text-sm min-w-[180px]"><strong className="text-emerald-700">{m.name}</strong><br/><span className="text-gray-500">{m.district}</span><br/><span className="text-xs text-gray-400">{m.address}</span></div></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {userPos && <p className="text-xs text-gray-500 mb-3">&#x1F4CD; {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)} — <button onClick={() => setUserPos(null)} className="text-red-500 underline">Buang</button></p>}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-emerald-800 text-lg">Kuliah ({filteredKuliah.length})</h2>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border border-emerald-200 rounded-xl px-2 py-1.5 text-sm bg-white/80">
          <option value="soonest">Paling Awal</option><option value="nearest">Paling Dekat</option>
        </select>
      </div>

      {filteredKuliah.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Clock className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="font-medium">Tiada kuliah dijumpai</p><p className="text-sm">Cuba tapis daerah atau jenis lain</p></div>
      ) : (
        <div className="space-y-3">
          {filteredKuliah.map(k => (
            <Link to={`/kuliah/${k.id}`} key={k.id} className="block card-glass p-4 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-emerald-900 truncate group-hover:text-emerald-700 transition-colors">{k.title}</h3>
                    {k.is_today && <span className="shrink-0 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">HARI INI</span>}
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{k.masjid_name}</span>
                    {k.distance != null && <span className="text-emerald-600 font-semibold ml-1 shrink-0">({k.distance} km)</span>}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><User className="w-3.5 h-3.5 shrink-0" />{k.ustaz_name}</p>
                </div>
                <div className="text-right text-xs shrink-0">
                  <p className="font-semibold text-gray-700">{formatSchedule(k)}</p>
                  <p className="text-gray-400 mt-0.5">{formatTime(k.time_start)}{k.time_end ? ` - ${formatTime(k.time_end)}` : ''}</p>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${getBadgeClass(k.kuliah_type)}`}>{(k.kuliah_type || '').replace(/_/g, ' ')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}