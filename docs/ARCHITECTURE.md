# System Architecture — AI-Powered Campus Placement Platform

## 1. Application Overview

Production-ready web platform for:
- **AI-driven technical interviews** (during and post-assessment)
- **Two-phase coding assessments** (Phase 1: Screening, Phase 2: Advanced), run **twice per student**
- **Dynamic AI-generated questions** (no static banks; uniqueness enforced per 1500 students)
- **AI-based camera proctoring** with violation logging and account lock
- **Automated code evaluation** (correctness, complexity, edge cases, originality)
- **Google Sheets integration** for live score and eligibility updates
- **AI eligibility engine** (Eligible / Borderline / Not Eligible) with explainable, auditable decisions

Designed for **thousands of concurrent students**, institutional use, and strong anti-cheating guarantees.

---

## 2. High-Level Architecture

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                        CDN / WAF                             │
                    └─────────────────────────────┬───────────────────────────────┘
                                                  │
    ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
    │                                             │                                                │
    │  ┌──────────────────────┐    ┌─────────────▼─────────────┐    ┌──────────────────────┐   │
    │  │   React SPA (Vite)    │    │   API Gateway / Load       │    │   Admin / Reports    │   │
    │  │   - Auth (JWT)        │◄──►│   Balancer                 │◄──►│   (same API)         │   │
    │  │   - Assessment UI     │    │   - TLS termination        │    │                      │   │
    │  │   - Proctoring client │    │   - Rate limiting          │    └──────────────────────┘   │
    │  │   - Code editor       │    └─────────────┬─────────────┘                               │
    │  └──────────────────────┘                  │                                              │
    │                                             │                                              │
    │  ┌─────────────────────────────────────────▼─────────────────────────────────────────┐   │
    │  │                    Node.js / Express API (stateless)                                 │   │
    │  │  /api/auth  /api/session  /api/questions  /api/code  /api/interview                 │   │
    │  │  /api/proctoring  /api/eligibility  /api/sheets  /api/admin                         │   │
    │  └──────┬──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┘   │
    │         │              │              │              │              │                      │
    │         ▼              ▼              ▼              ▼              ▼                      │
    │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐            │
    │  │PostgreSQL│   │ OpenAI   │   │ Sandbox  │   │ Google   │   │ Redis (opt.) │            │
    │  │(Prisma)  │   │ / LLM    │   │ (code    │   │ Sheets   │   │ rate-limit   │            │
    │  │          │   │          │   │ run)     │   │ API      │   │ session      │            │
    │  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────────┘            │
    │                                                                                           │
    └───────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend:** React (Vite), client-side routing, JWT in httpOnly cookie or secure storage.
- **Backend:** Node.js + Express, stateless; horizontal scaling behind a load balancer.
- **Data:** PostgreSQL (Prisma ORM); optional Redis for rate limit and session stickiness.
- **AI:** OpenAI (or configurable LLM) for questions, evaluation, eligibility, interview.
- **Code execution:** In production, use a **secure sandbox** (e.g. Piston, Judge0, or container-based runners); no local execution.
- **Proctoring:** Browser media + client-side detection; violations sent to server; server-side logging and lock logic.

---

## 3. Test Structure (Two-Phase × Two Attempts)

| Attempt | Phase 1 (Screening)        | Phase 2 (Advanced)           |
|--------|----------------------------|------------------------------|
| **1**  | 3 questions, fundamentals | 3 questions, optimization   |
| **2**  | 3 questions, fundamentals | 3 questions, optimization   |

- **Phase 1:** Fundamentals, logic, language-specific; student selects language (C, C++, Java, Python, JavaScript).
- **Phase 2:** Real-world, optimization, edge cases; AI follow-up on submitted code.
- **Twice per student:** Attempt 1 (Phase 1 → Phase 2) then Attempt 2 (Phase 1 → Phase 2). System analyzes improvement, consistency, and integrity across attempts.

---

## 4. Scalability Assumptions

- **Concurrent users:** 2000+ students; API stateless, DB connection pooling (Prisma), read replicas for reporting.
- **Question generation:** Per-request LLM calls; consider queue (e.g. Bull + Redis) for peak load.
- **Code execution:** Sandbox pool; queue if using container-per-run.
- **Proctoring:** Client sends violations; server only stores and applies rules (3 / 6 / 8 violations).
- **Sheets:** Async write or queue to avoid blocking; batch updates where possible.

---

## 5. Component Responsibilities

| Component        | Responsibility |
|-----------------|----------------|
| **Auth**        | Login (student/admin), JWT issue/verify, session binding. |
| **Session**     | Start/submit test, advance phase/attempt, one active session per student. |
| **Questions**   | AI generation from blueprints, hash + 1500-use rule, no repeat for same student. |
| **Code**        | Run in sandbox (or LLM-based eval in dev), return test results + code quality. |
| **Proctoring**  | Accept violation events, update session/student, enforce 3/6/8 and lock. |
| **Eligibility** | AI decision from results + violations + consistency; store and optionally sync Sheets. |
| **Sheets**      | Export/append rows (student, scores, violations, integrity, eligibility). |
| **Interview**   | AI chat (during test: code follow-up; post-test: technical + HR mock). |

---

## 6. Security Posture (Summary)

- **Auth:** JWT in httpOnly cookie; no sensitive logic on client.
- **APIs:** Server-side validation only; rate limiting; CORS and CSP.
- **Proctoring:** Violations and lock logic only on server; client cannot bypass.
- **Code run:** In sandbox only; no direct host access.
- **Anti-cheat:** One session per device/student; integrity score; optional browser/keystroke signals (see SECURITY_STRATEGY.md).

Detailed security and anti-cheating measures are in **docs/SECURITY_STRATEGY.md**.
