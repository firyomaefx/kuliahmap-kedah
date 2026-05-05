import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom'
import { BookOpen, Send, Upload, Shield } from 'lucide-react'
import Home from './pages/Home'
import KuliahDetail from './pages/KuliahDetail'
import SubmitKuliah from './pages/SubmitKuliah'
import ImportKuliah from './pages/ImportKuliah'
import Admin from './pages/Admin'
import Auth from './pages/Auth'
import api from './api'
import './index.css'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      } catch {}
    }
    setLoading(false)
  }, [])

  function login(token, userData) {
    localStorage.setItem('userToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('userToken')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kuliah/:id" element={<KuliahDetail />} />
        <Route element={<Shell />}>
          <Route path="/submit" element={<SubmitKuliah />} />
          <Route path="/import" element={<ImportKuliah />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}

function Shell() {
  const { user, logout } = useAuth()
  const navs = [{to:'/',label:'Utama',icon:BookOpen},{to:'/submit',label:'Hantar',icon:Send},{to:'/import',label:'Import',icon:Upload},{to:'/admin',label:'Admin',icon:Shield}]
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md">
              <BookOpen size={20} className="text-emerald-700" strokeWidth={2.5}/>
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-lg tracking-tight">KuliahMap</span>
              <span className="text-emerald-300 text-xs font-medium block -mt-0.5">Kedah</span>
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5">
            {navs.map(n=>(
              <Link key={n.to} to={n.to} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-emerald-200 hover:bg-white/10 hover:text-white transition-all">{n.label}</Link>
            ))}
            <Link to="/auth" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all">Log Masuk</Link>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-20 sm:pb-4"><Outlet /></main>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-emerald-100 z-40">
        <div className="flex justify-around items-center py-1.5 px-2">
          {navs.map(n=>(
            <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors">
              <n.icon className="w-5 h-5" /><span className="text-[10px] font-medium">{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}

function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-emerald-800 mb-4">Dasar Privasi</h1>
      <div className="prose prose-sm text-gray-700 space-y-4">
        <p><strong>Terakhir dikemas kini:</strong> April 2026</p>
        <h3 className="text-lg font-semibold">Maklumat Yang Kami Kumpulkan</h3>
        <p>Kami mengumpulkan maklumat yang anda berikan secara sukarela, termasuk:</p>
        <ul className="list-disc ml-5 space-y-1"><li>Emel dan nombor telefon</li><li>Lokasi GPS</li><li>Maklumat penghantaran jadual kuliah</li></ul>
        <h3 className="text-lg font-semibold">Penggunaan Maklumat</h3>
        <p>Maklumat anda digunakan untuk menyediakan perkhidmatan KuliahMap.</p>
        <h3 className="text-lg font-semibold">Hubungi Kami</h3>
        <p>Sekiranya ada pertanyaan, sila hubungi kami melalui laman web ini.</p>
      </div>
    </div>
  )
}

function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-emerald-800 mb-4">Terma & Syarat</h1>
      <div className="prose prose-sm text-gray-700 space-y-4">
        <p><strong>Terakhir dikemas kini:</strong> April 2026</p>
        <h3 className="text-lg font-semibold">Penggunaan Perkhidmatan</h3>
        <p>KuliahMap Kedah menyediakan maklumat jadual kuliah di masjid/surau di negeri Kedah.</p>
        <h3 className="text-lg font-semibold">Peta</h3>
        <p>Data peta disediakan oleh OpenStreetMap.</p>
      </div>
    </div>
  )
}