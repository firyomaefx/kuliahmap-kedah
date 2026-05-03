require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, initSchema, seedData } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend (works both locally and in Docker)
const publicPath = require('fs').existsSync(require('path').join(__dirname, '..', 'frontend', 'dist'))
  ? require('path').join(__dirname, '..', 'frontend', 'dist')
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
    let results = rows;
    if (lat && lng) {
      results = rows.map(k => ({ ...k, distance: parseFloat(haversine(+lat, +lng, k.latitude, k.longitude).toFixed(2)) }))
        .sort((a, b) => a.distance - b.distance);
    }
    res.json(results);
  });
});

app.get('/api/kuliah/:id', (req, res) => {
  db.get(`SELECT kuliah.*, masjid.name as masjid_name, masjid.address, masjid.district, masjid.latitude, masjid.longitude, masjid.phone as masjid_phone FROM kuliah JOIN masjid ON kuliah.masjid_id = masjid.id WHERE kuliah.id = ? AND kuliah.status = 'approved'`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Kuliah tidak dijumpai' });
    res.json(row);
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
         VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')`,
        [masjidId, title, ustaz_name, description||null, kuliah_type, date||null, time_start, time_end||null, recurrence||'one_time', recurrence_day||null, contact_phone||null],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ success: true, id: this.lastID, message: 'Jadual kuliah berjaya dihantar untuk disemak.' });
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
    res.json(rows);
  });
});

app.put('/api/admin/submissions/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { status } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Status tidak sah' });
  db.run("UPDATE kuliah SET status = ? WHERE id = ?", [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
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

/* ==================== HEALTH ==================== */
app.get('/api/health', (req, res) => res.json({ status: 'OK', version: '2.0.0' }));

/* ==================== SPA Fallback (must be last) ==================== */
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Endpoint tidak dijumpai' });
  } else {
    res.sendFile(require('path').join(publicPath, 'index.html'));
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));