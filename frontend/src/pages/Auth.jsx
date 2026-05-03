import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, UserPlus, Mail, Phone, Lock, User } from 'lucide-react'
import api from '../api'
import { useAuth } from '../App'

export default function Auth() {
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email: email || undefined, phone: phone || undefined, password })
        login(res.data.token, res.data.user)
      } else {
        if (password.length < 6) { setError('Kata laluan minimum 6 aksara'); return }
        const res = await api.post('/auth/register', { email: email || undefined, phone: phone || undefined, password, name: name || undefined })
        login(res.data.token, res.data.user)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ralat. Sila cuba lagi.')
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          {isLogin ? <LogIn className="w-8 h-8 text-emerald-600" /> : <UserPlus className="w-8 h-8 text-emerald-600" />}
        </div>
        <h1 className="text-xl font-bold text-emerald-800">{isLogin ? 'Log Masuk' : 'Daftar Akaun'}</h1>
        <p className="text-sm text-gray-500">{isLogin ? 'Masuk untuk menyimpan masjid kegemaran' : 'Cipta akaun untuk mula'}</p>
      </div>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isLogin && (
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama</label><div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nama anda" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" /></div></div>
        )}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emel</label><div className="relative"><Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="emel@contoh.com" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" /></div></div>
        {!isLogin && (
          <div><label className="block text-sm font-medium text-gray-700 mb-1">No. Telefon</label><div className="relative"><Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="012-3456789" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" /></div></div>
        )}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Kata Laluan</label><div className="relative"><Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isLogin ? 'Kata laluan anda' : 'Minimum 6 aksara'} required className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" /></div></div>
        <button type="submit" className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
          {isLogin ? 'Log Masuk' : 'Daftar'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        {isLogin ? 'Tiada akaun? ' : 'Sudah ada akaun? '}
        <button onClick={() => { setIsLogin(!isLogin); setError('') }} className="text-emerald-600 font-medium hover:underline">
          {isLogin ? 'Daftar di sini' : 'Log masuk'}
        </button>
      </p>
    </div>
  )
}