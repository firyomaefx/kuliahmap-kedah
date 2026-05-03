import { Outlet, Link, useLocation } from 'react-router-dom'
import { MapPin, Send, Shield, LogIn, LogOut, Heart } from 'lucide-react'
import { useAuth } from '../App'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-700" />
            </div>
            <span>KuliahMap <span className="text-emerald-200 text-sm font-normal">Kedah</span></span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/submit" className="flex items-center gap-1 hover:text-emerald-200 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-600/30">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Hantar</span>
            </Link>
            {user && (
              <Link to="/favorites" className="flex items-center gap-1 hover:text-emerald-200 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-600/30">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Kegemaran</span>
              </Link>
            )}
            <Link to="/admin" className="flex items-center gap-1 hover:text-emerald-200 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-600/30">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
            {user ? (
              <button onClick={logout} className="flex items-center gap-1 hover:text-emerald-200 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-600/30">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{user.name || user.email || 'Keluar'}</span>
              </button>
            ) : (
              <Link to="/auth" className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-lg transition-colors font-medium">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Log Masuk</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-emerald-900 text-emerald-200 text-center py-5 text-xs">
        <div className="max-w-5xl mx-auto px-4">
          <p className="font-medium text-sm mb-1">KuliahMap Kedah — Cari Kuliah & Ceramah Berdekatan Anda</p>
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