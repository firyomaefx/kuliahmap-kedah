const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'kuliahmap.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('DB open error:', err);
  else console.log('Connected to SQLite DB');
});

function initSchema() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS masjid (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      district TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      type TEXT DEFAULT 'masjid',
      phone TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kuliah (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      masjid_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      ustaz_name TEXT NOT NULL,
      description TEXT,
      kuliah_type TEXT NOT NULL,
      date DATE,
      time_start TIME NOT NULL,
      time_end TIME,
      recurrence TEXT DEFAULT 'one_time',
      recurrence_day TEXT,
      status TEXT DEFAULT 'pending',
      submitted_by TEXT,
      contact_phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (masjid_id) REFERENCES masjid(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      masjid_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, masjid_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (masjid_id) REFERENCES masjid(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kuliah_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reporter_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kuliah_id) REFERENCES kuliah(id)
    )`);
  });
}

function seedData() {
  const seedMasjid = [
    {name:"Masjid Zahir",address:"Jalan Kampung Perak, 05000 Alor Setar, Kedah",district:"Kota Setar",latitude:6.1214,longitude:100.3685,type:"masjid"},
    {name:"Masjid Sultanah Bahiyah",address:"Jalan Dato Haji Shuib, 05350 Alor Setar, Kedah",district:"Kota Setar",latitude:6.1433,longitude:100.3799,type:"masjid"},
    {name:"Masjid Al Rahman",address:"Jalan Yakin 1, Taman Mahkota, 05200 Alor Setar, Kedah",district:"Kota Setar",latitude:6.1302,longitude:100.3760,type:"masjid"},
    {name:"Masjid At-Taqwa",address:"Jalan Kenari Biru, Taman Kenyalang, 05200 Alor Setar, Kedah",district:"Kota Setar",latitude:6.1354,longitude:100.3825,type:"masjid"},
    {name:"Masjid Al-Ghufran Akar Peluru",address:"Lorong Tunku Mohammad, Kampung Piew, Simpang Kuala, 05050 Alor Setar, Kedah",district:"Kota Setar",latitude:6.1061,longitude:100.3622,type:"masjid"},
    {name:"Masjid Al Bukhary",address:"Jalan Langgar, 05460 Alor Setar, Kedah",district:"Kota Setar",latitude:6.1350,longitude:100.3580,type:"masjid"},
    {name:"Masjid Aman Simpang Kuala",address:"Jalan Anggerik 3, Taman Gunung Angsi, 05050 Alor Setar, Kedah",district:"Kota Setar",latitude:6.0975,longitude:100.3533,type:"masjid"},
    {name:"Masjid Al-Muttaqin",address:"Bandar Darul Aman, 06000 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2680,longitude:100.4218,type:"masjid"},
    {name:"Masjid Al-A'la",address:"Jalan Masjid, Taman Cahaya, Kampung Padang, 06000 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2681,longitude:100.4131,type:"masjid"},
    {name:"Masjid Al-Fateh Tanjung Pauh",address:"Federal Route 1, Kampung Tanjung Pauh, 06000 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2500,longitude:100.4195,type:"masjid"},
    {name:"Masjid Taman Tunku Sarina",address:"Jalan Myra, Taman Tunku Sarina, Bandar Darul Aman, 06007 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2592,longitude:100.4545,type:"masjid"},
    {name:"Masjid Muadzam",address:"Federal Route 1, Kampung Paya Kerchut, 06200 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2302,longitude:100.4191,type:"masjid"},
    {name:"Masjid Al-Muhsinin Darulaman Heights",address:"Jalan Damai, Kampung Panchor, 06000 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2409,longitude:100.4405,type:"masjid"},
    {name:"Masjid Kariah Wang Tepus",address:"K116, 06007 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2504,longitude:100.4842,type:"masjid"},
    {name:"Masjid Sharifah Fatimah",address:"Jalan Kemunting, Taman Seri Kemuning, 06000 Jitra, Kedah",district:"Kubang Pasu",latitude:6.2852,longitude:100.4198,type:"masjid"},
    {name:"Masjid Jame' Al Shahab",address:"Jalan Bukit Tinggi, Kampong Hilir, Kepala Batas, 06200 Kedah",district:"Kubang Pasu",latitude:6.2042,longitude:100.4137,type:"masjid"},
    {name:"Masjid Bani Hashim",address:"Taman Sri Hosba, Napoh, Kubang Pasu, Kedah",district:"Kubang Pasu",latitude:6.3577,longitude:100.4227,type:"masjid"},
    {name:"Masjid Al-Ehsan Temonyong",address:"Temonyong, 06010 Changlun, Kedah",district:"Kubang Pasu",latitude:6.4350,longitude:100.4280,type:"masjid"},
    {name:"Masjid Al Huda",address:"Kelang Lama, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3650,longitude:100.5556,type:"masjid"},
    {name:"Masjid Nurul Ehsan",address:"Taman Kenari, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3710,longitude:100.5480,type:"masjid"},
    {name:"Masjid Ibnu Sina",address:"Taman Laguna Merbok Kulim, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3730,longitude:100.5600,type:"masjid"},
    {name:"Masjid Taman Mekar Mas",address:"Taman Mekar Mas, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3600,longitude:100.5450,type:"masjid"},
    {name:"Masjid Al-Abrar",address:"Jalan Terap, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3750,longitude:100.5620,type:"masjid"},
    {name:"Masjid Taman Putra",address:"Taman Putra, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3550,longitude:100.5400,type:"masjid"},
    {name:"Masjid Al-Makmur Lunas",address:"Lunas, 09600 Kulim, Kedah",district:"Kulim",latitude:5.3450,longitude:100.5800,type:"masjid"},
    {name:"Masjid Padang Serai",address:"Padang Serai, 09400 Kulim, Kedah",district:"Kulim",latitude:5.5100,longitude:100.5300,type:"masjid"},
    {name:"Masjid Sungai Karas",address:"Sungai Karas, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3200,longitude:100.5900,type:"masjid"},
    {name:"Surau Al-Ikhlas Taman Selamat",address:"Taman Selamat, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3680,longitude:100.5520,type:"surau"},
    {name:"Surau Taman Desa Aman",address:"Taman Desa Aman, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3580,longitude:100.5500,type:"surau"},
    {name:"Surau Al-Ulum",address:"Bandar Baharu Kulim, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3650,longitude:100.5700,type:"surau"},
    {name:"Surau Kg Baru Kulim",address:"Kampung Baru, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3690,longitude:100.5570,type:"surau"},
    {name:"Surau Taman Sri Kulim",address:"Taman Sri Kulim, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3620,longitude:100.5430,type:"surau"},
    {name:"Surau Taman Indah",address:"Taman Indah, 09000 Kulim, Kedah",district:"Kulim",latitude:5.3630,longitude:100.5480,type:"surau"},
    {name:"Masjid Andalusia Laguna Merbok",address:"Laguna Merbok, 08000 Sungai Petani, Kedah",district:"Kuala Muda",latitude:5.6470,longitude:100.4870,type:"masjid"},
    {name:"Masjid Taman Aman",address:"Taman Aman, 08000 Sungai Petani, Kedah",district:"Kuala Muda",latitude:5.6380,longitude:100.4920,type:"masjid"},
    {name:"Masjid Sultanah Haminah",address:"06700 Pendang, Kedah",district:"Pendang",latitude:5.9917,longitude:100.4750,type:"masjid"},
    {name:"Masjid Nuruh Ihsan",address:"Pekan Tanah Merah, Pendang, Kedah",district:"Pendang",latitude:5.9800,longitude:100.4650,type:"masjid"},
  ];

  db.get("SELECT COUNT(*) AS count FROM masjid", (err, row) => {
    if (err) return;
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO masjid (name, address, district, latitude, longitude, type) VALUES (?,?,?,?,?,?)");
      seedMasjid.forEach(m => stmt.run(m.name, m.address, m.district, m.latitude, m.longitude, m.type));
      stmt.finalize(() => seedKuliah());
    } else {
      seedKuliah();
    }
  });

  function seedKuliah() {
    db.get("SELECT COUNT(*) AS count FROM kuliah", (err, row) => {
      if (err) return;
      if (row.count === 0) {
        const kuliahSeeds = [
          { masjid:"Masjid Zahir",title:"Tafsir Al-Quran",ustaz:"Ustaz Ahmad Dusuki",type:"kuliah_maghrib",recurrence:"weekly",day:"tuesday",start:"19:15",end:"20:15",desc:"Tafsir surah-surah Al-Quran secara mendalam" },
          { masjid:"Masjid Zahir",title:"Kuliah Subuh: Hadith 40",ustaz:"Ustaz Mohd Najib",type:"kuliah_subuh",recurrence:"weekly",day:"thursday",start:"06:00",end:"06:45",desc:"Pengajian Hadith 40 Imam Nawawi setiap Khamis Subuh" },
          { masjid:"Masjid Sultanah Bahiyah",title:"Tazkirah Dhuha & Soal Jawab Agama",ustaz:"Ustaz Azhar Idrus",type:"tazkirah",recurrence:"one_time",day:null,start:"09:00",end:"11:00",desc:"Sesi tazkirah dan soal jawab agama bersama Ustaz Azhar Idrus" },
          { masjid:"Masjid Sultanah Bahiyah",title:"Kuliah Maghrib: Fiqh Muamalat",ustaz:"Ustaz Rosli Md Yunos",type:"kuliah_maghrib",recurrence:"weekly",day:"wednesday",start:"19:20",end:"20:20",desc:"Pengajian fiqh muamalat dan perniagaan Islam" },
          { masjid:"Masjid Al Rahman",title:"Kuliah Maghrib: Sirah Nabawi",ustaz:"Ustaz Fauzi Ismail",type:"kuliah_maghrib",recurrence:"weekly",day:"monday",start:"19:15",end:"20:15",desc:"Sirah Nabi Muhammad SAW dan teladan untuk kehidupan moden" },
          { masjid:"Masjid At-Taqwa",title:"Kuliah Muslimat: Tadabbur Al-Quran",ustaz:"Ustazah Siti Aishah",type:"kuliah_muslimat",recurrence:"weekly",day:"wednesday",start:"10:00",end:"11:30",desc:"Khas untuk wanita - tadabbur ayat-ayat Al-Quran" },
          { masjid:"Masjid Al Bukhary",title:"Ceramah Khas: Keistimewaan Ramadhan",ustaz:"Ustaz Ahmad Dusuki",type:"ceramah_khas",recurrence:"one_time",day:null,start:"08:30",end:"10:30",desc:"Ceramah khas menyambut bulan Ramadhan" },
          { masjid:"Masjid Al-Muttaqin",title:"Kuliah Maghrib Perdana",ustaz:"Ustaz Abu Syafiq",type:"kuliah_maghrib",recurrence:"weekly",day:"friday",start:"19:30",end:"20:30",desc:"Kuliah Maghrib perdana setiap Jumaat" },
          { masjid:"Masjid Al-A'la",title:"Kuliah Subuh: Aqidah Islamiyyah",ustaz:"Ustaz Azman Ali",type:"kuliah_subuh",recurrence:"weekly",day:"monday",start:"06:00",end:"06:45",desc:"Pengajian akidah setiap Isnin Subuh" },
          { masjid:"Masjid Al-Fateh Tanjung Pauh",title:"Kuliah Jumaat: Fiqh Ibadah",ustaz:"Ustaz Zakaria Othman",type:"kuliah_jumaat",recurrence:"weekly",day:"friday",start:"12:30",end:"13:00",desc:"Kuliah ringkas selepas Solat Jumaat" },
          { masjid:"Masjid Al Huda",title:"Kuliah Subuh: Hadith 40 Imam Nawawi",ustaz:"Ustaz Mohd Najib",type:"kuliah_subuh",recurrence:"weekly",day:"wednesday",start:"06:00",end:"06:45",desc:"Pengajian Hadith 40 setiap Rabu Subuh" },
          { masjid:"Masjid Al Huda",title:"Kuliah Maghrib: Fiqh Munakahat",ustaz:"Ustaz Rosli Md Yunos",type:"kuliah_maghrib",recurrence:"weekly",day:"monday",start:"19:15",end:"20:15",desc:"Fiqh perkahwinan dan keluarga Islam" },
          { masjid:"Masjid Nurul Ehsan",title:"Ceramah Khas: Israk Mikraj",ustaz:"Ustaz Ahmad Dusuki",type:"ceramah_khas",recurrence:"one_time",day:null,start:"08:30",end:"10:30",desc:"Maulidur Rasul - Ceramah Khas Israk Mikraj" },
          { masjid:"Masjid Ibnu Sina",title:"Kuliah Maghrib: Sirah Nabi",ustaz:"Ustaz Fauzi Ismail",type:"kuliah_maghrib",recurrence:"weekly",day:"thursday",start:"19:20",end:"20:20",desc:"Sirah Nabi Muhammad SAW" },
          { masjid:"Surau Al-Ikhlas Taman Selamat",title:"Tazkirah Petang Jumaat",ustaz:"Ustaz Hashim Othman",type:"tazkirah",recurrence:"weekly",day:"friday",start:"17:30",end:"18:15",desc:"Tazkirah ringkas sebelum Maghrib setiap Jumaat" },
          { masjid:"Masjid Al-Makmur Lunas",title:"Kuliah Muslimat: Tadabbur Al-Quran",ustaz:"Ustazah Siti Aishah",type:"kuliah_muslimat",recurrence:"weekly",day:"wednesday",start:"10:00",end:"11:30",desc:"Khas untuk wanita - tadabbur Al-Quran" },
          { masjid:"Masjid Taman Putra",title:"Kuliah Jumaat: Khutbah & Tazkirah",ustaz:"Ustaz Zakaria Othman",type:"kuliah_jumaat",recurrence:"weekly",day:"friday",start:"12:30",end:"13:00",desc:"Kuliah selepas Solat Jumaat" },
          { masjid:"Masjid Al-Abrar",title:"Kuliah Maghrib: Usul Fiqh",ustaz:"Ustaz Mohd Najib",type:"kuliah_maghrib",recurrence:"weekly",day:"wednesday",start:"19:20",end:"20:20",desc:"Pengajian Usul Fiqh" },
          { masjid:"Masjid Andalusia Laguna Merbok",title:"Kuliah Maghrib: Tafsir Al-Quran",ustaz:"Ustaz Ahmad Dusuki",type:"kuliah_maghrib",recurrence:"weekly",day:"monday",start:"19:15",end:"20:15",desc:"Tafsir Al-Quran setiap Isnin di Sungai Petani" },
          { masjid:"Masjid Taman Aman",title:"Tazkirah Subuh: Sirah Sahabat",ustaz:"Ustaz Hashim Othman",type:"kuliah_subuh",recurrence:"weekly",day:"tuesday",start:"06:00",end:"06:45",desc:"Kisah teladan sahabat Rasulullah SAW" },
          { masjid:"Masjid Jame' Al Shahab",title:"Kuliah Maghrib: Fiqh Ibadah",ustaz:"Ustaz Azman Ali",type:"kuliah_maghrib",recurrence:"weekly",day:"tuesday",start:"19:15",end:"20:15",desc:"Pengajian fiqh ibadah di Kepala Batas" },
          { masjid:"Masjid Bani Hashim",title:"Kuliah Subuh: Tasawuf & Akhlak",ustaz:"Ustaz Fauzi Ismail",type:"kuliah_subuh",recurrence:"weekly",day:"wednesday",start:"06:00",end:"06:45",desc:"Pengajian tasawuf dan akhlak di Napoh" },
        ];

        kuliahSeeds.forEach(ks => {
          db.get("SELECT id FROM masjid WHERE name = ?", [ks.masjid], (e, r) => {
            if (!r) return;
            db.run(
              "INSERT INTO kuliah (masjid_id, title, ustaz_name, description, kuliah_type, recurrence, recurrence_day, time_start, time_end, status) VALUES (?,?,?,?,?,?,?,?,?,?)",
              [r.id, ks.title, ks.ustaz, ks.desc || null, ks.type, ks.recurrence, ks.day, ks.start, ks.end, 'approved']
            );
          });
        });
      }
    });
  }

  db.get("SELECT COUNT(*) AS count FROM admin", (err, row) => {
    if (err) return;
    if (row.count === 0) {
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
      db.run("INSERT INTO admin (username, password_hash) VALUES (?,?)", [process.env.ADMIN_USERNAME || 'admin', hash]);
    }
  });
}

module.exports = { db, initSchema, seedData };