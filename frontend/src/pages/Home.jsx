import { useState, useEffect, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { MapPin, Clock, User, Navigation, Crosshair, Search, Heart, AlertTriangle } from 'lucide-react'
import api from '../api'
import { useAuth } from '../App'

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
  { value: '', label: 'Semua Jenis' },{ value: 'kuliah_maghrib', label: 'Kuliah Maghrib' },
  { value: 'kuliah_subuh', label: 'Kuliah Subuh' },{ value: 'ceramah_khas', label: 'Ceramah Khas' },
  { value: 'tazkirah', label: 'Tazkirah' },{ value: 'kuliah_muslimat', label: 'Kuliah Muslimat' },
  { value: 'kuliah_jumaat', label: 'Kuliah Jumaat' },
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
      <form onSubmit={search} className="flex gap-1">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari lokasi (cth: Alor Setar)..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <button type="submit" className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors flex items-center gap-1">
          <Search className="w-4 h-4" />
        </button>
      </form>
      {show && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} onClick={() => { onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) }); setShow(false); setQuery(r.display_name.split(',')[0]) }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 border-b last:border-0">
              <span className="font-medium text-emerald-700">{r.display_name.split(',')[0]}</span>
              <span className="text-gray-400 text-xs ml-1">{r.display_name.split(',').slice(1,3).join(',')}</span>
            </button>
          ))}
        </div>
      )}
      {show && results.length === 0 && !loading && (
        <div className="absolute z-50 top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 p-3 text-sm text-gray-500">Tiada hasil dijumpai.</div>
      )}
    </div>
  )
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
  const [favorites, setFavorites] = useState([])

  useEffect(() => { api.get('/masjid').then(r => setMasjidList(r.data)).catch(() => {}) }, [])
  useEffect(() => { fetchKuliah() }, [district, type, time, userPos])
  useEffect(() => {
    if (user) {
      api.get('/favorites', { headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` } })
        .then(r => setFavorites(r.data.map(f => f.id))).catch(() => {})
    }
  }, [user])

  function fetchKuliah() {
    const params = {}
    if (district) params.district = district
    if (type) params.type = type
    if (time) params.time = time
    if (userPos) { params.lat = userPos.lat; params.lng = userPos.lng }
    api.get('/kuliah', { params }).then(r => setKuliahList(r.data)).catch(() => {})
  }

  function detectLocation() {
    if (!navigator.geolocation) return alert('Geolokasi tidak disokong oleh pelayar anda')
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setClickMode(false) },
      () => alert('Tidak dapat mengesan lokasi anda')
    )
  }

  function toggleFavorite(masjidId) {
    if (!user) return alert('Sila log masuk terlebih dahulu')
    const token = localStorage.getItem('userToken')
    const isFav = favorites.includes(masjidId)
    if (isFav) {
      api.delete(`/favorites/${masjidId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(() => setFavorites(prev => prev.filter(id => id !== masjidId)))
    } else {
      api.post('/favorites', { masjid_id: masjidId }, { headers: { Authorization: `Bearer ${token}` } })
        .then(() => setFavorites(prev => [...prev, masjidId]))
    }
  }

  function handleMapClick(pos) { setUserPos(pos); setClickMode(false) }

  function formatTime(t) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr === 0 ? 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  function formatDate(d) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  }

  function formatSchedule(k) {
    if (k.recurrence === 'weekly') {
      const day = DAY_NAMES[k.recurrence_day]
      const base = day ? `Setiap ${day}` : 'Setiap Minggu'
      if (k.next_date) return `${base} (seterusnya: ${formatDate(k.next_date)})`
      return base
    }
    if (k.recurrence === 'monthly') {
      if (k.next_date) return `Setiap Bulan (seterusnya: ${formatDate(k.next_date)})`
      return 'Setiap Bulan'
    }
    return formatDate(k.next_date || k.date)
  }

  const filteredKuliah = useMemo(() => {
    let list = [...kuliahList]
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(k => k.masjid_name?.toLowerCase().includes(s) || k.ustaz_name?.toLowerCase().includes(s) || k.title?.toLowerCase().includes(s) || k.district?.toLowerCase().includes(s))
    }
    if (sortBy === 'nearest' && list[0]?.distance !== undefined) list.sort((a, b) => a.distance - b.distance)
    else if (sortBy === 'soonest') list.sort((a, b) => {
      const aDate = a.next_date || a.date || '9999-12-31';
      const bDate = b.next_date || b.date || '9999-12-31';
      return aDate.localeCompare(bDate);
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
      <p className="text-center text-emerald-700 font-medium mb-3 text-sm">Cari Kuliah & Ceramah Berdekatan Anda</p>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="flex-1"><GeocodeSearch onSelect={pos => setUserPos(pos)} /></div>
          <button onClick={detectLocation} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors" title="GPS Auto-Detect">
            <Navigation className="w-4 h-4" /><span className="hidden sm:inline">GPS</span>
          </button>
          <button onClick={() => setClickMode(prev => !prev)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${clickMode ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            title="Klik pada peta untuk tandakan lokasi">
            <Crosshair className="w-4 h-4" />
            <span className="hidden sm:inline">{clickMode ? 'Klik Peta...' : 'Pilih Lokasi'}</span>
          </button>
        </div>
        {clickMode && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">&#x1F4CD; Klik pada peta untuk menandakan lokasi anda.</p>}
        <div className="flex gap-2">
          <input type="text" placeholder="Cari ustaz, masjid, tajuk..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={district} onChange={e => setDistrict(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[130px]">
            <option value="">Semua Daerah</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[130px]">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={time} onChange={e => setTime(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[130px]">
            {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden shadow-sm border mb-4" style={{ height: '400px' }}>
        <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={handleMapClick} clickMode={clickMode} />
          {userPos && (<Marker position={[userPos.lat, userPos.lng]} icon={userIcon}><Popup><div className="text-sm"><strong>Lokasi Anda</strong><br/><span className="text-gray-500 text-xs">{userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</span></div></Popup></Marker>)}
          {userPos && <RecenterMap lat={userPos.lat} lng={userPos.lng} />}
          {filteredMasjid.map(m => (
            <Marker key={m.id} position={[m.latitude, m.longitude]} icon={masjidIcon}>
              <Popup><div className="text-sm min-w-[180px]"><strong className="text-emerald-700">{m.name}</strong><br/><span className="text-gray-500">{m.district}</span><br/><span className="text-gray-400 text-xs">{m.address}</span><br/><span className="text-xs text-emerald-600 font-medium">{m.type === 'surau' ? 'Surau' : 'Masjid'}</span></div></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {userPos && <p className="text-xs text-gray-500 mb-3">&#x1F4CD; Lokasi: {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)} — <button onClick={() => setUserPos(null)} className="text-red-500 underline">Buang lokasi</button></p>}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-emerald-800">Kuliah Berdekatan ({filteredKuliah.length})</h2>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
          <option value="soonest">Paling Awal</option><option value="nearest">Paling Dekat</option>
        </select>
      </div>

      {filteredKuliah.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Clock className="w-12 h-12 mx-auto mb-3" /><p>Tiada kuliah dijumpai untuk carian ini.</p></div>
      ) : (
        <div className="space-y-3">
          {filteredKuliah.map(k => (
            <Link to={`/kuliah/${k.id}`} key={k.id} className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-emerald-800 truncate">{k.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{k.masjid_name}</span>
                    {k.distance != null && <span className="text-emerald-600 font-medium ml-1 shrink-0">({k.distance} km)</span>}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><User className="w-3.5 h-3.5 shrink-0" />{k.ustaz_name}</p>
                </div>
                <div className="text-right text-xs text-gray-400 shrink-0">
                  {k.is_today && <span className="inline-block mb-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">Hari Ini!</span>}
                  <p className="font-medium text-gray-600">{formatSchedule(k)}</p>
                  <p>{formatTime(k.time_start)}{k.time_end ? ` - ${formatTime(k.time_end)}` : ''}</p>
                  <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">{k.kuliah_type.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}