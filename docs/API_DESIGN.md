# API Design

REST-style API under `/api`. All mutation and business logic are server-side. Auth via cookie (JWT) or `Authorization` header.

---

## Authentication

- **POST /api/auth/login**  
  Body: `{ email, password }`. Returns session cookie (JWT) and user role (student | admin).
- **POST /api/auth/logout**  
  Clears session cookie.

---

## Session & Assessment

- **GET /api/session**  
  Returns current user's dashboard data: student, sessions, results, decision. Student or admin.
- **POST /api/session**  
  Body: `{ action: "start" | "submit" | "next_phase", language? }`.  
  - **start:** Creates new TestSession, sets student status in_progress, returns `{ session }`.  
  - **submit:** Marks current session completed, advances phase/attempt or sets student completed; returns `{ student, nextStep }`.

---

## Questions

- **POST /api/questions/generate**  
  Body: `{ language, phase, sessionId, count? }`.  
  Resolves student from session (or auth). Returns **unique** questions for this student/attempt/phase (AI-generated from blueprints; hash + 1500-use and per-student no-repeat).  
  Response: `{ questions: Question[] }`.

---

## Code Execution

- **POST /api/code/execute**  
  Body: `{ code, language, testCases, timeLimit }`.  
  Runs in secure sandbox (or LLM-based evaluation in dev).  
  Response: `{ evaluation }` (test results, code quality, correctness, complexity, etc.).

---

## Proctoring

- **POST /api/proctoring/violation**  
  Body: `{ sessionId, type, description }`.  
  Types: multiple_faces, looking_away, phone_detected, talking, tab_switch, camera_off, suspicious_inactivity, copy_paste.  
  Server: appends ViolationLog, updates student integrity score, applies warnings (3, 6) and lock (8).  
  Response: `{ totalViolations, warningLevel, action }`.  
  **action:** logged | warning | final_warning | locked.

---

## AI Interview

- **POST /api/interview**  
  Body: `{ messages, context? }`. context: `{ code?, language?, questionTitle?, score?, mode?: "during_test" | "post_test" }`.  
  Streams AI response (SSE or stream).  
  **during_test:** technical follow-up on code. **post_test:** technical + HR mock (after all phases completed).

---

## Eligibility

- **POST /api/eligibility**  
  Body: `{ studentId }`.  
  AI decision from results, sessions, violations. Writes EligibilityDecision.  
  Response: `{ decision }`.

---

## Google Sheets / Export

- **POST /api/sheets/export**  
  Builds export rows (student, attempt/phase scores, violations, integrity, eligibility).  
  If `GOOGLE_SHEETS_ID` and `GOOGLE_SERVICE_ACCOUNT_KEY` are set: appends/updates Google Sheet.  
  Response: `{ success, message, sheetsId?, rowCount?, data?, csv? }`.

---

## Admin

- **GET /api/admin/stats**  
  Returns aggregate stats (students, sessions, violations). Admin only.
- **GET /api/admin/students**  
  List students (paginated). Admin only.
- **PATCH /api/admin/students/:id**  
  Update student (e.g. status). Admin only.

---

## Security and Conventions

- **Credentials:** Send cookies with `credentials: "include"` (same-origin) or valid Bearer token.
- **Validation:** All inputs validated server-side (e.g. Zod). No trust of client for business rules.
- **Rate limiting:** Applied on auth and heavy endpoints (see SECURITY_STRATEGY.md).
- **Errors:** 4xx/5xx with JSON `{ error: string }` or structured message.
