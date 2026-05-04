import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="kuliah/:id" element={<KuliahDetail />} />
          <Route path="submit" element={<SubmitKuliah />} />
          <Route path="import" element={<ImportKuliah />} />
          <Route path="auth" element={<Auth />} />
          <Route path="admin" element={<Admin />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
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
        <ul className="list-disc ml-5 space-y-1">
          <li>Emel dan nombor telefon (untuk pendaftaran dan pengesahan)</li>
          <li>Lokasi GPS (untuk mencari masjid berdekatan — hanya apabila anda klik butang GPS)</li>
          <li>Maklumat penghantaran jadual kuliah</li>
        </ul>
        <h3 className="text-lg font-semibold">Penggunaan Maklumat</h3>
        <p>Maklumat anda digunakan untuk menyediakan perkhidmatan KuliahMap, menghantar notifikasi kuliah berdekatan, dan memperbaiki perkhidmatan.</p>
        <h3 className="text-lg font-semibold">Perlindungan Data</h3>
        <p>Kami berpegang pada Akta Perlindungan Data Peribadi (PDPA) 2010 Malaysia. Data anda disimpan dengan selamat dan tidak dikongsi dengan pihak ketiga tanpa kebenaran anda.</p>
        <h3 className="text-lg font-semibold">Hubungi Kami</h3>
        <p>Sekiranya ada pertanyaan mengenai dasar privasi ini, sila hubungi kami melalui laman web ini.</p>
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
        <p>KuliahMap Kedah menyediakan maklumat jadual kuliah dan ceramah di masjid/surau di negeri Kedah. Maklumat disediakan "seadanya" dan kami tidak menjamin ketepatan setiap jadual.</p>
        <h3 className="text-lg font-semibold">Penghantaran Jadual</h3>
        <p>Pengguna boleh menghantar jadual kuliah melalui borang dalam aplikasi. Semua penghantaran tertakluk kepada semakan admin sebelum dipaparkan.</p>
        <h3 className="text-lg font-semibold">Peta</h3>
        <p>Data peta disediakan oleh OpenStreetMap® dan penyumbangnya. Peta tertakluk kepada terma lesen ODbL.</p>
        <h3 className="text-lg font-semibold">Tanggungan</h3>
        <p>Kami tidak bertanggungan atas sebarang kerugian yang timbul daripada maklumat yang tidak tepat di dalam aplikasi ini.</p>
      </div>
    </div>
  )
}