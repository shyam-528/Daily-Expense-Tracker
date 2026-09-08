# Deployment Guide

Deploy the **frontend** to Vercel or Netlify and the **backend** to Render (or Railway/Fly.io). SQLite writes to a file, so choose a provider with a persistent disk — or the data resets on redeploy (backups via Settings → Backup).

## Backend → Render

1. Push the repo to GitHub.
2. On [render.com](https://render.com) → **New → Web Service** → connect the repo.
3. Settings:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
   - **Env:** Node ≥ 23.4 (set `NODE_VERSION=23` if needed)
4. Environment variables:
   - `JWT_SECRET` — long random string (required!)
   - `JWT_EXPIRES_IN=7d`
   - `CLIENT_ORIGIN=https://your-frontend.vercel.app`
   - `NODE_ENV=production`
5. (Optional but recommended) **Add a persistent disk** mounted at `/opt/render/project/src/backend/data` (or wherever `DB_PATH` points) so the SQLite file survives restarts.
6. Note the API URL, e.g. `https://expense-tracker-api.onrender.com`.

## Frontend → Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
2. Settings:
   - **Root directory:** `frontend`
   - Framework preset: **Vite** (auto-detected)
   - Build: `npm run build` · Output: `dist`
3. Environment variable: `VITE_API_URL=https://expense-tracker-api.onrender.com/api`
4. Deploy. Set the backend `CLIENT_ORIGIN` to the final Vercel URL (comma-separate multiple origins).

## Frontend → Netlify (alternative)

1. [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
2. Base directory `frontend`, build `npm run build`, publish `dist`.
3. Add env var `VITE_API_URL` as above.
4. The included `netlify.toml` redirects all routes to `index.html` (SPA routing).

## Post-deploy checklist

- [ ] Update `CLIENT_ORIGIN` on the backend to the exact frontend URL (no trailing slash)
- [ ] Redeploy backend after changing env vars
- [ ] Register a real account (demo seed only runs locally)
- [ ] Install as PWA from the browser (Install app…)
- [ ] Test login, add expense, CSV export, backup/restore

## Data persistence & backups

Render's free tier has an **ephemeral filesystem** — the SQLite file is wiped on every deploy/restart. Options:

1. **Paid persistent disk** (Render) — attach and set `DB_PATH` to the mount.
2. **Scheduled backups** — from the app: Settings → Backup (JSON) regularly, or cron `curl` the `/expenses/export` CSV.
3. **Switch to Postgres** later — the schema maps 1:1 if you outgrow SQLite.

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs both test suites on every push/PR:
- backend: `npm install && npm test` (Jest)
- frontend: `npm install && npm run test` (Vitest) + `npm run build`
