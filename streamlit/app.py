import streamlit as st
st.set_page_config(
    page_title="KuliahMap Kedah",
    page_icon="🕌",
    layout="wide",
    initial_sidebar_state="collapsed",
)

import sqlite3
import json
import os
from datetime import datetime, timedelta
from math import radians, sin, cos, sqrt, atan2

import folium
from streamlit_folium import st_folium

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
    # Seed masjid
    c.execute("SELECT COUNT(*) FROM masjid")
    if c.fetchone()[0] == 0:
        for m in SEED_MASJID:
            c.execute("INSERT INTO masjid (name,address,district,latitude,longitude,type) VALUES (?,?,?,?,?,?)",
                (m["name"],m["address"],m["district"],m["latitude"],m["longitude"],m["type"]))
    # Seed kuliah
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
    return conn.execute(sql, params).fetchall()

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
    return conn.execute(sql, params).fetchall()

def get_kuliah_by_id(conn, kid):
    return conn.execute("""SELECT kuliah.*, masjid.name as masjid_name, masjid.address, masjid.district,
        masjid.latitude, masjid.longitude, masjid.phone as masjid_phone
        FROM kuliah JOIN masjid ON kuliah.masjid_id=masjid.id
        WHERE kuliah.id=? AND kuliah.status='approved'""", (kid,)).fetchone()

def submit_kuliah(conn, data):
    c = conn.cursor()
    c.execute("SELECT id FROM masjid WHERE name=?", (data["masjid_name"],))
    row = c.fetchone()
    if row:
        masjid_id = row["id"]
    else:
        c.execute("INSERT INTO masjid (name,address,district,latitude,longitude,type) VALUES (?,?,?,?,?,'masjid')",
            (data["masjid_name"], data.get("address",""), data.get("district","Kulim"), data.get("latitude",0), data.get("longitude",0)))
        masjid_id = c.lastrowid
    c.execute("""INSERT INTO kuliah (masjid_id,title,ustaz_name,description,kuliah_type,date,time_start,time_end,recurrence,recurrence_day,contact_phone,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')""",
        (masjid_id, data["title"], data["ustaz_name"], data.get("description"), data["kuliah_type"],
         data.get("date"), data["time_start"], data.get("time_end"), data.get("recurrence","one_time"),
         data.get("recurrence_day"), data.get("contact_phone")))
    conn.commit()
    return c.lastrowid

def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dLat = radians(lat2 - lat1)
    dLng = radians(lng2 - lng1)
    a = sin(dLat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dLng/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

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

st.markdown("""
    <style>
    .main .block-container { padding-top: 1rem; padding-bottom: 1rem; }
    .st-emotion-cache-1jicfl2 { width: 100%; padding: 0; }
    </style>
""", unsafe_allow_html=True)

st.title("🕌 KuliahMap Kedah")
st.caption("Cari Kuliah & Ceramah Berdekatan Anda di Negeri Kedah")

# Sidebar
with st.sidebar:
    st.header("🔍 Tapis Carian")
    district = st.selectbox("Daerah", ["Semua"] + DISTRICTS)
    ktype = st.selectbox("Jenis Kuliah", ["Semua"] + list(TYPE_LABELS.values()))
    time_filter = st.selectbox("Masa", ["Semua", "Hari Ini", "Minggu Ini", "Bulan Ini"])
    search = st.text_input("Cari ustaz, masjid, tajuk...")
    
    st.markdown("---")
    st.header("📍 Lokasi Anda")
    use_gps = st.checkbox("Guna GPS (klik dua kali pada peta)")
    user_lat = st.number_input("Latitud", value=5.3650, format="%.6f")
    user_lng = st.number_input("Longitud", value=100.5556, format="%.6f")

# Map
st.subheader("🗺️ Peta Masjid & Surau")
center = [user_lat, user_lng] if use_gps else [5.3650, 100.5556]
zoom = 12 if use_gps else 10
m = folium.Map(location=center, zoom_start=zoom, tiles="OpenStreetMap")

masjid_list = get_masjid(conn, district=district if district != "Semua" else None, search=search if search else None)
for mjid in masjid_list:
    color = "green" if mjid["type"] == "masjid" else "blue"
    folium.Marker(
        [mjid["latitude"], mjid["longitude"]],
        popup=folium.Popup(f"<b>{mjid['name']}</b><br>{mjid['district']}<br><small>{mjid['address']}</small>", max_width=200),
        tooltip=mjid["name"],
        icon=folium.Icon(color=color, icon="mosque", prefix="fa")
    ).add_to(m)

if use_gps:
    folium.Marker([user_lat, user_lng], tooltip="Lokasi Anda", icon=folium.Icon(color="red", icon="user", prefix="fa")).add_to(m)

map_data = st_folium(m, width="100%", height=400, returned_objects=["last_clicked"])

# Handle map click
if map_data and map_data.get("last_clicked"):
    clicked = map_data["last_clicked"]
    user_lat = clicked["lat"]
    user_lng = clicked["lng"]
    st.success(f"📍 Lokasi dipilih: {user_lat:.4f}, {user_lng:.4f}")
    st.rerun()

# Kuliah list
st.subheader("📋 Senarai Kuliah")

type_map_rev = {v:k for k,v in TYPE_LABELS.items()}
kuliah_list = get_kuliah(conn,
    district=district if district != "Semua" else None,
    ktype=type_map_rev.get(ktype) if ktype != "Semua" else None,
    time_filter={"Hari Ini":"today","Minggu Ini":"week","Bulan Ini":"month"}.get(time_filter),
    search=search if search else None)

# Add distance if GPS
if use_gps and kuliah_list:
    kuliah_list = sorted([
        {**dict(k), "distance": round(haversine(user_lat, user_lng, k["latitude"], k["longitude"]), 2)}
        for k in kuliah_list
    ], key=lambda x: x["distance"])

if not kuliah_list:
    st.info("Tiada kuliah dijumpai untuk carian ini.")
else:
    for k in kuliah_list:
        with st.container():
            col1, col2 = st.columns([3, 1])
            with col1:
                st.markdown(f"**{k['title']}**  ")
                st.markdown(f"🕌 {k['masjid_name']} | 👤 {k['ustaz_name']}")
                st.markdown(f"📅 {format_schedule(k)} | ⏰ {format_time(k['time_start'])}{' - ' + format_time(k['time_end']) if k['time_end'] else ''}")
                st.markdown(f"🏷️ `{TYPE_LABELS.get(k['kuliah_type'], k['kuliah_type'])}`")
                if k.get("distance") is not None:
                    st.markdown(f"📏 **{k['distance']} km** dari lokasi anda")
            with col2:
                if st.button("Lihat Detail", key=f"btn_{k['id']}"):
                    st.session_state.selected_kuliah = k["id"]
                    st.rerun()
            st.divider()

# Detail view
if "selected_kuliah" in st.session_state and st.session_state.selected_kuliah:
    st.subheader("📖 Butiran Kuliah")
    k = get_kuliah_by_id(conn, st.session_state.selected_kuliah)
    if k:
        col1, col2 = st.columns([2, 1])
        with col1:
            st.markdown(f"### {k['title']}")
            st.markdown(f"🕌 **{k['masjid_name']}** ({k['district']})")
            st.markdown(f"👤 {k['ustaz_name']}")
            st.markdown(f"📅 {format_schedule(k)}")
            st.markdown(f"⏰ {format_time(k['time_start'])}{' - ' + format_time(k['time_end']) if k['time_end'] else ''}")
            st.markdown(f"🏷️ {TYPE_LABELS.get(k['kuliah_type'], k['kuliah_type'])}")
            if k["description"]:
                st.markdown(f"> {k['description']}")
            if k["address"]:
                st.caption(k["address"])
        with col2:
            dm = folium.Map(location=[k["latitude"], k["longitude"]], zoom_start=15, height=200)
            folium.Marker([k["latitude"], k["longitude"]], tooltip=k["masjid_name"]).add_to(dm)
            st_folium(dm, width=300, height=200, returned_objects=[])
            
            waze = f"https://waze.com/ul?ll={k['latitude']},{k['longitude']}&navigate=yes"
            gmaps = f"https://www.google.com/maps/dir/?api=1&destination={k['latitude']},{k['longitude']}"
            st.link_button("🗺️ Buka Waze", waze, type="secondary")
            st.link_button("📍 Google Maps", gmaps, type="secondary")
        
        share_text = f"{k['title']} oleh {k['ustaz_name']} di {k['masjid_name']}"
        wa = f"https://wa.me/?text={share_text.replace(' ', '%20')}"
        st.link_button("📤 Kongsi WhatsApp", wa, type="secondary")
        
        if st.button("🔙 Kembali"):
            del st.session_state.selected_kuliah
            st.rerun()

# Submit form
st.markdown("---")
with st.expander("📝 Hantar Jadual Kuliah Baru"):
    with st.form("submit_kuliah"):
        st.write("**Maklumat Masjid**")
        sm_masjid = st.text_input("Nama Masjid/Surau *", placeholder="cth: Masjid Zahir")
        sm_address = st.text_input("Alamat", placeholder="Jalan...")
        sm_district = st.selectbox("Daerah *", DISTRICTS)
        sm_lat = st.number_input("Latitud", value=0.0, format="%.6f")
        sm_lng = st.number_input("Longitud", value=0.0, format="%.6f")
        
        st.write("**Maklumat Kuliah**")
        sm_title = st.text_input("Tajuk Kuliah *", placeholder="cth: Tafsir Al-Quran")
        sm_ustaz = st.text_input("Nama Ustaz/Ustazah *", placeholder="cth: Ustaz Ahmad Dusuki")
        sm_desc = st.text_area("Penerangan", placeholder="Penerangan ringkas...")
        sm_type = st.selectbox("Jenis Kuliah *", list(TYPE_LABELS.values()))
        sm_date = st.date_input("Tarikh (jika satu kali)", value=None)
        c1, c2 = st.columns(2)
        with c1: sm_start = st.time_input("Masa Mula *", value=None)
        with c2: sm_end = st.time_input("Masa Tamat", value=None)
        sm_rec = st.selectbox("Ulangan *", ["Satu Kali","Mingguan","Bulanan"])
        sm_day = st.selectbox("Hari (jika mingguan)", [""] + list(DAY_LABELS.values())) if sm_rec == "Mingguan" else None
        sm_phone = st.text_input("No. Telefon", placeholder="012-3456789")
        
        submitted = st.form_submit_button("✅ Hantar")
        if submitted:
            if not all([sm_masjid, sm_title, sm_ustaz, sm_type, sm_start]):
                st.error("Sila lengkapkan semua medan wajib (*)")
            else:
                data = {
                    "masjid_name": sm_masjid, "address": sm_address, "district": sm_district,
                    "latitude": sm_lat, "longitude": sm_lng,
                    "title": sm_title, "ustaz_name": sm_ustaz, "description": sm_desc,
                    "kuliah_type": type_map_rev.get(sm_type, sm_type),
                    "date": sm_date.strftime("%Y-%m-%d") if sm_date else None,
                    "time_start": sm_start.strftime("%H:%M") if sm_start else "",
                    "time_end": sm_end.strftime("%H:%M") if sm_end else None,
                    "recurrence": {"Satu Kali":"one_time","Mingguan":"weekly","Bulanan":"monthly"}.get(sm_rec, "one_time"),
                    "recurrence_day": {v:k for k,v in DAY_LABELS.items()}.get(sm_day) if sm_day else None,
                    "contact_phone": sm_phone
                }
                submit_kuliah(conn, data)
                st.success("✅ Jadual kuliah berjaya dihantar untuk disemak!")

st.markdown("---")
st.caption("KuliahMap Kedah v2.0 (Streamlit) | Data oleh OpenStreetMap & Komuniti | © 2026")
