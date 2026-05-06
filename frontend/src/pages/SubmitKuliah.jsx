import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle, Loader2, Phone, X, ArrowLeft } from 'lucide-react'
import api from '../api'

function isValidMYPhone(v) {
  if (!v) return false
  const clean = v.replace(/\s/g, '')
  return /^(01[0-9]{1}-[0-9]{7,8}|01[0-9]{8,9})$/.test(clean)
}

export default function SubmitKuliah() {
  const [step, setStep] = useState('form') // form | done
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function handleSubmit() {
    setError('')
    setSuccessMsg('')
    if (!text.trim()) { setError('Sila tampal teks jadual kuliah.'); return }
    if (!isValidMYPhone(phone)) { setError('Sila masukkan nombor telefon Malaysia yang sah (cth: 012-3456789).'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/events/auto-insert', {
        text: text.trim(),
        phone: phone.trim(),
        name: name.trim() || null
      })
      setSuccessMsg(data.message || `${data.inserted_count} jadual berjaya dimasukkan.`)
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Ralat. Sila cuba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">Berjaya!</h2>
        <p className="text-slate-500 mb-6">{successMsg}</p>
        <div className="flex justify-center gap-3">
          <button onClick={() => { setStep('form'); setText(''); setError(''); setSuccessMsg('') }}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 shadow-md">Hantar Lagi</button>
          <Link to="/" className="text-emerald-700 underline py-2.5">Kembali</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-bold text-slate-900">Hantar Jadual Kuliah</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-emerald-600 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">Tampal & Hantar</h2>
            <p className="text-emerald-100 text-xs">AI akan proses jadual anda secara automatik</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-200">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nama <span className="text-slate-300">(opsional)</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Abdullah"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Telefon <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="012-3456789"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Teks Jadual Kuliah <span className="text-red-500">*</span></label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              rows={10}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y bg-slate-50"
              placeholder={`Tampal teks WhatsApp / poster di sini...\n\nContoh:\nMasjid Zahir, Alor Setar\n5 Mei 2026 - Ustaz Ahmad - Kuliah Maghrib\nKhamis - Ustazah Siti - Kuliah Muslimat`}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{text.length} aksara</p>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Send className="w-4 h-4" />
            {loading ? 'Memproses...' : 'Hantar Jadual'}
          </button>
        </div>
      </div>
    </div>
  )
}
