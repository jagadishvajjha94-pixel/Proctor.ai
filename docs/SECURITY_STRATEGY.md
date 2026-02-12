# Security & Anti-Cheating Strategy

Production-oriented security and anti-tampering measures. **No sensitive business logic on the client;** all validation and decisions server-side.

---

## 1. Authentication & Session

- **JWT** in httpOnly cookie (or secure storage); short-lived access token; refresh if needed.
- **One active session per student:** Starting a new test creates a new session; previous in-progress session can be closed or marked abandoned by policy.
- **Role-based access:** Student vs admin; admin routes check role server-side.
- **Logout:** Server invalidates/clears session; client clears cookie.

---

## 2. API Security

- **Encrypted transport:** TLS only (HTTPS). Enforce HSTS in production.
- **Server-side validation:** All inputs (body, query, params) validated with Zod (or equivalent); reject invalid payloads.
- **Rate limiting:** Per IP and per user on auth, question generation, code execution, and proctoring. Prevents brute force and abuse.
- **CORS:** Restrict to allowed origins; no wildcard in production.
- **CSP:** Content-Security-Policy headers to limit script and resource sources.
- **No sensitive logic on client:** Question generation, evaluation, eligibility, and violation handling are server-only; client cannot override.

---

## 3. Proctoring & Violations

- **Violations sent to server only:** Client detects (camera, tab, etc.) and POSTs to `/api/proctoring/violation`. Server logs and applies rules.
- **Warnings:** 3 violations → warning; 6 → final warning; **8 → auto-submit, close session, lock account**, mark integrity failure.
- **Integrity score:** Decremented by severity (low/medium/high); used in eligibility.
- **Screenshots:** Optional; stored server-side; not trust-critical for lock (count is).
- **Camera off / multiple faces / phone / talking / tab switch:** All mapped to severity; server enforces lock at 8.

---

## 4. Anti-Cheating Measures

- **One session per device/student:** Enforced by server (one in_progress session per student).
- **Question uniqueness:** Hash + 1500-use rule and per-student no-repeat; server only.
- **Code execution in sandbox only:** No local execution; no access to host or network from candidate code.
- **Browser integrity (optional):** Fingerprint or integrity checks can be sent with requests; server may log or flag anomalies. Not a substitute for proctoring.
- **Keystroke dynamics (optional):** Can be collected and sent for analysis; server-side only; used for anomaly detection if implemented.
- **Code plagiarism detection:** Optional server-side step (e.g. normalize + compare with other submissions); can feed into originality score or alerts.

---

## 5. Data & Privacy

- **Passwords:** Hashed (e.g. bcrypt) before store; never logged or returned.
- **PII:** Access only for authorized roles; audit log for admin actions.
- **Google Sheets:** Service account with minimal scope; credentials in env only; no client exposure.

---

## 6. Operational Security

- **Secrets:** All in environment variables (or secret manager); never in code or client.
- **Dependencies:** Regular updates; audit for known vulnerabilities.
- **Logs:** No passwords or tokens; log only what is needed for audit and debugging.
