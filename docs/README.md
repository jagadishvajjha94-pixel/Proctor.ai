# Production-Ready AI Placement Platform — Design & Deliverables

This folder contains the design and strategy documents for the AI-powered interview, coding assessment, and online proctoring application for campus placements.

## Deliverables

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, components, scalability, test structure (two-phase × two attempts). |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | PostgreSQL schema (Prisma), entities, indexes, concurrency. |
| [API_DESIGN.md](./API_DESIGN.md) | REST API under `/api`: auth, session, questions, code, proctoring, interview, eligibility, sheets, admin. |
| [AI_FLOWS.md](./AI_FLOWS.md) | AI logic: question generation (no repeat before 1500), code evaluation, interview, eligibility, plagiarism. |
| [SECURITY_STRATEGY.md](./SECURITY_STRATEGY.md) | Security & anti-cheating: auth, API, proctoring, violations (3/6/8), sandbox, optional browser/keystroke. |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Cloud-ready deployment: env vars, DB, API, frontend, sandbox, Google Sheets, checklist. |

## Requirements Coverage

- **Two-phase test × two attempts:** Phase 1 (screening), Phase 2 (advanced); conducted twice per student; improvement, consistency, integrity analyzed.
- **AI question generation:** Blueprints, randomized constraints, language-specific; no repeat before 1500 students; same student never sees same question twice (hash + `StudentQuestionHash`).
- **Proctoring:** Camera, violations (multiple faces, looking away, phone, talking, tab switch, camera off, inactivity); warnings at 3 and 6; at 8: auto-submit, close session, lock account, integrity failure; Google Sheet updated.
- **Code evaluation:** Correctness, complexity, edge cases, originality; secure sandbox in production (no local execution).
- **AI interview:** During test (code follow-up) and post-test (technical + HR mock).
- **Eligibility:** AI decision (Eligible / Borderline / Not Eligible); explainable, logged, auditable.
- **Google Sheets:** Append/export with student ID, attempt, phase scores, violations, integrity, eligibility.
- **Security:** Encrypted APIs, server-side validation only, one session per student, JWT auth, optional browser/keystroke and plagiarism checks.

## Tech Stack

- **Frontend:** React (Vite), React Router.
- **Backend:** Node.js, Express.
- **AI:** OpenAI / LLM (questions, evaluation, interview, eligibility).
- **Database:** PostgreSQL (Prisma).
- **Auth:** JWT (e.g. httpOnly cookie).
- **Code execution:** Secure sandbox (Piston/Judge0/containers) in production.
- **Sheets:** Google Sheets API (service account).

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [DEPLOYMENT.md](./DEPLOYMENT.md) for full stack and deployment details.
