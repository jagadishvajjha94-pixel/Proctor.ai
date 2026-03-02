# Stability Plan: No Lag, No Server Crashes

Goal: Keep the assessment platform workable under load without lagging or crashing (Vercel free, Supabase free, Judge0 limits).

---

## 1. Risk Points

| Area | Risk | Impact |
|------|------|--------|
| **Autosave** | All users save at 90s → spike every 90s | Supabase rate limits, DB load |
| **Judge0** | Many runs × test cases = burst of API calls | Rate limit 429, timeout, cost |
| **Final submit** | Everyone submits at exam end | Supabase spike, timeouts |
| **Entry** | Everyone opens exam at start | Supabase auth + first read spike |
| **Frontend** | Heavy re-renders, timer drift | Tab freezes, bad UX |

---

## 2. Mitigations (Implemented)

### 2.1 Autosave (Supabase)

- **Jitter**: Autosave interval = 90s ± 15s per user so writes spread in time.
- **Skip when idle**: Only autosave if `mcq_answers` or `coding_answers` changed since last save.
- **One in-flight**: If a save is in progress, skip the next tick (no queue buildup).
- **Non-blocking**: Save runs in background; no await in render. Optional: one retry after 2s on failure.

### 2.2 Judge0 (Code runs)

- **Delay between test cases**: For each "Run", run test cases one-by-one with 400ms delay between calls to avoid burst rate limits.
- **Run button disabled** while running so user can’t double-click.
- **No parallel test cases** in one "Run" (sequential only) to cap concurrent Judge0 requests per user.
- **20 runs/question** unchanged; consider lowering to 10 for free tier if needed.

### 2.3 Final submit

- **Random delay**: Keep 0–20s (or extend to 0–30s) so submissions spread.
- **Retry**: On failure, retry up to 2 times with 2s then 4s backoff before showing error.
- **Single submit**: sessionStorage + ref guard so only one request per student.

### 2.4 Entry

- **Random 0–5 min** already spreads load; keep as is. Optional: reduce to 0–2 min if 5 min wait is too long.

### 2.5 Frontend

- **Timer**: Single `setInterval` for countdown; no per-component timers.
- **Memo**: Memoize `MCQSection` and `CodingSection` with `React.memo` to avoid unnecessary re-renders when parent state updates.
- **Draft restore**: Load submission once on mount; no polling.

---

## 3. Free-Tier Limits (Reference)

- **Vercel**: Static export = no server; only client hits Supabase/Judge0.
- **Supabase free**: ~500 concurrent connections, rate limits on API; avoid bursts.
- **Judge0 RapidAPI**: Check plan (e.g. 50 req/min); sequential runs + delay help.
- **Browser**: One tab per student; no background tabs pounding the APIs.

---

## 4. Optional (Later)

- **Autosave backoff**: If Supabase returns 429, double the next interval (e.g. 90s → 180s) once.
- **Judge0 queue**: Queue runs in a single worker (one run at a time per user) with small delay between runs.
- **Reduce max runs**: 10 instead of 20 per question to cut Judge0 usage.

---

## 5. Checklist

- [x] Autosave jitter (90s ± 15s) + skip when no changes + one in-flight save
- [x] Judge0 sequential test cases with 400ms delay between calls; "Running test 1/N..."
- [x] Final submit retry (2 retries, 2s then 4s backoff)
- [x] Timer single setInterval; React.memo on MCQSection and CodingSection
- [x] No polling; no realtime; single submission row
