# Dev server setup

## 1. Install dependencies

In the project root, run and **wait for it to finish** (can take 2–3 minutes):

```bash
pnpm install
```

If you see **"Lock compromised"** or install fails:

- Delete only `pnpm-lock.yaml` (leave `node_modules` as is).
- Run `pnpm install` again.

## 2. Start the dev server

**Option A – One command (recommended)**

```bash
pnpm run dev
```

This starts both the Vite app (port 3000) and the API server (port 5000).

**Option B – Two terminals**

If `pnpm run dev` fails (e.g. missing `concurrently`):

- **Terminal 1 – API server**
  ```bash
  pnpm run dev:server
  ```
  Wait until you see: `Server running on http://localhost:5000`

- **Terminal 2 – Frontend**
  ```bash
  pnpm run dev:client
  ```
  Wait until you see: `Local: http://localhost:3000/`

## 3. Open the app

In your browser go to: **http://localhost:3000**

The frontend will call the API at `/api`; Vite proxies those requests to the server on port 5000.

## 4. Optional features (AI Interview & Proctoring)

The app is focused on **questions and code** by default. AI Mock Interview and Proctoring are **removable** and off unless you enable them (e.g. for future upgrades).

To re-enable:

1. **Server** (in `.env`):
   - `ENABLE_INTERVIEW=true` — mount `/api/interview` routes
   - `ENABLE_PROCTORING=true` — mount `/api/proctoring` routes

2. **Frontend** (in `.env`, prefixed with `VITE_` so Vite embeds them at build time):
   - `VITE_ENABLE_INTERVIEW=true` — show Interview route and dashboard card
   - `VITE_ENABLE_PROCTORING=true` — show camera panel and violation handling in assessment

Restart both the API server and the Vite dev server after changing env.
