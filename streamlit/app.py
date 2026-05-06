import streamlit as st
st.set_page_config(
    page_title="KuliahMap Kedah",
    page_icon="K",
    layout="wide",
    initial_sidebar_state="collapsed",
)

import sqlite3
import json
import os
import re
from datetime import datetime, timedelta
from math import radians, sin, cos, sqrt, atan2

from groq import Groq

PAS_GREEN = "#008000"
PAS_DARK = "#004d00"
PAS_LIGHT = "#e6ffe6"
PAS_BG = "#f0fff0"

# -------------------- SEED DATA --------------------
SEED_MASJID = [
    {"name":"Masjid Zahir","address":"Jalan Kampung Perak, 05000 Alor Setar, Kedah","district":"Kota Setar","latitude":6.1214,"longitude":100.3685,"type":"masjid"},
    {"name":"Masjid Sultanah Bahiyah","address":"Jalan Dato Haji Shuib, 05350 Alor Setar, Kedah","district":"Kota Setar","latitude":6.1433,"longitude":100.3799,"type":"masjid"},
    {"name":"Masjid Al Rahman","address":"Jalan Yakin 1, Taman Mahkota, 05200 Alor Setar, Kedah","district":"Kota Setar","latitude":6.1302,"longitude":100.3760,"type":"masjid"},
    {"name":"Masjid At-Taqwa","address":"Jalan Kenari Biru, Taman Kenyalang, 05200 Alor Setar, Kedah","district":"Kota Setar","latitude":6.1354,"longitude":100.3825,"type":"masjid"},
    {"name":"Masjid Al-Ghufran Akar Peluru","address":"Lorong Tunku Mohammad, Kampung Piew, Simpang Kuala, 05050 Alor Setar, Kedah","district":"Kota Setar","latitude":6.1061,"longitude":100.3622,"type":"masjid"},
    {"name":"Masjid Al Bukhary","address":"Jalan Langgar, 05460 Alor Setar, Kedah","district":"Kota Setar","latitude":6.1350,"longitude":100.3580,"type":"masjid"},
    {"name":"Masjid Aman Simpang Kuala","address":"Jalan Anggerik 3, Taman Gunung Angsi, 05050 Alor Setar, Kedah","district":"Kota Setar","latitude":6.0975,"longitude":100.3533,"type":"masjid"},
    {"name":"Masjid Al-Muttaqin","address":"Bandar Darul Aman, 06000 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2680,"longitude":100.4218,"type":"masjid"},
    {"name":"Masjid Al-A'la","address":"Jalan Masjid, Taman Cahaya, Kampung Padang, 06000 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2681,"longitude":100.4131,"type":"masjid"},
    {"name":"Masjid Al-Fateh Tanjung Pauh","address":"Federal Route 1, Kampung Tanjung Pauh, 06000 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2500,"longitude":100.4195,"type":"masjid"},
    {"name":"Masjid Taman Tunku Sarina","address":"Jalan Myra, Taman Tunku Sarina, Bandar Darul Aman, 06007 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2592,"longitude":100.4545,"type":"masjid"},
    {"name":"Masjid Muadzam","address":"Federal Route 1, Kampung Paya Kerchut, 06200 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2302,"longitude":100.4191,"type":"masjid"},
    {"name":"Masjid Al-Muhsinin Darulaman Heights","address":"Jalan Damai, Kampung Panchor, 06000 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2409,"longitude":100.4405,"type":"masjid"},
    {"name":"Masjid Kariah Wang Tepus","address":"K116, 06007 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2504,"longitude":100.4842,"type":"masjid"},
    {"name":"Masjid Sharifah Fatimah","address":"Jalan Kemunting, Taman Seri Kemuning, 06000 Jitra, Kedah","district":"Kubang Pasu","latitude":6.2852,"longitude":100.4198,"type":"masjid"},
    {"name":"Masjid Jame' Al Shahab","address":"Jalan Bukit Tinggi, Kampong Hilir, Kepala Batas, 06200 Kedah","district":"Kubang Pasu","latitude":6.2042,"longitude":100.4137,"type":"masjid"},
    {"name":"Masjid Bani Hashim","address":"Taman Sri Hosba, Napoh, Kubang Pasu, Kedah","district":"Kubang Pasu","latitude":6.3577,"longitude":100.4227,"type":"masjid"},
    {"name":"Masjid Al-Ehsan Temonyong","address":"Temonyong, 06010 Changlun, Kedah","district":"Kubang Pasu","latitude":6.4350,"longitude":100.4280,"type":"masjid"},
    {"name":"Masjid Al Huda","address":"Kelang Lama, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3650,"longitude":100.5556,"type":"masjid"},
    {"name":"Masjid Nurul Ehsan","address":"Taman Kenari, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3710,"longitude":100.5480,"type":"masjid"},
    {"name":"Masjid Ibnu Sina","address":"Taman Laguna Merbok Kulim, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3730,"longitude":100.5600,"type":"masjid"},
    {"name":"Masjid Taman Mekar Mas","address":"Taman Mekar Mas, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3600,"longitude":100.5450,"type":"masjid"},
    {"name":"Masjid Al-Abrar","address":"Jalan Terap, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3750,"longitude":100.5620,"type":"masjid"},
    {"name":"Masjid Taman Putra","address":"Taman Putra, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3550,"longitude":100.5400,"type":"masjid"},
    {"name":"Masjid Al-Makmur Lunas","address":"Lunas, 09600 Kulim, Kedah","district":"Kulim","latitude":5.3450,"longitude":100.5800,"type":"masjid"},
    {"name":"Masjid Padang Serai","address":"Padang Serai, 09400 Kulim, Kedah","district":"Kulim","latitude":5.5100,"longitude":100.5300,"type":"masjid"},
    {"name":"Masjid Sungai Karas","address":"Sungai Karas, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3200,"longitude":100.5900,"type":"masjid"},
    {"name":"Surau Al-Ikhlas Taman Selamat","address":"Taman Selamat, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3680,"longitude":100.5520,"type":"surau"},
    {"name":"Surau Taman Desa Aman","address":"Taman Desa Aman, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3580,"longitude":100.5500,"type":"surau"},
    {"name":"Surau Al-Ulum","address":"Bandar Baharu Kulim, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3650,"longitude":100.5700,"type":"surau"},
    {"name":"Surau Kg Baru Kulim","address":"Kampung Baru, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3690,"longitude":100.5570,"type":"surau"},
    {"name":"Surau Taman Sri Kulim","address":"Taman Sri Kulim, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3620,"longitude":100.5430,"type":"surau"},
    {"name":"Surau Taman Indah","address":"Taman Indah, 09000 Kulim, Kedah","district":"Kulim","latitude":5.3630,"longitude":100.5480,"type":"surau"},
    {"name":"Masjid Andalusia Laguna Merbok","address":"Laguna Merbok, 08000 Sungai Petani, Kedah","district":"Kuala Muda","latitude":5.6470,"longitude":100.4870,"type":"masjid"},
    {"name":"Masjid Taman Aman","address":"Taman Aman, 08000 Sungai Petani, Kedah","district":"Kuala Muda","latitude":5.6380,"longitude":100.4920,"type":"masjid"},
    {"name":"Masjid Sultanah Haminah","address":"06700 Pendang, Kedah","district":"Pendang","latitude":5.9917,"longitude":100.4750,"type":"masjid"},
    {"name":"Masjid Nuruh Ihsan","address":"Pekan Tanah Merah, Pendang, Kedah","district":"Pendang","latitude":5.9800,"longitude":100.4650,"type":"masjid"},
]

KULIAH_SEEDS = [
    {"masjid":"Masjid Zahir","title":"Tafsir Al-Quran","ustaz":"Ustaz Ahmad Dusuki","type":"kuliah_maghrib","recurrence":"weekly","day":"tuesday","start":"19:15","end":"20:15","desc":"Tafsir surah-surah Al-Quran secara mendalam"},
    {"masjid":"Masjid Zahir","title":"Kuliah Subuh: Hadith 40","ustaz":"Ustaz Mohd Najib","type":"kuliah_subuh","recurrence":"weekly","day":"thursday","start":"06:00","end":"06:45","desc":"Pengajian Hadith 40 Imam Nawawi"},
    {"masjid":"Masjid Sultanah Bahiyah","title":"Tazkirah Dhuha & Soal Jawab Agama","ustaz":"Ustaz Azhar Idrus","type":"tazkirah","recurrence":"one_time","day":None,"start":"09:00","end":"11:00","desc":"Sesi tazkirah dan soal jawab agama"},
    {"masjid":"Masjid Sultanah Bahiyah","title":"Kuliah Maghrib: Fiqh Muamalat","ustaz":"Ustaz Rosli Md Yunos","type":"kuliah_maghrib","recurrence":"weekly","day":"wednesday","start":"19:20","end":"20:20","desc":"Pengajian fiqh muamalat"},
    {"masjid":"Masjid Al Rahman","title":"Kuliah Maghrib: Sirah Nabawi","ustaz":"Ustaz Fauzi Ismail","type":"kuliah_maghrib","recurrence":"weekly","day":"monday","start":"19:15","end":"20:15","desc":"Sirah Nabi Muhammad SAW"},
    {"masjid":"Masjid At-Taqwa","title":"Kuliah Muslimat: Tadabbur Al-Quran","ustaz":"Ustazah Siti Aishah","type":"kuliah_muslimat","recurrence":"weekly","day":"wednesday","start":"10:00","end":"11:30","desc":"Khas untuk wanita"},
    {"masjid":"Masjid Al Bukhary","title":"Ceramah Khas: Keistimewaan Ramadhan","ustaz":"Ustaz Ahmad Dusuki","type":"ceramah_khas","recurrence":"one_time","day":None,"start":"08:30","end":"10:30","desc":"Ceramah khas Ramadhan"},
    {"masjid":"Masjid Al-Muttaqin","title":"Kuliah Maghrib Perdana","ustaz":"Ustaz Abu Syafiq","type":"kuliah_maghrib","recurrence":"weekly","day":"friday","start":"19:30","end":"20:30","desc":"Kuliah Maghrib perdana"},
    {"masjid":"Masjid Al-A'la","title":"Kuliah Subuh: Aqidah Islamiyyah","ustaz":"Ustaz Azman Ali","type":"kuliah_subuh","recurrence":"weekly","day":"monday","start":"06:00","end":"06:45","desc":"Pengajian akidah"},
    {"masjid":"Masjid Al-Fateh Tanjung Pauh","title":"Kuliah Jumaat: Fiqh Ibadah","ustaz":"Ustaz Zakaria Othman","type":"kuliah_jumaat","recurrence":"weekly","day":"friday","start":"12:30","end":"13:00","desc":"Kuliah selepas Solat Jumaat"},
    {"masjid":"Masjid Al Huda","title":"Kuliah Subuh: Hadith 40","ustaz":"Ustaz Mohd Najib","type":"kuliah_subuh","recurrence":"weekly","day":"wednesday","start":"06:00","end":"06:45","desc":"Hadith 40 Imam Nawawi"},
    {"masjid":"Masjid Al Huda","title":"Kuliah Maghrib: Fiqh Munakahat","ustaz":"Ustaz Rosli Md Yunos","type":"kuliah_maghrib","recurrence":"weekly","day":"monday","start":"19:15","end":"20:15","desc":"Fiqh perkahwinan"},
    {"masjid":"Masjid Nurul Ehsan","title":"Ceramah Khas: Israk Mikraj","ustaz":"Ustaz Ahmad Dusuki","type":"ceramah_khas","recurrence":"one_time","day":None,"start":"08:30","end":"10:30","desc":"Ceramah Khas Israk Mikraj"},
    {"masjid":"Masjid Ibnu Sina","title":"Kuliah Maghrib: Sirah Nabi","ustaz":"Ustaz Fauzi Ismail","type":"kuliah_maghrib","recurrence":"weekly","day":"thursday","start":"19:20","end":"20:20","desc":"Sirah Nabi SAW"},
    {"masjid":"Surau Al-Ikhlas Taman Selamat","title":"Tazkirah Petang Jumaat","ustaz":"Ustaz Hashim Othman","type":"tazkirah","recurrence":"weekly","day":"friday","start":"17:30","end":"18:15","desc":"Tazkirah sebelum Maghrib"},
    {"masjid":"Masjid Al-Makmur Lunas","title":"Kuliah Muslimat: Tadabbur Al-Quran","ustaz":"Ustazah Siti Aishah","type":"kuliah_muslimat","recurrence":"weekly","day":"wednesday","start":"10:00","end":"11:30","desc":"Khas untuk wanita"},
    {"masjid":"Masjid Taman Putra","title":"Kuliah Jumaat: Khutbah & Tazkirah","ustaz":"Ustaz Zakaria Othman","type":"kuliah_jumaat","recurrence":"weekly","day":"friday","start":"12:30","end":"13:00","desc":"Kuliah selepas Jumaat"},
    {"masjid":"Masjid Al-Abrar","title":"Kuliah Maghrib: Usul Fiqh","ustaz":"Ustaz Mohd Najib","type":"kuliah_maghrib","recurrence":"weekly","day":"wednesday","start":"19:20","end":"20:20","desc":"Pengajian Usul Fiqh"},
    {"masjid":"Masjid Andalusia Laguna Merbok","title":"Kuliah Maghrib: Tafsir Al-Quran","ustaz":"Ustaz Ahmad Dusuki","type":"kuliah_maghrib","recurrence":"weekly","day":"monday","start":"19:15","end":"20:15","desc":"Tafsir Al-Quran"},
    {"masjid":"Masjid Taman Aman","title":"Tazkirah Subuh: Sirah Sahabat","ustaz":"Ustaz Hashim Othman","type":"kuliah_subuh","recurrence":"weekly","day":"tuesday","start":"06:00","end":"06:45","desc":"Kisah teladan sahabat"},
    {"masjid":"Masjid Jame' Al Shahab","title":"Kuliah Maghrib: Fiqh Ibadah","ustaz":"Ustaz Azman Ali","type":"kuliah_maghrib","recurrence":"weekly","day":"tuesday","start":"19:15","end":"20:15","desc":"Fiqh ibadah"},
    {"masjid":"Masjid Bani Hashim","title":"Kuliah Subuh: Tasawuf & Akhlak","ustaz":"Ustaz Fauzi Ismail","type":"kuliah_subuh","recurrence":"weekly","day":"wednesday","start":"06:00","end":"06:45","desc":"Tasawuf dan akhlak"},
]

DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']
TYPE_LABELS = {
    'kuliah_maghrib':'Kuliah Maghrib','kuliah_subuh':'Kuliah Subuh',
    'ceramah_khas':'Ceramah Khas','tazkirah':'Tazkirah',
    'kuliah_muslimat':'Kuliah Muslimat','kuliah_jumaat':'Kuliah Jumaat'
}
DAY_LABELS = {'monday':'Isnin','tuesday':'Selasa','wednesday':'Rabu','thursday':'Khamis','friday':'Jumaat','saturday':'Sabtu','sunday':'Ahad'}

# -------------------- DATABASE --------------------
@st.cache_resource
def get_db():
    db_path = os.path.join(os.path.dirname(__file__), "data", "kuliahmap.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS masjid (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, address TEXT NOT NULL, district TEXT NOT NULL,
            latitude REAL NOT NULL, longitude REAL NOT NULL,
            type TEXT DEFAULT 'masjid', phone TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS kuliah (
            id INTEGER PRIMARY KEY AUTOINCREMENT, masjid_id INTEGER NOT NULL,
            title TEXT NOT NULL, ustaz_name TEXT NOT NULL, description TEXT,
            kuliah_type TEXT NOT NULL, date DATE, time_start TIME NOT NULL, time_end TIME,
            recurrence TEXT DEFAULT 'one_time', recurrence_day TEXT,
            status TEXT DEFAULT 'pending', submitted_by TEXT, contact_phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    c.execute("SELECT COUNT(*) FROM masjid")
    if c.fetchone()[0] == 0:
        for m in SEED_MASJID:
            c.execute("INSERT INTO masjid (name,address,district,latitude,longitude,type) VALUES (?,?,?,?,?,?)",
                (m["name"],m["address"],m["district"],m["latitude"],m["longitude"],m["type"]))
    c.execute("SELECT COUNT(*) FROM kuliah")
    if c.fetchone()[0] == 0:
        for k in KULIAH_SEEDS:
            c.execute("SELECT id FROM masjid WHERE name=?", (k["masjid"],))
            row = c.fetchone()
            if row:
                c.execute("""INSERT INTO kuliah (masjid_id,title,ustaz_name,description,kuliah_type,recurrence,recurrence_day,time_start,time_end,status)
                    VALUES (?,?,?,?,?,?,?,?,?,'approved')""",
                    (row["id"],k["title"],k["ustaz"],k.get("desc"),k["type"],k["recurrence"],k.get("day"),k["start"],k["end"]))
    conn.commit()
    return conn

def get_masjid(conn, district=None, search=None):
    sql = "SELECT * FROM masjid WHERE 1=1"
    params = []
    if district:
        sql += " AND district=?"; params.append(district)
    if search:
        sql += " AND (name LIKE ? OR address LIKE ?)"; params.extend([f"%{search}%", f"%{search}%"])
    rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]

def get_kuliah(conn, district=None, ktype=None, time_filter=None, search=None):
    sql = """SELECT kuliah.*, masjid.name as masjid_name, masjid.address, masjid.district,
        masjid.latitude, masjid.longitude FROM kuliah JOIN masjid ON kuliah.masjid_id=masjid.id
        WHERE kuliah.status='approved'"""
    params = []
    if district:
        sql += " AND masjid.district=?"; params.append(district)
    if ktype:
        sql += " AND kuliah.kuliah_type=?"; params.append(ktype)
    if search:
        sql += " AND (kuliah.title LIKE ? OR kuliah.ustaz_name LIKE ? OR masjid.name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    if time_filter:
        today = datetime.now().strftime("%Y-%m-%d")
        if time_filter == "today":
            sql += " AND (kuliah.date=? OR kuliah.recurrence!='one_time')"; params.append(today)
        elif time_filter == "week":
            nxt = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            sql += " AND ((kuliah.date BETWEEN ? AND ?) OR kuliah.recurrence!='one_time')"; params.extend([today,nxt])
        elif time_filter == "month":
            nxt = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            sql += " AND ((kuliah.date BETWEEN ? AND ?) OR kuliah.recurrence!='one_time')"; params.extend([today,nxt])
    sql += " ORDER BY kuliah.date ASC, kuliah.time_start ASC"
    rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]

def get_kuliah_by_id(conn, kid):
    row = conn.execute("""SELECT kuliah.*, masjid.name as masjid_name, masjid.address, masjid.district,
        masjid.latitude, masjid.longitude, masjid.phone as masjid_phone
        FROM kuliah JOIN masjid ON kuliah.masjid_id=masjid.id
        WHERE kuliah.id=? AND kuliah.status='approved'""", (kid,)).fetchone()
    return dict(row) if row else None

def validate_my_phone(phone):
    if not phone: return False
    clean = re.sub(r'\s', '', phone)
    return bool(re.match(r'^(01[0-9]{1}-[0-9]{7,8}|01[0-9]{8,9})$', clean))

def groq_parse(text):
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    system_prompt = """Anda adalah pembantu AI untuk aplikasi "KuliahMap Kedah" yang menjadualkan kuliah dan ceramah di masjid/surau di Kedah, Malaysia.

Tugas: Analisis teks jadual kuliah yang diberikan dan ekstrak setiap kuliah sebagai objek JSON.

Medan:
- masjid_name (string, wajib)
- address (string, opsional)
- district (string, wajib): Salah satu daerah Kedah
- title (string, wajib)
- ustaz_name (string, wajib)
- description (string, opsional)
- kuliah_type (string, wajib): kuliah_maghrib, kuliah_subuh, ceramah_khas, tazkirah, kuliah_muslimat, kuliah_jumaat
- date (string ISO YYYY-MM-DD, wajib JIKA ada tarikh): EKSTRAK tarikh yang dinyatakan. Tukar ke YYYY-MM-DD. Jika tiada, null.
- time_start (string HH:MM, wajib)
- time_end (string HH:MM, opsional)
- recurrence (string, wajib): one_time, weekly, monthly
- recurrence_day (string, opsional): monday,tuesday,wednesday,thursday,friday,saturday,sunday
- contact_phone (string, opsional)

RULES:
1. Jika masjid ada beberapa sesi, hasilkan satu rekod setiap sesi.
2. Jangan mengada-ada maklumat.
3. JANGAN lupa medan date.
4. Output JSON sah sahaja tanpa markdown.

Format: { "events": [ { ... } ] }"""

    completion = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=4096,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text.strip()}
        ]
    )
    raw = completion.choices[0].message.content or ""
    json_match = re.search(r'\{[\s\S]*\}', raw)
    parsed = json.loads(json_match.group(0) if json_match else raw)
    return parsed.get("events", [])

def auto_insert_events(conn, events, phone, name):
    c = conn.cursor()
    inserted = 0
    KEDAH_DISTRICTS = ['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']
    KULIAH_TYPES = ['kuliah_maghrib','kuliah_subuh','ceramah_khas','tazkirah','kuliah_muslimat','kuliah_jumaat']
    RECURRENCE_TYPES = ['one_time','weekly','monthly']

    for ev in events:
        masjid_name = str(ev.get("masjid_name", "")).strip() or "-"
        district = ev.get("district") if ev.get("district") in KEDAH_DISTRICTS else "Kulim"
        title = str(ev.get("title", "")).strip() or "Kuliah"
        ustaz = str(ev.get("ustaz_name", "")).strip() or "-"
        desc = str(ev.get("description", "")).strip() or None
        ktype = ev.get("kuliah_type") if ev.get("kuliah_type") in KULIAH_TYPES else "kuliah_maghrib"
        date = ev.get("date") if ev.get("date") and re.match(r'^\d{4}-\d{2}-\d{2}$', str(ev.get("date", ""))) else None
        time_start = str(ev.get("time_start", "19:15")).strip()
        time_end = ev.get("time_end") if ev.get("time_end") and re.match(r'^\d{2}:\d{2}$', str(ev.get("time_end", ""))) else None
        rec = ev.get("recurrence") if ev.get("recurrence") in RECURRENCE_TYPES else "weekly"
        rec_day = ev.get("recurrence_day") if ev.get("recurrence_day") in ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] else None
        contact_phone = str(ev.get("contact_phone", "")).strip() or phone or None

        normalized = re.sub(r'surau|masjid', '', masjid_name.lower()).strip()
        c.execute("SELECT * FROM masjid WHERE LOWER(REPLACE(REPLACE(name,'surau',''),'masjid','')) LIKE ?", (f"%{normalized}%",))
        row = c.fetchone()
        if row:
            masjid_id = row["id"]
        else:
            c.execute("INSERT INTO masjid (name,address,district,latitude,longitude,type) VALUES (?,?,?,?,?,?)",
                (masjid_name, ev.get("address",""), district, 0, 0, "masjid"))
            masjid_id = c.lastrowid

        c.execute("""INSERT INTO kuliah (masjid_id,title,ustaz_name,description,kuliah_type,date,time_start,time_end,recurrence,recurrence_day,contact_phone,submitted_by,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (masjid_id, title, ustaz, desc, ktype, date, time_start, time_end, rec, rec_day, contact_phone, name or None, 'approved'))
        inserted += 1
    conn.commit()
    return inserted

def generate_featured(conn, force=False):
    if "featured_data" in st.session_state and not force:
        return st.session_state.featured_data

    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    today_str = datetime.now().strftime("%Y-%m-%d")
    day_name = DAY_LABELS.get(datetime.now().strftime("%A").lower(), "Hari Ini")

    kuliah_list = get_kuliah(conn, time_filter="today")
    if not kuliah_list:
        kuliah_list = get_kuliah(conn, time_filter="week")

    if not kuliah_list:
        result = {
            "headline": "Tiada Kuliah Hari Ini",
            "subhead": "Semak semula esok untuk jadual terkini",
            "ajakan": "",
            "count": 0
        }
        st.session_state.featured_data = result
        return result

    event_texts = []
    for k in kuliah_list[:10]:
        schedule = ""
        if k["recurrence"] == "weekly" and k["recurrence_day"]:
            schedule = f"Setiap {DAY_LABELS.get(k['recurrence_day'], k['recurrence_day'])}"
        elif k["recurrence"] == "monthly":
            schedule = "Setiap bulan"
        if k["date"]:
            schedule = datetime.strptime(k["date"], "%Y-%m-%d").strftime("%d %B %Y")
        event_texts.append(f"{k['title']} oleh {k['ustaz_name']} di {k['masjid_name']}, {k['district']}. {schedule} pukul {k['time_start']}")

    prompt = f"""Hari ini adalah {day_name}, {today_str}. Berikut adalah senarai kuliah/ceramah di Kedah hari ini:

{chr(10).join(event_texts)}

Tugas: Tulis satu pengumuman ringkas dalam Bahasa Melayu (gaya PAS / Parti Islam Se-Malaysia, semangat dakwah) yang mengandungi:
1. Headline yang catchy dan bersemangat (maks 10 patah perkataan)
2. Subhead / penerangan ringkas (1-2 ayat) tentang apa yang menarik hari ini
3. Ayat ajakan pendek (maks 1 ayat) supaya orang ramai hadir ke kuliah

Output JSON SAHAJA:
{{"headline":"...","subhead":"...","ajakan":"..."}}"""

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = completion.choices[0].message.content or ""
        json_match = re.search(r'\{[\s\S]*\}', raw)
        parsed = json.loads(json_match.group(0) if json_match else raw)
        result = {
            "headline": parsed.get("headline", "Kuliah Hari Ini"),
            "subhead": parsed.get("subhead", ""),
            "ajakan": parsed.get("ajakan", ""),
            "count": len(kuliah_list)
        }
    except Exception:
        result = {
            "headline": f"Kuliah {day_name} di Kedah",
            "subhead": f"Terdapat {len(kuliah_list)} kuliah dijadualkan hari ini di sekitar Kedah.",
            "ajakan": "Ayuh hadir ke masjid berdekatan anda!",
            "count": len(kuliah_list)
        }

    st.session_state.featured_data = result
    return result

def format_time(t):
    if not t: return ""
    h, m = t.split(":")
    hour = int(h)
    return f"{hour if hour <= 12 else hour - 12}:{m} {'AM' if hour < 12 else 'PM'}"

def format_schedule(k):
    if k["recurrence"] == "weekly":
        return f"Setiap {DAY_LABELS.get(k['recurrence_day'], k['recurrence_day'])}"
    if k["recurrence"] == "monthly":
        return "Setiap bulan"
    if k["date"]:
        return datetime.strptime(k["date"], "%Y-%m-%d").strftime("%A, %d %B %Y")
    return ""

# -------------------- APP --------------------
conn = get_db()

st.markdown(f"""
    <style>
    .main .block-container {{ padding-top: 1rem; padding-bottom: 1rem; }}
    .st-emotion-cache-1jicfl2 {{ width: 100%; padding: 0; }}
    .pas-hero {{
        background: linear-gradient(135deg, {PAS_GREEN}, {PAS_DARK});
        border-radius: 16px;
        padding: 2rem 1.5rem;
        color: white;
        margin-bottom: 1.5rem;
    }}
    .pas-hero h1 {{
        font-size: 1.8rem;
        font-weight: 800;
        line-height: 1.3;
        margin-bottom: 0.5rem;
    }}
    .pas-hero .subhead {{
        font-size: 1.05rem;
        opacity: 0.92;
        line-height: 1.6;
    }}
    .pas-hero .ajakan {{
        margin-top: 1rem;
        font-size: 1.1rem;
        font-weight: 700;
        background: rgba(255,255,255,0.2);
        display: inline-block;
        padding: 0.5rem 1.2rem;
        border-radius: 50px;
    }}
    .pas-card {{
        background: white;
        border: 1px solid #c8e6c8;
        border-left: 4px solid {PAS_GREEN};
        border-radius: 12px;
        padding: 1rem 1.2rem;
        margin-bottom: 0.6rem;
    }}
    .stButton > button {{
        background: {PAS_GREEN};
        color: white;
        border: none;
        border-radius: 10px;
        font-weight: 700;
    }}
    .stButton > button:hover {{
        background: {PAS_DARK};
    }}
    </style>
""", unsafe_allow_html=True)

st.markdown(f"""
<div style="text-align:center; margin-bottom:0;">
    <h1 style="color:{PAS_GREEN}; font-size:2.2rem; font-weight:900; margin-bottom:0;">KuliahMap Kedah</h1>
    <p style="color:#555; font-size:0.95rem;">Cari Kuliah & Ceramah di Seluruh Negeri Kedah</p>
</div>
""", unsafe_allow_html=True)

# Featured Event of the Day
featured = generate_featured(conn)
st.markdown(f"""
<div class="pas-hero">
    <h1>{featured['headline']}</h1>
    <div class="subhead">{featured['subhead']}</div>
    {f'<div class="ajakan">{featured["ajakan"]}</div>' if featured['ajakan'] else ''}
</div>
""", unsafe_allow_html=True)

c1, c2, c3 = st.columns([2, 1, 1])
with c1:
    if st.button("Segarkan", help="Jana semula pengumuman hari ini dengan AI"):
        del st.session_state.featured_data
        st.rerun()
with c2:
    st.metric("Jumlah Kuliah Hari Ini", featured["count"])

# Sidebar
with st.sidebar:
    st.markdown(f"<h3 style='color:{PAS_GREEN}'>Tapis Carian</h3>", unsafe_allow_html=True)
    district = st.selectbox("Daerah", ["Semua"] + DISTRICTS)
    ktype = st.selectbox("Jenis Kuliah", ["Semua"] + list(TYPE_LABELS.values()))
    time_filter = st.selectbox("Masa", ["Semua", "Hari Ini", "Minggu Ini", "Bulan Ini"])
    search = st.text_input("Cari ustaz, masjid, tajuk...")
    st.markdown("---")
    st.caption("Disediakan oleh [@PedotTTRG](https://t.me/PedotTTRG)")

# Kuliah list
st.subheader("Senarai Kuliah")
type_map_rev = {v:k for k,v in TYPE_LABELS.items()}
kuliah_list = get_kuliah(conn,
    district=district if district != "Semua" else None,
    ktype=type_map_rev.get(ktype) if ktype != "Semua" else None,
    time_filter={"Hari Ini":"today","Minggu Ini":"week","Bulan Ini":"month"}.get(time_filter),
    search=search if search else None)

if not kuliah_list:
    st.info("Tiada kuliah dijumpai untuk carian ini.")
else:
    for k in kuliah_list:
        st.markdown(f"""
        <div class="pas-card">
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div style="flex:1;">
                    <strong style="font-size:1.1rem; color:{PAS_DARK};">{k['title']}</strong><br>
                    <span style="color:#555;">{k['masjid_name']} | {k['ustaz_name']}</span><br>
                    <span style="color:#777; font-size:0.9rem;">{format_schedule(k)} | {format_time(k['time_start'])}{' - ' + format_time(k['time_end']) if k['time_end'] else ''}</span><br>
                    <span style="background:{PAS_GREEN}; color:white; padding:2px 10px; border-radius:8px; font-size:0.75rem; font-weight:700;">{TYPE_LABELS.get(k['kuliah_type'], k['kuliah_type'])}</span>
                </div>
                <div style="text-align:right;">
                    <button onclick="document.getElementById('detail_btn_{k['id']}').click()" style="background:{PAS_GREEN}; color:white; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Detail</button>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        detail_col = st.columns([0, 0, 0])
        if st.button("Lihat", key=f"btn_{k['id']}"):
            st.session_state.selected_kuliah = k["id"]
            st.rerun()
        st.markdown(f"<div style='display:none;'><button id='detail_btn_{k['id']}'></button></div>", unsafe_allow_html=True)

# Detail view
if "selected_kuliah" in st.session_state and st.session_state.selected_kuliah:
    st.markdown("---")
    st.subheader("Butiran Kuliah")
    k = get_kuliah_by_id(conn, st.session_state.selected_kuliah)
    if k:
        st.markdown(f"""
        <div style="background:white; border:2px solid {PAS_GREEN}; border-radius:14px; padding:1.5rem;">
            <span style="background:{PAS_GREEN}; color:white; padding:4px 14px; border-radius:10px; font-size:0.8rem; font-weight:700;">{TYPE_LABELS.get(k['kuliah_type'], k['kuliah_type'])}</span>
            <h3 style="color:{PAS_DARK}; margin-top:0.5rem;">{k['title']}</h3>
            <p><strong>{k['masjid_name']}</strong> ({k['district']})</p>
            <p>{k['ustaz_name']}</p>
            <p>{format_schedule(k)} | {format_time(k['time_start'])}{' - ' + format_time(k['time_end']) if k['time_end'] else ''}</p>
            <p style="font-style:italic; color:#666;">{k.get('description', '')}</p>
            {f'<small>{k["address"]}</small>' if k['address'] else ''}
        </div>
        """, unsafe_allow_html=True)

        waze_url = f"https://waze.com/ul?ll={k['latitude']},{k['longitude']}&navigate=yes"
        gmaps_url = f"https://www.google.com/maps/dir/?api=1&destination={k['latitude']},{k['longitude']}"

        col1, col2, col3 = st.columns(3)
        with col1:
            st.link_button("Buka Waze", waze_url, type="secondary")
        with col2:
            st.link_button("Google Maps", gmaps_url, type="secondary")
        with col3:
            share_text = f"{k['title']} oleh {k['ustaz_name']} di {k['masjid_name']}"
            wa_url = f"https://wa.me/?text={share_text.replace(' ', '%20')}"
            st.link_button("Kongsi WhatsApp", wa_url, type="secondary")

        if st.button("Kembali"):
            del st.session_state.selected_kuliah
            st.rerun()

# Submit form
st.markdown("---")
st.subheader("Hantar Jadual Kuliah")
st.caption("Tampal teks jadual kuliah — AI akan proses secara automatik")

with st.form("bulk_upload"):
    col1, col2 = st.columns(2)
    with col1:
        up_name = st.text_input("Nama (opsional)", placeholder="Abdullah")
    with col2:
        up_phone = st.text_input("Telefon *", placeholder="012-3456789")
    up_text = st.text_area(
        "Teks Jadual Kuliah *",
        height=200,
        placeholder="Tampal teks WhatsApp / poster di sini...\n\nContoh:\nMasjid Zahir, Alor Setar\n5 Mei 2026 - Ustaz Ahmad - Kuliah Maghrib\nKhamis - Ustazah Siti - Kuliah Muslimat"
    )
    st.caption(f"{len(up_text)} aksara")

    if st.form_submit_button("Hantar Jadual"):
        if not up_text.strip():
            st.error("Sila tampal teks jadual kuliah.")
        elif not validate_my_phone(up_phone):
            st.error("Sila masukkan nombor telefon Malaysia yang sah (cth: 012-3456789).")
        else:
            with st.spinner("AI sedang menganalisis teks..."):
                try:
                    events = groq_parse(up_text)
                    if not events:
                        st.error("Tiada jadual dapat diekstrak.")
                    else:
                        count = auto_insert_events(conn, events, up_phone.strip(), up_name.strip() or None)
                        if "featured_data" in st.session_state:
                            del st.session_state.featured_data
                        st.success(f"{count} jadual kuliah berjaya dimasukkan!")
                        st.rerun()
                except Exception as e:
                    msg = str(e)
                    if "invalid_api_key" in msg.lower() or "401" in msg:
                        st.error("Kunci API Groq tidak sah. Sila set GROQ_API_KEY.")
                    else:
                        st.error(f"Ralat: {msg}")

st.markdown("---")
st.caption("KuliahMap Kedah | Disediakan oleh [@PedotTTRG](https://t.me/PedotTTRG) | 2026")
