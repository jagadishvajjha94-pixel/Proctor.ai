# Exam capacity: how many students at a time (without crashing)

## Main app (this repo — React + Express + PostgreSQL)

| Setup | Concurrent students (safe range) | Notes |
|-------|-----------------------------------|--------|
| **Production (PostgreSQL + pooling)** | **2,000–3,000+** | Per PRODUCTION.md and ARCHITECTURE.md. Use connection pooling; horizontal scaling if needed. |
| **Production (in-memory store)** | **Not recommended** | No DB = data lost on restart; single process. Use only for dev/demo with a handful of users. |
| **Development (in-memory)** | **~10–50** | Single Node process; no persistence. Fine for local testing only. |

### What limits or can crash it

1. **Rate limit (per IP)**  
   - **150 requests per minute per IP** (see `server/app.ts`: `MAX_REQUESTS = 150`, `WINDOW_MS = 60_000`).  
   - If many students share one IP (e.g. same lab/Wi‑Fi), they share this 150/min and can get **429 Too Many Requests** and the app will feel broken.  
   - **Fix:** Increase limit, or switch to per-user (or per-session) rate limiting (e.g. Redis), or both.

2. **Database connections**  
   - Without pooling or with a low connection limit, many concurrent students can exhaust connections and get errors.  
   - **Fix:** Use `?connection_limit=20&pool_timeout=30` in `DATABASE_URL` (see PRODUCTION.md) or an external pooler (e.g. PgBouncer).

3. **OpenAI (questions + code evaluation)**  
   - Question generation and code execution call the OpenAI API.  
   - Heavy concurrency can hit **OpenAI rate limits** (429 or throttling) and slow or fail requests.  
   - **Fix:** Queue question generation (e.g. Bull + Redis), or use a higher tier / batch APIs; for code run, consider a sandbox (Judge0/Piston) instead of LLM-only.

4. **Single Node process**  
   - One Express process has a finite CPU/memory.  
   - **Fix:** Run multiple instances behind a load balancer (stateless API); use DB or Redis for shared state.

### Summary numbers (main app)

- **Designed for:** 2,000–3,000+ concurrent students with PostgreSQL, pooling, and proper deployment.
- **Practical “without crashing”:** In the **hundreds to low thousands** per single process; **2,000–3,000+** with DB pooling and, if needed, more API instances and rate-limit/OpenAI handling as above.
- **Bottlenecks to fix first:** Per-IP rate limit (when many students share IP), DB connection pool, and OpenAI usage under peak load.

---

## Coding-assessment sub-app (Next.js + Supabase + Judge0)

Separate app in `coding-assessment/`. See `coding-assessment/docs/STABILITY-PLAN.md`.

| Environment | Rough safe concurrency | Limits |
|-------------|------------------------|--------|
| **Free tier (Vercel + Supabase + Judge0)** | **~50–200** | Supabase ~500 concurrent connections; Judge0 plan (e.g. 50 req/min); Vercel serverless limits. |
| **Paid / higher limits** | **500+** | Depends on Supabase and Judge0 plan and autosave/submit spread (jitter, retries). |

Mitigations already in place: autosave jitter (90s ± 15s), sequential Judge0 runs with delay, submit retries, no polling. For more students, increase Judge0/Supabase capacity and consider a queue for runs.

---

## Quick checklist (main app) for “many students at a time”

- [ ] **DATABASE_URL** set (PostgreSQL); **not** in-memory for production.
- [ ] **Connection pooling** in `DATABASE_URL` (e.g. `connection_limit=20&pool_timeout=30`).
- [ ] **Rate limit:** If many students share few IPs, increase `MAX_REQUESTS` or use per-user/per-session limiting (e.g. Redis).
- [ ] **OpenAI:** Monitor 429s; add queue or higher tier if you run 500+ concurrent exams.
- [ ] **Horizontal scaling:** Multiple API instances behind a load balancer for 2,000+ concurrent students.
