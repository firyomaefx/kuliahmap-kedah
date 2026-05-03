import { MapPin, Clock, User, Calendar, Navigation } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const KULIAH_TYPE_LABELS = {
  kuliah_maghrib: 'Kuliah Maghrib',
  kuliah_subuh: 'Kuliah Subuh',
  ceramah_khas: 'Ceramah Khas',
  tazkirah: 'Tazkirah',
  kuliah_muslimat: 'Kuliah Muslimat',
  kuliah_jumaat: 'Kuliah Jumaat',
}

const DAY_NAMES = {
  monday: 'Isnin', tuesday: 'Selasa', wednesday: 'Rabu',
  thursday: 'Khamis', friday: 'Jumaat', saturday: 'Sabtu', sunday: 'Ahad',
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${h12}:${m} ${ampm}`
}

export default function KuliahCard({ kuliah, onClick }) {
  const navigate = useNavigate()

  const recurrenceLabel = kuliah.recurrence === 'weekly'
    ? `Setiap ${DAY_NAMES[kuliah.recurrence_day] || kuliah.recurrence_day}`
    : kuliah.recurrence === 'monthly'
    ? 'Setiap bulan'
    : formatDate(kuliah.date)

  return (
    <div
      onClick={() => onClick ? onClick(kuliah.id) : navigate(`/kuliah/${kuliah.id}`)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-emerald-800 truncate">{kuliah.title}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{kuliah.masjid_name}</span>
          </p>
        </div>
        {kuliah.distance != null && (
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
            {kuliah.distance < 1 ? `${(kuliah.distance * 1000).toFixed(0)} m` : `${kuliah.distance.toFixed(1)} km`}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-700 flex items-center gap-1 mt-2">
        <User className="w-3.5 h-3.5 shrink-0" />
        {kuliah.ustaz_name}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {recurrenceLabel}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(kuliah.time_start)}{kuliah.time_end ? ` - ${formatTime(kuliah.time_end)}` : ''}
        </span>
        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
          {KULIAH_TYPE_LABELS[kuliah.kuliah_type] || kuliah.kuliah_type}
        </span>
      </div>
    </div>
  )
}