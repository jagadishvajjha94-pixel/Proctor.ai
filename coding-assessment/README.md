# Internal Coding Assessment Platform

Production-ready, static-export compatible assessment app: **Next.js (App Router)**, **Supabase**, **Judge0**, deployable on **Vercel Free**.

## Architecture (strict)

- **No SSR on exam page** – exam runs entirely in the client (Client Components).
- **No Supabase Realtime** – no subscriptions or live updates.
- **No per-question rows** – one JSON for MCQ answers, one for coding answers; **one submission row per student per exam**.
- **Autosave every 90s** – single row update.
- **Random 0–20s delay** before final submit (reduces thundering herd).
- **20 runs per question** for code execution; frontend calls Judge0 directly; only final evaluated result is saved.
- **Entry throttling** – random 0–5 min delay before exam content is shown (spreads load).

## Tech stack

- Next.js 14 (App Router), `output: 'export'` for static export.
- React 18 (Client Components for exam).
- Supabase (free tier): auth + single submission row per student/exam.
- Judge0 API (RapidAPI or self-hosted) for code execution from the browser.

## Setup

1. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - Run `supabase/schema.sql` in the SQL Editor (creates `students`, `exams`, `submissions`, RLS, index).
   - Create Auth users for each student: **id = student.id**, **email = student.email**, **password = roll_number** (use Dashboard or Admin API). This makes login (email + roll number) and RLS work.

2. **Judge0**
   - Use [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce) or self-hosted Judge0.
   - Set `NEXT_PUBLIC_JUDGE0_BASE_URL` and `NEXT_PUBLIC_JUDGE0_API_KEY` in `.env.local`.

3. **Env**
   - Copy `.env.example` to `.env.local` and fill in Supabase URL/anon key, Judge0 URL/key, and `NEXT_PUBLIC_EXAM_ID` (UUID from `exams` table).

4. **Build & run**
   - `pnpm install` then `pnpm build` (static export). For local dev: `pnpm dev`.

## Folder structure

```
src/
  app/
    login/     # Email + roll number login
    exam/      # Client-only exam (MCQ + coding, timer, autosave)
    result/    # Show total score
  components/
    MCQSection.jsx
    CodingSection.jsx
    Timer.jsx
  utils/
    supabaseClient.js
    judge0.js
  data/
    mcqQuestions.json
    codingQuestions.json
```

## Security

- **RLS** on `submissions`: students can only SELECT/INSERT/UPDATE their own row (`auth.uid() = student_id`).
- **RLS** on `students`: SELECT only where `id = auth.uid()`.
- No service role key in the frontend; Judge0 key is public (rate-limit via Judge0/RapidAPI).

## Scaling / free-tier

- **Single submission row** and JSON columns avoid N+1 and keep writes to one row per student per exam.
- **Autosave 90s** limits write throughput; **random final delay** spreads submit spike.
- **Entry throttling** (0–5 min) spreads initial load.
- **No polling, no live dashboard, no leaderboard** – no background or realtime load.
- Static export runs on CDN; only Supabase and Judge0 are hit from the client.

## Submission payload

Final save shape:

```json
{
  "mcq_answers": { "mcq1": 1, "mcq2": 0 },
  "coding_answers": {
    "coding1": { "code": "...", "language": "python", "score": 20 },
    "coding2": { "code": "...", "language": "cpp", "score": 15 }
  }
}
```

`total_score` = **MCQ score** + **coding score**. MCQ score is computed at submit time from `mcq_answers` vs `correctIndex` in `mcqQuestions.json`; each question can have a `maxScore` (default 10). Coding score is the sum of `coding_answers[*].score`.
