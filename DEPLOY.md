# KuliahMap Kedah — Full-Stack Docker Deployment Guide

## Quick Start (Local Docker)

```bash
# 1. Build and start
docker-compose up --build -d

# 2. Open browser
open http://localhost:3001
```

## Production Deployment Options

### Option 1: Fly.io (Recommended — Free tier available)
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. `fly launch` (creates app + provisions database volume)
3. `fly deploy`
4. App live at `https://kuliahmap-kedah.fly.dev`

### Option 2: Railway (Free tier)
1. Connect GitHub repo to Railway
2. Railway auto-detects Dockerfile
3. Add `DATABASE_URL` and `JWT_SECRET` env vars
4. Deploy

### Option 3: Render (Free tier)
1. Create Web Service from GitHub repo
2. Select "Docker" environment
3. Set env vars: `JWT_SECRET`, `ADMIN_PASSWORD`
4. Deploy

### Option 4: Self-Hosted (VPS / Cloud Server)
```bash
git clone https://github.com/YOUR_USERNAME/kuliahmap-kedah.git
cd kuliahmap-kedah
docker-compose up -d
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `DATABASE_URL` | No | ./data/kuliahmap.db | SQLite path |
| `JWT_SECRET` | Yes (prod) | random | JWT signing key |
| `ADMIN_USERNAME` | No | admin | Admin login |
| `ADMIN_PASSWORD` | No | admin123 | Admin password |

## GitHub Actions CI/CD

The `.github/workflows/docker.yml` automatically builds and pushes Docker image to GitHub Container Registry on every push to main.

## Health Check

```bash
curl http://localhost:3001/api/health
# Expected: {"status":"OK","version":"2.0.0"}
```

## Data Persistence

SQLite database is stored in a Docker volume (`kuliahmap-data`). It persists across container restarts.

## Admin Access

- **URL:** `https://YOUR_APP_URL/admin`
- **Username:** `admin`
- **Password:** Set via `ADMIN_PASSWORD` env var

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Leaflet
- **Backend:** Node.js + Express + SQLite
- **Container:** Docker + docker-compose
- **CI/CD:** GitHub Actions
