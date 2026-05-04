import { Outlet, Link, useLocation } from 'react-router-dom'
import { MapPin, Send, Upload, Shield, LogIn, LogOut, Home } from 'lucide-react'
import { useAuth } from '../App'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Utama' },
  { to: '/submit', icon: Send, label: 'Hantar' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/admin', icon: Shield, label: 'Admin' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md">
              <MapPin className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-lg tracking-tight">KuliahMap</span>
              <span className="text-emerald-300 text-xs font-medium block -mt-0.5">Kedah</span>
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5">
            {NAV_ITEMS.map(n => (
              <Link key={n.to} to={n.to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${location.pathname === n.to ? 'bg-white/20 text-white font-semibold' : 'text-emerald-200 hover:bg-white/10 hover:text-white'}`}>
                <n.icon className="w-4 h-4" />{n.label}
              </Link>
            ))}
            {user ? (
              <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-emerald-200 hover:bg-white/10 hover:text-white transition-all">
                <LogOut className="w-4 h-4" /><span className="hidden md:inline">{user.name || 'Keluar'}</span>
              </button>
            ) : (
              <Link to="/auth" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all">
                <LogIn className="w-4 h-4" />Log Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 sm:pb-4">
        <Outlet />
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-emerald-100 z-50 safe-bottom">
        <div className="flex justify-around items-center py-1.5 px-2">
          {NAV_ITEMS.map(n => (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${location.pathname === n.to ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
              <n.icon className="w-5 h-5" />
              <span className="text-[10px]">{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <footer className="hidden sm:block bg-emerald-900 text-emerald-200 text-center py-5 text-xs">
        <div className="max-w-5xl mx-auto px-4">
          <p className="font-semibold text-sm mb-1">KuliahMap Kedah — Cari Kuliah & Ceramah Berdekatan Anda</p>
          <p className="text-emerald-400 mb-2">Data kuliah dipacu oleh komuniti &bull; Peta oleh OpenStreetMap</p>
          <div className="flex justify-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Dasar Privasi</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terma & Syarat</Link>
          </div>
          <p className="mt-2 text-emerald-500">&copy; 2026 KuliahMap Kedah</p>
        </div>
      </footer>
    </div>
  )
}