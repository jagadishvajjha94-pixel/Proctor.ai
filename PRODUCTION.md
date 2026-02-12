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

## 5. Vercel Deployment (pnpm install exit 236)

If `pnpm install` fails with exit 236 on Vercel, try:

1. **Node 20** – Set in Vercel Project Settings → General → Node.js Version: **20.x** (or use `engines.node` in package.json).
2. **ENABLE_EXPERIMENTAL_COREPACK** – In Vercel → Settings → **Environment Variables**, add (enable for Production, Preview, and **Build**):
   - Name: `ENABLE_EXPERIMENTAL_COREPACK`
   - Value: `1`
   - Redeploy. This fixes pnpm install 236 for many projects.

3. **Already applied in this repo**: `corepack enable pnpm`, `--ignore-scripts`, `--no-optional`, `pdf-parse` as optionalDependency, Node 20 in engines.

4. **If exit 236 still happens** – Force npm on Vercel: in Vercel → Project → **Settings** → **General** → **Build & Development** → **Install Command**, set to:
   ```bash
   npm install --legacy-peer-deps --ignore-scripts
   ```
   Then add `package-lock.json` to the repo (locally run `npm install --package-lock-only --legacy-peer-deps`, commit and push). Vercel will then use npm instead of pnpm.

## 6. Vercel deployment checklist (avoid build/runtime errors)

1. **Environment variables** – In Vercel → Project → Settings → Environment Variables, add (and enable for **Production**, **Preview**, and **Build**):
   - `DATABASE_URL` – Your PostgreSQL connection string (required for production DB).
   - `OPENAI_API_KEY` – For question generation.
   - `SESSION_SECRET` – e.g. `openssl rand -base64 32`.
   - `ADMIN_PASSWORD` – Admin login.

2. **Node version** – In Vercel → Settings → General → Node.js Version, set **20.x** (or leave default; `package.json` has `engines.node`).

3. **Build command** – Leave as `pnpm run build` (runs `prisma generate && next build`). No need to change unless you use a custom command.

4. **If build fails** – Check the failing step in the Vercel build log:
   - **Install (exit 236)** → See section 5 above (Node 20, ENABLE_EXPERIMENTAL_COREPACK, `--ignore-scripts`).
   - **Prisma / DATABASE_URL** → Ensure `DATABASE_URL` is set and enabled for **Build**.
   - **Next.js build** → Ensure all env vars above are set; check for TypeScript or lint errors locally with `pnpm build`.

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
