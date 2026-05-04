import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Clock, User, Calendar, Navigation, Share2, ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react'
import api from '../api'
import { useAuth } from '../App'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const TYPE_LABELS = {kuliah_maghrib:'Kuliah Maghrib',kuliah_subuh:'Kuliah Subuh',ceramah_khas:'Ceramah Khas',tazkirah:'Tazkirah',kuliah_muslimat:'Kuliah Muslimat',kuliah_jumaat:'Kuliah Jumaat'}
const DAY_NAMES = {monday:'Isnin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Khamis',friday:'Jumaat',saturday:'Sabtu',sunday:'Ahad'}

function getBadgeClass(type) {
  const m = { kuliah_maghrib: 'badge-maghrib', kuliah_subuh: 'badge-subuh', ceramah_khas: 'badge-ceramah', tazkirah: 'badge-tazkirah', kuliah_muslimat: 'badge-muslimat', kuliah_jumaat: 'badge-jumaat' }
  return m[type] || 'badge-maghrib'
}

export default function KuliahDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [kuliah, setKuliah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => {
    api.get(`/kuliah/${id}`).then(r => setKuliah(r.data)).catch(() => setKuliah(null)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
  if (!kuliah) return <div className="text-center py-20 text-gray-400">Kuliah tidak dijumpai</div>

  const typeLabel = TYPE_LABELS[kuliah.kuliah_type] || kuliah.kuliah_type
  const recurrenceLabel = kuliah.recurrence === 'weekly' ? `Setiap ${DAY_NAMES[kuliah.recurrence_day] || kuliah.recurrence_day}` : kuliah.recurrence === 'monthly' ? 'Setiap bulan' : 'Satu kali sahaja'

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

  function handleReport() {
    if (!reportReason.trim()) return alert('Sila nyatakan sebab laporan')
    api.post('/reports', { kuliah_id: parseInt(id), reason: reportReason, reporter_email: user?.email })
      .then(() => { setReportSent(true); setReportOpen(false) })
      .catch(() => alert('Ralat menghantar laporan'))
  }

  const wazeUrl = `https://waze.com/ul?ll=${kuliah.latitude},${kuliah.longitude}&navigate=yes`
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${kuliah.latitude},${kuliah.longitude}`

  async function handleShare() {
    const text = `${kuliah.title} oleh ${kuliah.ustaz_name} di ${kuliah.masjid_name}`
    if (navigator.share) {
      try { await navigator.share({ title: kuliah.title, text, url: window.location.href }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(`${text}\n${window.location.href}`); alert('Pautan disalin!') } catch {}
    }
  }

  const scheduleText = kuliah.next_date
    ? (kuliah.recurrence !== 'one_time' ? recurrenceLabel + ' · ' + formatDate(kuliah.next_date) : formatDate(kuliah.next_date))
    : (kuliah.recurrence !== 'one_time' ? recurrenceLabel : formatDate(kuliah.date))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/" className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 text-sm mb-4 font-medium"><ArrowLeft className="w-4 h-4" />Kembali</Link>

      <div className="card-glass p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-bold text-emerald-900">{kuliah.title}</h1>
            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${getBadgeClass(kuliah.kuliah_type)}`}>{typeLabel}</span>
            {kuliah.is_today && <span className="inline-block mt-1 ml-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">HARI INI</span>}
          </div>
          <button onClick={() => { if(!user) return alert('Sila log masuk'); setReportOpen(true) }} className="text-gray-300 hover:text-red-500 transition-colors" title="Lapor">
            <AlertTriangle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700"><MapPin className="w-4 h-4 text-emerald-500 shrink-0" /><div><span className="font-semibold">{kuliah.masjid_name}</span><span className="text-gray-400 ml-2">{kuliah.district}</span>{kuliah.distance != null && <span className="text-emerald-600 font-semibold ml-2">({kuliah.distance} km)</span>}</div></div>
          <div className="flex items-center gap-2 text-gray-700"><User className="w-4 h-4 text-emerald-500 shrink-0" /><span className="font-medium">{kuliah.ustaz_name}</span></div>
          <div className="flex items-center gap-2 text-gray-700"><Calendar className="w-4 h-4 text-emerald-500 shrink-0" /><span>{scheduleText}</span></div>
          <div className="flex items-center gap-2 text-gray-700"><Clock className="w-4 h-4 text-emerald-500 shrink-0" /><span>{formatTime(kuliah.time_start)}{kuliah.time_end ? ` - ${formatTime(kuliah.time_end)}` : ''}</span></div>
          {kuliah.description && <p className="text-gray-600 bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">{kuliah.description}</p>}
          {kuliah.address && <p className="text-gray-400 text-xs">{kuliah.address}</p>}
        </div>

        <div className="rounded-xl overflow-hidden border mt-4" style={{ height: '220px' }}>
          <MapContainer center={[kuliah.latitude, kuliah.longitude]} zoom={15} scrollWheelZoom={false} style={{ height:'100%', width:'100%' }}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[kuliah.latitude, kuliah.longitude]}><Popup>{kuliah.masjid_name}</Popup></Marker>
          </MapContainer>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm"><Navigation className="w-4 h-4" />Waze</a>
          <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 shadow-sm"><ExternalLink className="w-4 h-4" />Maps</a>
          <button onClick={handleShare} className="flex items-center gap-1.5 bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 shadow-sm"><Share2 className="w-4 h-4" />Kongsi</button>
        </div>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Lapor Maklumat Salah</h3>
            <p className="text-sm text-gray-600 mb-3">Laporan ini akan disemak oleh admin.</p>
            <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" placeholder="Nyatakan sebab laporan..." />
            <div className="flex gap-2 mt-3">
              <button onClick={handleReport} className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-600 font-medium">Hantar</button>
              <button onClick={() => setReportOpen(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium">Batal</button>
            </div>
          </div>
        </div>
      )}
      {reportSent && <p className="text-center text-emerald-600 text-sm mt-2 font-medium">Laporan dihantar. Terima kasih.</p>}
    </div>
  )
}