# Artha — Full Deployment Guide

This guide describes how to deploy the **Artha** monorepo from a fresh clone to production URLs.

---

## 1. Backend Deployment (Railway / Render / Docker)

### Option A: Deploy via Docker (Railway / Render)
1. Link your GitHub repository to Railway or Render.
2. Set the Root Directory to `/backend`.
3. Provision managed Postgres and Redis instances.
4. Set the following environment variables:
   ```env
   DATABASE_URL=postgresql://user:password@your-postgres-host:5432/grocery_db
   REDIS_URL=redis://your-redis-host:6379/0
   ANTHROPIC_API_KEY=your_anthropic_api_key
   DEMO_MODE=1  # Set to 1 for live demo stability without Playwright IP blocks
   ```
5. Railway/Render will automatically build using `/backend/Dockerfile`.

### Option B: Local Docker Dev Container
```bash
# From repository root
docker-compose up -d --build
```
Backend will be available at `http://localhost:8000`.

---

## 2. Web Frontend Deployment (Vercel)

1. Import the repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `web`.
3. Configure Environment Variables:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-production-url.up.railway.app
   ```
4. Deploy. Vercel will run `npm run build` and output the live Next.js PWA at `https://artha-web.vercel.app`.

---

## 3. Chrome Extension Installation (`/extension`)

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in upper right).
3. Click **Load unpacked**.
4. Select the `/extension` directory from the cloned repository.
5. Confirm the Artha Extension icon appears in your toolbar.

---

## 4. Verification Checklist

- [x] `GET https://your-backend-url/` returns `{"status":"ok"}`.
- [x] Next.js frontend loads at `https://your-web-url/`.
- [x] Submitting a list triggers live comparison progress.
- [x] Clicking **"Build My Carts"** triggers the Chrome Extension auto-cart loop.
