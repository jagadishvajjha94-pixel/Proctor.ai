# Production Deployment Guide

This app is configured for **3000+ concurrent students**. Follow these steps for production.

## 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required for production
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"
OPENAI_API_KEY="sk-..."
SESSION_SECRET="min-32-chars-random-string"  # openssl rand -base64 32
ADMIN_PASSWORD="your-secure-admin-password"
```

## 2. Database Setup

```bash
pnpm install
pnpm prisma migrate deploy   # or: npx prisma migrate dev (for first migration)
```

Create initial migration if needed:

```bash
npx prisma migrate dev --name init
```

If you already have a database and are updating: run a new migration for question uniqueness (no repeat before 1500 students, per-student no-repeat):

```bash
npx prisma migrate dev --name add_question_uniqueness
```

## 3. Connection Pooling (3000+ users)

Add to DATABASE_URL for high concurrency:

```
?connection_limit=20&pool_timeout=30
```

For PgBouncer or external pooling, use the pooler URL.

## 4. Run

```bash
pnpm build
pnpm start
```

## Design & Security Docs

See **docs/** for production design:

- **docs/ARCHITECTURE.md** – System architecture, two-phase × two attempts, scalability
- **docs/API_DESIGN.md** – REST API under `/api`
- **docs/AI_FLOWS.md** – Question generation (1500 reuse), evaluation, eligibility, interview
- **docs/SECURITY_STRATEGY.md** – Auth, proctoring (3/6/8 violations), anti-cheating
- **docs/DEPLOYMENT.md** – Env vars, DB, sandbox, Google Sheets, checklist

## Features for Scale

- **PostgreSQL** – Persistent storage, indexes on email, status, college, question hashes
- **Question uniqueness** – No repeat before 1500 students; same student never sees same question twice (`lib/constants.ts`: `QUESTION_REUSE_AFTER`)
- **Pagination** – Admin lists capped at 5000, paginated queries
- **Rate limiting** – 150 requests/min per IP on API routes
- **Signed sessions** – JWT with jose (HS256)
- **Prisma** – Connection pooling, singleton client
- **Google Sheets** – Optional append on export when `GOOGLE_SHEETS_ID` and `GOOGLE_SERVICE_ACCOUNT_KEY` are set (`lib/google-sheets.ts`)
