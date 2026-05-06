require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initSchema, seedData } = require('./db');
const Groq = require('groq-sdk');
const { computeNextDate, isOccurringToday } = require('./recurrence');
const wss = require('./websocket');
const cron = require('./cron');

const app = express();
app.use(cors());
app.use(express.json());

// Init Groq client (key may be absent in env — endpoint will handle gracefully)
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Serve static frontend (works both locally and in Docker)
const publicPath = require('fs').existsSync(require('path').join(__dirname, '..', '..', 'frontend', 'dist'))
  ? require('path').join(__dirname, '..', '..', 'frontend', 'dist')
  : require('path').join(__dirname, '..', 'public');
app.use(express.static(publicPath));

initSchema();
seedData();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeykuliahmapkedah2026';

/* ==================== MIDDLEWARE ==================== */
function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Tiada token' });
  jwt.verify(token.replace('Bearer ', ''), JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token tidak sah' });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
}

function adminMiddleware(req, res, next) {
  if (req.userRole !== 'admin') return res.status(403).json({ error: 'Akses ditolak' });
  next();
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const KEDAH_DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan'];

/* ==================== REFERENCE DATA ==================== */
app.get('/api/districts', (req, res) => res.json(KEDAH_DISTRICTS));

/* ==================== MASJID ENDPOINTS ==================== */
app.get('/api/masjid', (req, res) => {
  const { district, search } = req.query;
  let sql = 'SELECT * FROM masjid WHERE 1=1';
  const params = [];
  if (district) { sql += ' AND district = ?'; params.push(district); }
  if (search) { sql += ' AND (name LIKE ? OR address LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/masjid/:id', (req, res) => {
  db.get('SELECT * FROM masjid WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Masjid tidak dijumpai' });
    res.json(row);
  });
});

app.get('/api/masjid/nearby', (req, res) => {
  const { lat, lng, radius = 50 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Sila berikan lat dan lng' });
  db.all('SELECT * FROM masjid', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const results = rows.map(m => ({ ...m, distance: parseFloat(haversine(+lat, +lng, m.latitude, m.longitude).toFixed(2)) }))
      .filter(m => m.distance <= +radius)
      .sort((a, b) => a.distance - b.distance);
    res.json(results);
  });
});

/* ==================== KULIAH ENDPOINTS ==================== */
app.get('/api/kuliah', (req, res) => {
  const { district, type, time, lat, lng, search } = req.query;
  let sql = `SELECT kuliah.*, masjid.name as masjid_name, masjid.address, masjid.district, masjid.latitude, masjid.longitude FROM kuliah JOIN masjid ON kuliah.masjid_id = masjid.id WHERE kuliah.status = 'approved'`;
  const params = [];

  if (district) { sql += ' AND masjid.district = ?'; params.push(district); }
  if (type) { sql += ' AND kuliah.kuliah_type = ?'; params.push(type); }
  if (search) { sql += ' AND (kuliah.title LIKE ? OR kuliah.ustaz_name LIKE ? OR masjid.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  if (time) {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const curDate = fmt(today);
    if (time === 'today') {
      sql += " AND (kuliah.date = ? OR kuliah.recurrence != 'one_time')";
      params.push(curDate);
    } else if (time === 'week') {
      const nw = fmt(new Date(today.getTime() + 7*86400000));
      sql += " AND ((kuliah.date BETWEEN ? AND ?) OR kuliah.recurrence != 'one_time')";
      params.push(curDate, nw);
    } else if (time === 'month') {
      const nm = fmt(new Date(today.getTime() + 30*86400000));
      sql += " AND ((kuliah.date BETWEEN ? AND ?) OR kuliah.recurrence != 'one_time')";
      params.push(curDate, nm);
    }
  }

  sql += ' ORDER BY kuliah.date ASC, kuliah.time_start ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    let results = rows.map(k => ({
      ...k,
      is_today: isOccurringToday(k.recurrence, k.recurrence_day),
      next_date: k.recurrence !== 'one_time'
        ? computeNextDate(k.recurrence, k.recurrence_day)
        : k.date,
    }));
    if (lat && lng) {
      results = results.map(k => ({ ...k, distance: parseFloat(haversine(+lat, +lng, k.latitude, k.longitude).toFixed(2)) }))
        .sort((a, b) => a.distance - b.distance);
    }
    res.json(results);
  });
});

app.get('/api/kuliah/:id', (req, res) => {
  db.get(`SELECT kuliah.*, masjid.name as masjid_name, masjid.address, masjid.district, masjid.latitude, masjid.longitude, masjid.phone as masjid_phone FROM kuliah JOIN masjid ON kuliah.masjid_id = masjid.id WHERE kuliah.id = ? AND kuliah.status = 'approved'`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Kuliah tidak dijumpai' });
    const enriched = {
      ...row,
      is_today: isOccurringToday(row.recurrence, row.recurrence_day),
      next_date: row.recurrence !== 'one_time'
        ? computeNextDate(row.recurrence, row.recurrence_day)
        : row.date,
    };
    res.json(enriched);
  });
});

/* ==================== SUBMIT KULIAH ==================== */
app.post('/api/kuliah/submit', (req, res) => {
  const { masjid_name, address, district, latitude, longitude, title, ustaz_name, description, kuliah_type, date, time_start, time_end, recurrence, recurrence_day, contact_phone } = req.body;
  if (!masjid_name || !title || !ustaz_name || !kuliah_type || !time_start) {
    return res.status(400).json({ error: 'Sila lengkapkan semua medan wajib' });
  }

  db.get('SELECT id FROM masjid WHERE name = ?', [masjid_name], (err, existing) => {
    const handleInsert = (masjidId) => {
      db.run(
        `INSERT INTO kuliah (masjid_id, title, ustaz_name, description, kuliah_type, date, time_start, time_end, recurrence, recurrence_day, contact_phone, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'approved')`,
        [masjidId, title, ustaz_name, description||null, kuliah_type, date||null, time_start, time_end||null, recurrence||'one_time', recurrence_day||null, contact_phone||null],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          const newKuliah = { id: this.lastID, title, ustaz_name, kuliah_type, time_start, recurrence: recurrence||'one_time' };
          wss.broadcastNewSubmission(newKuliah);
          res.json({ success: true, id: this.lastID, message: 'Jadual kuliah berjaya dimasukkan.' });
        });
    };
    if (existing) {
      handleInsert(existing.id);
    } else {
      db.run('INSERT INTO masjid (name, address, district, latitude, longitude, type) VALUES (?,?,?,?,?,?)',
        [masjid_name, address||'', district||'Kulim', latitude||0, longitude||0, 'masjid'],
        function(err3) {
          if (err3) return res.status(500).json({ error: err3.message });
          handleInsert(this.lastID);
        });
    }
  });
});

/* ==================== USER AUTH ==================== */
app.post('/api/auth/register', (req, res) => {
  const { email, phone, password, name } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Kata laluan minimum 6 aksara' });
  if (!email && !phone) return res.status(400).json({ error: 'Sila masukkan emel atau nombor telefon' });

  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (email, phone, password_hash, name, role) VALUES (?,?,?,?,?)',
    [email||null, phone||null, hash, name||null, 'user'],
    function(err) {
      if (err) return res.status(400).json({ error: 'Emel atau telefon sudah didaftar' });
      const token = jwt.sign({ id: this.lastID, role: 'user' }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { id: this.lastID, email, phone, name, role: 'user' } });
    });
});

app.post('/api/auth/login', (req, res) => {
  const { email, phone, password } = req.body;
  const identifier = email || phone;
  if (!identifier || !password) return res.status(400).json({ error: 'Sila masukkan emel/telefon dan kata laluan' });

  db.get('SELECT * FROM users WHERE email = ? OR phone = ?', [identifier, identifier], (err, user) => {
    if (err || !user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Emel/telefon atau kata laluan tidak betul' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, phone: user.phone, name: user.name, role: user.role } });
  });
});

/* ==================== FAVORITES ==================== */
app.get('/api/favorites', authMiddleware, (req, res) => {
  db.all('SELECT masjid.* FROM favorites JOIN masjid ON favorites.masjid_id = masjid.id WHERE favorites.user_id = ?', [req.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/favorites', authMiddleware, (req, res) => {
  const { masjid_id } = req.body;
  if (!masjid_id) return res.status(400).json({ error: 'Sila nyatakan masjid_id' });
  db.run('INSERT OR IGNORE INTO favorites (user_id, masjid_id) VALUES (?,?)', [req.userId, masjid_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/favorites/:masjid_id', authMiddleware, (req, res) => {
  db.run('DELETE FROM favorites WHERE user_id = ? AND masjid_id = ?', [req.userId, req.params.masjid_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/* ==================== REPORTS ==================== */
app.post('/api/reports', (req, res) => {
  const { kuliah_id, reason, reporter_email } = req.body;
  if (!kuliah_id || !reason) return res.status(400).json({ error: 'Sila nyatakan kuliah_id dan sebab' });
  db.run('INSERT INTO reports (kuliah_id, reason, reporter_email) VALUES (?,?,?)', [kuliah_id, reason, reporter_email||null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Laporan dihantar. Terima kasih.' });
  });
});

/* ==================== GEOCODING (Nominatim proxy) ==================== */
app.get('/api/geocode', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Sila berikan pertanyaan (q)' });
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=my&accept-language=ms`;
  const https = require('https');
  https.get(url, { headers: { 'User-Agent': 'KuliahMapKedah/1.0' } }, (nRes) => {
    let data = '';
    nRes.on('data', chunk => data += chunk);
    nRes.on('end', () => {
      try { res.json(JSON.parse(data)); }
      catch { res.json([]); }
    });
  }).on('error', () => res.json([]));
});

/* ==================== ADMIN ENDPOINTS ==================== */
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM admin WHERE username = ?', [username], (err, row) => {
    if (err || !row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Nama pengguna atau kata laluan tidak betul' });
    }
    const token = jwt.sign({ id: row.id, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: row.username, role: 'admin' });
  });
});

app.get('/api/admin/submissions', authMiddleware, adminMiddleware, (req, res) => {
  db.all(`SELECT kuliah.*, masjid.name as masjid_name, masjid.district FROM kuliah JOIN masjid ON kuliah.masjid_id = masjid.id WHERE kuliah.status = 'pending' ORDER BY kuliah.created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const enriched = rows.map(k => ({
      ...k,
      is_today: isOccurringToday(k.recurrence, k.recurrence_day),
      next_date: k.recurrence !== 'one_time'
        ? computeNextDate(k.recurrence, k.recurrence_day)
        : k.date,
    }));
    res.json(enriched);
  });
});

app.put('/api/admin/submissions/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Status tidak sah' });
  db.run("UPDATE kuliah SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    wss.broadcastKuliahUpdate(status === 'approved' ? 'approved' : 'rejected', { id: req.params.id, status });
    res.json({ success: true, changes: this.changes });
  });
});

app.post('/api/admin/masjid', authMiddleware, adminMiddleware, (req, res) => {
  const { name, address, district, latitude, longitude, type, phone } = req.body;
  db.run('INSERT INTO masjid (name, address, district, latitude, longitude, type, phone) VALUES (?,?,?,?,?,?,?)',
    [name, address, district, latitude, longitude, type||'masjid', phone||null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/admin/masjid/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { name, address, district, latitude, longitude, type, phone } = req.body;
  db.run('UPDATE masjid SET name=?, address=?, district=?, latitude=?, longitude=?, type=?, phone=? WHERE id=?',
    [name, address, district, latitude, longitude, type, phone, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    });
});

app.delete('/api/admin/kuliah/:id', authMiddleware, adminMiddleware, (req, res) => {
  db.run('DELETE FROM kuliah WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    wss.broadcastKuliahUpdate('deleted', { id: req.params.id });
    res.json({ success: true, changes: this.changes });
  });
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as count FROM masjid', [], (e, r) => { stats.masjid = r?.count || 0; });
  db.get("SELECT COUNT(*) as count FROM kuliah WHERE status='approved'", [], (e, r) => { stats.kuliah_approved = r?.count || 0; });
  db.get("SELECT COUNT(*) as count FROM kuliah WHERE status='pending'", [], (e, r) => { stats.kuliah_pending = r?.count || 0; });
  db.get('SELECT COUNT(*) as count FROM users', [], (e, r) => { stats.users = r?.count || 0; });
  db.get('SELECT COUNT(*) as count FROM reports', [], (e, r) => { stats.reports = r?.count || 0; check(); });
  function check() { if (stats.masjid !== undefined && stats.kuliah_approved !== undefined) res.json(stats); }
});

/* ==================== PHONE VALIDATION ==================== */
function validateMYPhone(phone) {
  if (!phone) return false;
  const clean = phone.replace(/\s/g, '');
  return /^(01[0-9]{1}-[0-9]{7,8}|01[0-9]{8,9})$/.test(clean);
}
app.get('/api/health', (req, res) => res.json({ status: 'OK', version: '2.0.0' }));

/* ==================== AI IMPORT (Groq LLM) ==================== */
app.post('/api/events/parse', async (req, res) => {
  const { text, district_hint } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Teks terlalu pendek. Sila tampal jadual kuliah yang lebih lengkap.' });
  }
  if (!groq) {
    return res.status(503).json({ error: 'Servis AI tidak tersedia. Pastikan GROQ_API_KEY diatur.' });
  }

  const KULIAH_TYPES = ['kuliah_maghrib','kuliah_subuh','ceramah_khas','tazkirah','kuliah_muslimat','kuliah_jumaat'];
  const RECURRENCE_TYPES = ['one_time','weekly','monthly'];

  const systemPrompt = `Anda adalah pembantu AI untuk aplikasi "KuliahMap Kedah" yang menjadualkan kuliah dan ceramah di masjid/surau di Kedah, Malaysia.

Tugas: Analisis teks jadual kuliah yang diberikan oleh pengguna dan ekstrak setiap kuliah sebagai objek JSON.

Setiap rekod mesti mempunyai medan berikut:
- masjid_name (string, wajib): Nama masjid atau surau.
- address (string, opsional): Alamat kampung/taman/bandar jika ada.
- district (string, wajib): Nama daerah di Kedah antara: Kota Setar, Kuala Muda, Kubang Pasu, Kulim, Langkawi, Padang Terap, Pendang, Pokok Sena, Sik, Baling, Bandar Baharu, Yan. Jika daerah tidak dinyatakan, gunakan daerah hint jika ada, jika tidak gunakan pendekatan logik berdasarkan nama kampung/masjid, jika masih tidak pasti gunakan "Kulim".
- title (string, wajib): Tajuk kuliah. Jika tiada tajuk, buat tajuk generic seperti "Kuliah Maghrib"/"Tazkirah"/"Ceramah Khas".
- ustaz_name (string, wajib): Nama penceramah. Jika tiada nama, guna "-".
- description (string, opsional): Penerangan tambahan.
- kuliah_type (string, wajib): Salah satu: kuliah_maghrib, kuliah_subuh, ceramah_khas, tazkirah, kuliah_muslimat, kuliah_jumaat.
- date (string ISO YYYY-MM-DD, wajib JIKA ada tarikh dalam teks): EKSTRAK tarikh yang dinyatakan dalam teks (contoh: "5 Mei 2026", "12/05/2026", "tahun depan"). Tukar ke YYYY-MM-DD. Ini adalah tarikh berlangsung walaupun kuliah tersebut mingguan. Jika tiada tarikh langsung dalam teks, guna null.
- time_start (string HH:MM, wajib): Masa mula. Jika tiada masa eksplisit, infer daripada jenis kuliah (kuliah_maghrib biasanya 19:15, kuliah_subuh 05:30, isyak 20:30).
- time_end (string HH:MM, opsional): Masa tamat jika dinyatakan.
- recurrence (string, wajib): Salah satu: one_time, weekly, monthly. Jika teks menyatakan "setiap hari Isnin", gunakan weekly.
- recurrence_day (string, opsional): Salah satu: monday,tuesday,wednesday,thursday,friday,saturday,sunday. Hanya jika weekly/bulanan dan hari dinyatakan.
- contact_phone (string, opsional): Nombor telefon jika ada.

RULES:
1. Jika masjid sama ada beberapa sesi pada masa berbeza, hasilkan satu rekod untuk setiap sesi (beza time_start).
2. Ustaz/ustazah perempuan boleh didedahkan melalui nama atau konteks ("penceramah": "Ustazah Siti" → "ustaSiti", dsb).
3. Jangan mengada-ada maklumat yang tidak wujud dalam teks.
4. JANGAN lupa medan date — jika teks ada sebarang tarikh, pastikan diekstrak ke YYYY-MM-DD walaupun kuliah tersebut mingguan. Tarikh ini adalah tarikh pertama/berikutnya kuliah tersebut.
5. Output mestilah JSON sah mengikut format di bawah.

Output format (JSON sah sahaja, tanpa markdown code block, tanpa teks ringkasan):
{
  "events": [ { ...record... }, { ...record... } ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: district_hint ? `Daerah: ${district_hint}\n\n${text.trim()}` : text.trim() }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    // Try to extract JSON even if wrapped in markdown
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);

    if (!Array.isArray(parsed.events)) {
      return res.status(422).json({ error: 'LLM tidak mengembalikan senarai events.', raw });
    }

    // Validate and sanitize each event
    const sanitized = parsed.events.map((ev, idx) => ({
      masjid_name: String(ev.masjid_name || '').trim() || `Rekod ${idx + 1}`,
      address: String(ev.address || '').trim() || null,
      district: KEDAH_DISTRICTS.includes(ev.district) ? ev.district : (district_hint && KEDAH_DISTRICTS.includes(district_hint) ? district_hint : 'Kulim'),
      title: String(ev.title || '').trim() || 'Kuliah',
      ustaz_name: String(ev.ustaz_name || '').trim() || '-',
      description: String(ev.description || '').trim() || null,
      kuliah_type: KULIAH_TYPES.includes(ev.kuliah_type) ? ev.kuliah_type : 'kuliah_maghrib',
      date: ev.date && /^\d{4}-\d{2}-\d{2}$/.test(String(ev.date)) ? ev.date : null,
      time_start: String(ev.time_start || '19:15').trim(),
      time_end: ev.time_end && /^\d{2}:\d{2}$/.test(String(ev.time_end)) ? ev.time_end : null,
      recurrence: RECURRENCE_TYPES.includes(ev.recurrence) ? ev.recurrence : 'weekly',
      recurrence_day: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(ev.recurrence_day) ? ev.recurrence_day : null,
      contact_phone: String(ev.contact_phone || '').trim() || null
    }));

    res.json({ events: sanitized });
  } catch (err) {
    console.error('Groq parse error:', err);
    res.status(500).json({ error: 'Ralat semasa menganalisis teks dengan AI.', detail: err.message });
  }
});

app.post('/api/events/bulk', authMiddleware, adminMiddleware, async (req, res) => {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'Sila berikan senarai events.' });
  }
  const inserted = [];
  const failed = [];

  for (const ev of events) {
    try {
      const handleInsert = (masjidId) => {
        return new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO kuliah (masjid_id, title, ustaz_name, description, kuliah_type, date, time_start, time_end, recurrence, recurrence_day, contact_phone, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,'approved')`,
            [masjidId, ev.title, ev.ustaz_name, ev.description||null, ev.kuliah_type, ev.date||null, ev.time_start, ev.time_end||null, ev.recurrence||'weekly', ev.recurrence_day||null, ev.contact_phone||null],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID, masjid_id: masjidId });
            }
          );
        });
      };

      // Try to find existing masjid by normalized name
      const normalized = ev.masjid_name.toLowerCase().replace(/surau|masjid/g, '').trim();
      const row = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM masjid WHERE LOWER(REPLACE(REPLACE(name, "surau", ""), "masjid", "")) LIKE ?', [`%${normalized}%`], (err, r) => {
          if (err) reject(err); else resolve(r);
        });
      });

      let masjidId;
      if (row) {
        masjidId = row.id;
      } else {
        // Insert new masjid with 0,0 lat/lng
        masjidId = await new Promise((resolve, reject) => {
          db.run('INSERT INTO masjid (name, address, district, latitude, longitude, type) VALUES (?,?,?,?,?,?)',
            [ev.masjid_name, ev.address||'', ev.district||'Kulim', 0, 0, 'masjid'],
            function(err) { if (err) reject(err); else resolve(this.lastID); });
        });
      }

      const result = await handleInsert(masjidId);
      inserted.push({ ...ev, ...result });
    } catch (err) {
      failed.push({ event: ev, error: err.message });
    }
  }

  res.json({ success: true, inserted_count: inserted.length, failed_count: failed.length, inserted, failed });
});

/* ==================== AUTO INSERT (open endpoint, auto-approve) ==================== */
app.post('/api/events/auto-insert', async (req, res) => {
  const { text, phone, name } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Sila tampal teks jadual kuliah.' });
  }
  if (!phone || !validateMYPhone(phone)) {
    return res.status(400).json({ error: 'Sila masukkan nombor telefon Malaysia yang sah (cth: 012-3456789).' });
  }
  if (!groq) {
    return res.status(503).json({ error: 'Servis AI tidak tersedia. Pastikan GROQ_API_KEY diatur.' });
  }

  try {
    // Reuse Groq parse logic inline
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: `Anda adalah pembantu AI untuk aplikasi "KuliahMap Kedah" yang menjadualkan kuliah dan ceramah di masjid/surau di Kedah, Malaysia.\n\nTugas: Analisis teks jadual kuliah yang diberikan dan ekstrak setiap kuliah sebagai objek JSON.\n\nMedan:\n- masjid_name (string, wajib)\n- address (string, opsional)\n- district (string, wajib): Salah satu daerah Kedah.\n- title (string, wajib)\n- ustaz_name (string, wajib)\n- description (string, opsional)\n- kuliah_type (string, wajib): kuliah_maghrib, kuliah_subuh, ceramah_khas, tazkirah, kuliah_muslimat, kuliah_jumaat\n- date (string ISO YYYY-MM-DD, wajib JIKA ada tarikh dalam teks): EKSTRAK tarikh yang dinyatakan dalam teks — ini adalah tarikh kuliah walaupun mingguan. Tukar ke YYYY-MM-DD. Jika tiada tarikh, null.\n- time_start (string HH:MM, wajib)\n- time_end (string HH:MM, opsional)\n- recurrence (string, wajib): one_time, weekly, monthly\n- recurrence_day (string, opsional): monday,tuesday,wednesday,thursday,friday,saturday,sunday\n- contact_phone (string, opsional)\n\nRULES:\n1. Jika masjid sama ada beberapa sesi pada masa berbeza, hasilkan satu rekod untuk setiap sesi.\n2. Jangan mengada-ada maklumat.\n3. JANGAN lupa medan date — jika teks ada sebarang tarikh, pastikan diekstrak ke YYYY-MM-DD.\n4. Output JSON sah sahaja tanpa markdown.\n\nFormat:\n{ "events": [ { ... } ] }` },
        { role: 'user', content: text.trim() }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);

    if (!Array.isArray(parsed.events)) {
      return res.status(422).json({ error: 'LLM tidak mengembalikan senarai events.', raw });
    }

    const KULIAH_TYPES = ['kuliah_maghrib','kuliah_subuh','ceramah_khas','tazkirah','kuliah_muslimat','kuliah_jumaat'];
    const RECURRENCE_TYPES = ['one_time','weekly','monthly'];

    const sanitized = parsed.events.map((ev, idx) => ({
      masjid_name: String(ev.masjid_name || '').trim() || `Rekod ${idx + 1}`,
      address: String(ev.address || '').trim() || null,
      district: KEDAH_DISTRICTS.includes(ev.district) ? ev.district : 'Kulim',
      title: String(ev.title || '').trim() || 'Kuliah',
      ustaz_name: String(ev.ustaz_name || '').trim() || '-',
      description: String(ev.description || '').trim() || null,
      kuliah_type: KULIAH_TYPES.includes(ev.kuliah_type) ? ev.kuliah_type : 'kuliah_maghrib',
      date: ev.date && /^\d{4}-\d{2}-\d{2}$/.test(String(ev.date)) ? ev.date : null,
      time_start: String(ev.time_start || '19:15').trim(),
      time_end: ev.time_end && /^\d{2}:\d{2}$/.test(String(ev.time_end)) ? ev.time_end : null,
      recurrence: RECURRENCE_TYPES.includes(ev.recurrence) ? ev.recurrence : 'weekly',
      recurrence_day: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(ev.recurrence_day) ? ev.recurrence_day : null,
      contact_phone: String(ev.contact_phone || '').trim() || phone || null,
      submitted_by: name || null
    }));

    const inserted = [];
    const failed = [];

    for (const ev of sanitized) {
      try {
        const handleInsert = (masjidId) => {
          return new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO kuliah (masjid_id, title, ustaz_name, description, kuliah_type, date, time_start, time_end, recurrence, recurrence_day, contact_phone, submitted_by, status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [masjidId, ev.title, ev.ustaz_name, ev.description || null, ev.kuliah_type, ev.date || null, ev.time_start, ev.time_end || null, ev.recurrence, ev.recurrence_day || null, ev.contact_phone || phone || null, ev.submitted_by, 'approved'],
              function(err) { if (err) reject(err); else resolve({ id: this.lastID, masjid_id: masjidId }); }
            );
          });
        };

        // Auto-match masjid by normalized name
        const normalized = ev.masjid_name.toLowerCase().replace(/surau|masjid/g, '').trim();
        const row = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM masjid WHERE LOWER(REPLACE(REPLACE(name, "surau", ""), "masjid", "")) LIKE ?', [`%${normalized}%`], (err, r) => {
            if (err) reject(err); else resolve(r);
          });
        });

        let masjidId;
        if (row) {
          masjidId = row.id;
        } else {
          masjidId = await new Promise((resolve, reject) => {
            db.run('INSERT INTO masjid (name, address, district, latitude, longitude, type) VALUES (?,?,?,?,?,?)',
              [ev.masjid_name, ev.address || '', ev.district || 'Kulim', 0, 0, 'masjid'],
              function(err) { if (err) reject(err); else resolve(this.lastID); });
          });
        }

        const result = await handleInsert(masjidId);
        inserted.push({ ...ev, ...result });
      } catch (err) {
        failed.push({ event: ev, error: err.message });
      }
    }

    if (inserted.length > 0) {
      wss.broadcastKuliahUpdate('approved', { inserted_count: inserted.length });
    }

    res.json({ success: true, inserted_count: inserted.length, failed_count: failed.length, message: `${inserted.length} jadual kuliah berjaya dimasukkan.` });
  } catch (err) {
    console.error('Auto-insert error:', err);
    res.status(500).json({ error: 'Ralat semasa menganalisis dan memasukkan data.', detail: err.message });
  }
});

/* ==================== SPA Fallback (must be last) ==================== */
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Endpoint tidak dijumpai' });
  } else {
    res.sendFile(require('path').join(publicPath, 'index.html'));
  }
});

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
wss.init(server);
cron.start();
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));