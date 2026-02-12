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
