import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, CheckCircle } from 'lucide-react'
import api from '../api'

const DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']
const TYPES = [{value:'kuliah_maghrib',label:'Kuliah Maghrib'},{value:'kuliah_subuh',label:'Kuliah Subuh'},{value:'ceramah_khas',label:'Ceramah Khas'},{value:'tazkirah',label:'Tazkirah'},{value:'kuliah_muslimat',label:'Kuliah Muslimat'},{value:'kuliah_jumaat',label:'Kuliah Jumaat'}]
const RECURRENCE = [{value:'one_time',label:'Satu Kali'},{value:'weekly',label:'Mingguan'},{value:'monthly',label:'Bulanan'}]
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS = {monday:'Isnin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Khamis',friday:'Jumaat',saturday:'Sabtu',sunday:'Ahad'}

const initialForm = {masjid_name:'',address:'',district:'',latitude:'',longitude:'',title:'',ustaz_name:'',description:'',kuliah_type:'',date:'',time_start:'',time_end:'',recurrence:'one_time',recurrence_day:'',contact_phone:''}

export default function SubmitKuliah() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) { const {name, value} = e.target; setForm(prev => ({...prev, [name]: value})) }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    try {
      const payload = {...form, latitude: form.latitude ? parseFloat(form.latitude) : null, longitude: form.longitude ? parseFloat(form.longitude) : null}
      await api.post('/kuliah/submit', payload)
      setSubmitted(true)
    } catch (err) { setError(err.response?.data?.error || 'Ralat semasa menghantar.') }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-emerald-800 mb-2">Berjaya Dihantar!</h2>
        <p className="text-gray-600 mb-6">Jadual kuliah anda telah dihantar untuk disemak oleh admin. Ia akan dipaparkan selepas diluluskan.</p>
        <button onClick={() => { setSubmitted(false); setForm(initialForm) }} className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Hantar Lagi</button>
        <Link to="/" className="ml-3 text-emerald-700 underline text-sm">Kembali ke Laman Utama</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-emerald-800 flex items-center gap-2 mb-6"><Send className="w-5 h-5" />Hantar Jadual Kuliah Baru</h1>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Masjid/Surau *</label><input type="text" name="masjid_name" required value={form.masjid_name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="cth: Masjid Zahir" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label><input type="text" name="address" value={form.address} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="cth: Jalan Kampung Perak, 05000 Alor Setar" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Daerah *</label><select name="district" required value={form.district} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"><option value="">Pilih daerah</option>{DISTRICTS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label><input type="number" step="any" name="latitude" value={form.latitude} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="6.1214" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label><input type="number" step="any" name="longitude" value={form.longitude} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="100.3685" /></div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Ustaz/Ustazah *</label><input type="text" name="ustaz_name" required value={form.ustaz_name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="cth: Ustaz Ahmad Dusuki" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tajuk Kuliah *</label><input type="text" name="title" required value={form.title} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="cth: Tafsir Al-Quran" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Penerangan</label><textarea name="description" value={form.description} onChange={handleChange} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="Penerangan ringkas" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kuliah *</label><select name="kuliah_type" required value={form.kuliah_type} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"><option value="">Pilih jenis</option>{TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Tarikh (jika satu kali)</label><input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" /></div>
        <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Masa Mula *</label><input type="time" name="time_start" required value={form.time_start} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Masa Tamat</label><input type="time" name="time_end" value={form.time_end} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" /></div></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Ulangan *</label><select name="recurrence" required value={form.recurrence} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">{RECURRENCE.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
        {form.recurrence === 'weekly' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Hari *</label><select name="recurrence_day" required value={form.recurrence_day} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"><option value="">Pilih hari</option>{DAYS.map(d=><option key={d} value={d}>{DAY_LABELS[d]}</option>)}</select></div>}
        <div><label className="block text-sm font-medium text-gray-700 mb-1">No. Telefon</label><input type="tel" name="contact_phone" value={form.contact_phone} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="012-3456789" /></div>
        <div className="pt-2"><button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"><Send className="w-4 h-4" />Hantar</button><p className="text-xs text-gray-400 text-center mt-2">* Jadual akan disemak sebelum dipaparkan</p></div>
      </form>
    </div>
  )
}