# Deployment — Cloud-Ready Setup

Production deployment for thousands of concurrent students. Assume stateless API, external PostgreSQL, and optional Redis.

---

## 1. Environment Variables

- **DATABASE_URL** — PostgreSQL connection string (required for production).
- **SESSION_SECRET** — Strong secret for JWT signing.
- **OPENAI_API_KEY** — (or equivalent) for AI features.
- **NODE_ENV=production**
- **PORT** — API server port (default 5000).
- **GOOGLE_SHEETS_ID** — Sheet ID for export (optional).
- **GOOGLE_SERVICE_ACCOUNT_KEY** — JSON key for Sheets API (optional).
- **CORS_ORIGIN** — Allowed frontend origin(s).
- **RATE_LIMIT_MAX** — Max requests per window (optional).

See `.env.example` for full list.

---

## 2. Database

- **PostgreSQL** recommended (e.g. managed: RDS, Cloud SQL, Neon).
- Run migrations: `npx prisma migrate deploy`.
- Connection pooling via Prisma; for very high load consider read replicas for report/read paths.

---

## 3. API Server (Node.js)

- Build: ensure TypeScript is compiled (e.g. `tsc` or `tsx` in production).
- Run: `node dist/server/index.js` or `tsx server/index.ts` behind process manager (PM2, systemd).
- **Horizontal scaling:** Multiple instances behind load balancer; no in-memory session store (use DB or Redis if needed).
- **Health check:** Expose `/health` or similar for LB.

---

## 4. Frontend (React/Vite)

- Build: `pnpm build` (or `npm run build`).
- Serve static assets via CDN or same domain; API proxy or CORS to API origin.
- Ensure `VITE_API_URL` or proxy points to production API.

---

## 5. Code Execution Sandbox

- In production, **do not** rely on LLM-only code execution. Use:
  - **Piston** / **Judge0** (or similar) in Docker/VM, or
  - Isolated container per run (e.g. Kubernetes job with resource limits).
- Network and filesystem restricted; time and memory limits enforced.

---

## 6. Google Sheets

- Service account with Sheets API enabled; share target sheet with service account email.
- On export: append or update rows (student ID, attempt, phase scores, violations, integrity, eligibility). Use batch updates and optional queue to avoid blocking API.

---

## 7. Proctoring at Scale

- Client sends violation events to API; server only stores and applies 3/6/8 rules.
- No server-side video processing required for base design; optional ML service can consume stored screenshots later.

---

## 8. Checklist

- [ ] DATABASE_URL set; migrations deployed.
- [ ] SESSION_SECRET and OPENAI_API_KEY set.
- [ ] HTTPS and HSTS enabled.
- [ ] CORS and CSP configured.
- [ ] Rate limiting enabled.
- [ ] Code execution runs in sandbox only.
- [ ] Google Sheets env vars set if using export.
- [ ] Logging and monitoring in place (errors, latency, violation counts).
