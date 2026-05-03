import { useState } from 'react'
import { Shield, LogIn, CheckCircle, XCircle, Clock, LogOut, BarChart3 } from 'lucide-react'
import api from '../api'

const TYPE_LABELS = {kuliah_maghrib:'Kuliah Maghrib',kuliah_subuh:'Kuliah Subuh',ceramah_khas:'Ceramah Khas',tazkirah:'Tazkirah',kuliah_muslimat:'Kuliah Muslimat',kuliah_jumaat:'Kuliah Jumaat'}

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '')
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('adminToken'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [submissions, setSubmissions] = useState([])
  const [stats, setStats] = useState(null)
  const [actionMsg, setActionMsg] = useState('')

  function handleLogin(e) {
    e.preventDefault(); setLoginError('')
    api.post('/admin/login', { username, password })
      .then(r => { setToken(r.data.token); setIsAdmin(true); localStorage.setItem('adminToken', r.data.token); fetchSubmissions(r.data.token); fetchStats(r.data.token) })
      .catch(() => setLoginError('Nama pengguna atau kata laluan tidak betul'))
  }

  function fetchSubmissions(t) {
    const tk = t || token
    api.get('/admin/submissions', { headers: { Authorization: `Bearer ${tk}` } }).then(r => setSubmissions(r.data)).catch(() => {})
  }

  function fetchStats(t) {
    const tk = t || token
    api.get('/admin/stats', { headers: { Authorization: `Bearer ${tk}` } }).then(r => setStats(r.data)).catch(() => {})
  }

  function handleAction(id, status) {
    const t = localStorage.getItem('adminToken') || token
    api.put(`/admin/submissions/${id}`, { status }, { headers: { Authorization: `Bearer ${t}` } })
      .then(() => { setActionMsg(status === 'approved' ? 'Jadual diluluskan!' : 'Jadual ditolak.'); setSubmissions(prev => prev.filter(s => s.id !== id)); fetchStats(t); setTimeout(() => setActionMsg(''), 3000) })
      .catch(() => setActionMsg('Ralat.'))
  }

  function handleLogout() { setToken(''); setIsAdmin(false); localStorage.removeItem('adminToken'); setSubmissions([]); setStats(null) }

  if (!isAdmin) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12">
        <div className="text-center mb-6"><Shield className="w-12 h-12 text-emerald-600 mx-auto mb-2" /><h1 className="text-xl font-bold text-emerald-800">Log Masuk Admin</h1><p className="text-sm text-gray-500">Untuk menyemak jadual kuliah yang dihantar</p></div>
        {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{loginError}</div>}
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="text" placeholder="Nama pengguna" value={username} onChange={e => setUsername(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <input type="password" placeholder="Kata laluan" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"><LogIn className="w-4 h-4" />Log Masuk</button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2"><Shield className="w-5 h-5" />Panel Admin</h1>
        <button onClick={handleLogout} className="text-sm text-red-500 hover:underline flex items-center gap-1"><LogOut className="w-4 h-4" />Keluar</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-emerald-700">{stats.masjid}</p><p className="text-xs text-gray-600">Masjid</p></div>
          <div className="bg-blue-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-blue-700">{stats.kuliah_approved}</p><p className="text-xs text-gray-600">Kuliah Aktif</p></div>
          <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-700">{stats.kuliah_pending}</p><p className="text-xs text-gray-600">Menunggu</p></div>
          <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-purple-700">{stats.users}</p><p className="text-xs text-gray-600">Pengguna</p></div>
        </div>
      )}

      {actionMsg && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-4 text-sm text-center">{actionMsg}</div>}

      <h2 className="font-semibold text-gray-700 mb-3">Senarai Semakan ({submissions.length})</h2>
      {submissions.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Clock className="w-12 h-12 mx-auto mb-3" /><p>Tiada jadual yang menunggu kelulusan.</p></div>
      ) : (
        <div className="space-y-4">
          {submissions.map(s => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-start justify-between gap-2 mb-2"><h3 className="font-semibold text-emerald-800">{s.title}</h3><span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Menunggu</span></div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Masjid: <strong>{s.masjid_name}</strong> ({s.district})</p>
                <p>Ustaz: <strong>{s.ustaz_name}</strong></p>
                <p>Jenis: {TYPE_LABELS[s.kuliah_type] || s.kuliah_type}</p>
                {s.date && <p>Tarikh: {s.date}</p>}
                <p>Masa: {s.time_start}{s.time_end ? ` - ${s.time_end}` : ''}</p>
                <p>Ulangan: {s.recurrence}{s.recurrence_day ? ` (${s.recurrence_day})` : ''}</p>
                {s.contact_phone && <p>Telefon: {s.contact_phone}</p>}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleAction(s.id, 'approved')} className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"><CheckCircle className="w-4 h-4" />Luluskan</button>
                <button onClick={() => handleAction(s.id, 'rejected')} className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"><XCircle className="w-4 h-4" />Tolak</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}