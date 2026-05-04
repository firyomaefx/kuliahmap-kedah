# KuliahMap Kedah

> Cari kuliah, ceramah & tazkirah di masjid/surau seluruh Negeri Kedah — peta interaktif, AI import, dan kemas kini secara langsung.

## Ciri-Ciri

- **Peta Interaktif** — Leaflet map dengan GPS auto-detect dan carian daerah
- **Jadual Kuliah** — 191 masjid, 199 kuliah terkini merangkumi 12 daerah
- **AI Import** — Tampal teks WhatsApp/Poster → Groq LLM (Llama 3.3 70B) ekstrak jadual secara automatik
- **Enjin Berulang** — `rrule` kira `next_date` + `is_today` untuk kuliah mingguan/bulanan
- **WebSocket Langsung** — Kemas kini sebenar apabila kuliah diluluskan/dipadam
- **Cron Geocoding** — Geocode masjid koordinat 0,0 setiap 6 jam; bersihkan hantaran lapuk harian
- **Admin Panel** — Luluskan/tolak hantaran, CRUD masjid, statistik
- **PWA Ready** —_manifest + service worker
- **Docker** —docker-compose, Fly.io, Railway, Render

## Tangkapan Layar

| Laman Utama | Import AI | Admin |
|---|---|---|
| Peta + senarai kuliah | Teks → jadual berstruktur | Lulus/tolak hantaran |

## Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Leaflet, Lucide Icons |
| Backend | Node.js, Express, SQLite3 |
| AI | Groq SDK (Llama 3.3 70B Versatile) |
| Recurrence | rrule.js |
| Real-time | ws (WebSocket) |
| Cron | node-cron |
| Deploy | Docker, Fly.io |

## Permulaan Pantas

### Lokal (Tanpa Docker)

```bash
# Backend
cd backend
cp .env.example .env   # edit GROQ_API_KEY
npm install
npm run dev

# Frontend (terminal lain)
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173 (frontend) atau http://localhost:3001 (API).

### Docker

```bash
docker-compose up --build -d
# Buka http://localhost:3001
```

### Fly.io

```bash
fly launch
fly secrets set GROQ_API_KEY=gsk_... JWT_SECRET=your-secret ADMIN_PASSWORD=your-pass
fly deploy
```

## Pemboleh Ubah Persekitaran

| Variable | Diperlukan | Lalai | Penerangan |
|----------|------------|-------|-------------|
| `PORT` | Tidak | 3001 | Port pelayan |
| `DATABASE_URL` | Tidak | ./data/kuliahmap.db | Laluan SQLite |
| `JWT_SECRET` | Ya (prod) | — | Kunci penandatangan JWT |
| `ADMIN_USERNAME` | Tidak | admin | Nama pengguna admin |
| `ADMIN_PASSWORD` | Tidak | admin123 | Kata laluan admin |
| `GROQ_API_KEY` | Ya (AI import) | — | Kunci API Groq untuk penghurai AI |

## Struktur Projek

```
kuliahmap-kedah/
├── backend/
│   ├── src/
│   │   ├── server.js        # Express API + WebSocket + cron
│   │   ├── db.js             # SQLite skema & benih data
│   │   ├── recurrence.js     # rrule enjin pengiraan tarikh
│   │   ├── websocket.js     # WSS pelayan + siaran
│   │   └── cron.js           # Geocode cron + pembersihan
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/            # Home, ImportKuliah, SubmitKuliah, Admin...
│   │   ├── components/       # Layout, nav
│   │   ├── hooks/            # useWebSocket
│   │   ├── api.js            # Axios instance
│   │   └── App.jsx           # Routes + auth context
│   ├── package.json
│   └── vite.config.js
├── scripts/                  # Data import & geocoding scripts
├── streamlit/                # Versi Python/Streamlit
├── Dockerfile
├── docker-compose.yml
├── fly.toml
└── DEPLOY.md
```

## API Endpoints

| Kaedah | Laluan | Penerangan |
|--------|--------|-------------|
| GET | `/api/masjid` | Senarai masjid (tapis daerah/carian) |
| GET | `/api/kuliah` | Senarai kuliah (tapis daerah/jenis/masa) |
| GET | `/api/kuliah/:id` | Butiran satu kuliah |
| POST | `/api/kuliah/submit` | Hantar kuliah baru |
| POST | `/api/events/parse` | AI penghurai teks jadual (Groq) |
| POST | `/api/events/bulk` | Import pukal (admin) |
| GET | `/api/districts` | Senarai 12 daerah Kedah |
| GET | `/api/geocode` | Nominatim proksi geokod |
| POST | `/api/auth/login` | Log masuk pengguna |
| POST | `/api/auth/register` | Daftar pengguna |
| GET | `/api/admin/submissions` | Hantaran tertunggak (admin) |
| PUT | `/api/admin/submissions/:id` | Lulus/tolak (admin) |
| GET | `/api/admin/stats` | Statistik papan pemuka |
| GET | `/api/health` | Semakan kesihatan |
| WS | `/ws` | Langsung kemas kini |

## Lesen

MIT