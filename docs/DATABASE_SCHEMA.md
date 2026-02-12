# Database Schema (PostgreSQL + Prisma)

Production schema for 3000+ concurrent students. All identity and session data is server-side.

---

## Entity Relationship (Textual)

```
Student 1───* TestSession
Student 1───* TestResult
Student 1───1 EligibilityDecision
TestSession 1───* ViolationLog
TestSession 1───* Submission
QuestionHash (global uniqueness)
StudentQuestionHash (per-student seen questions)
BlueprintUsage (per-blueprint usage count)
```

---

## Tables

### Student
- **id** (PK), name, email (unique), college, registrationId (unique)
- **currentAttempt** (1|2), **currentPhase** (phase1|phase2), **language**
- **status**: not_started | in_progress | completed | locked
- **violations** (count), **integrityScore** (0–100), **createdAt**
- Indexes: email, status, college

### TestSession
- **id** (PK), **studentId** (FK → Student), **attempt**, **phase**
- **status**, **startTime**, **endTime**
- **questions** (JSON: stored question set for this session)
- Relations: violations, submissions
- Indexes: studentId, status

### ViolationLog
- **id** (PK), **sessionId** (FK → TestSession), **type**, **timestamp**
- **severity**: low | medium | high
- **description**, **screenshotUrl** (optional)
- Index: sessionId

### Submission
- **id** (PK), **sessionId** (FK), **questionId**, **code** (text), **language**
- **status**: pending | running | accepted | wrong_answer | time_limit | runtime_error | compile_error
- **passedTests**, **totalTests**, **executionTime**, **memoryUsed**, **score**, **submittedAt**
- Index: sessionId

### TestResult
- **id** (PK), **studentId** (FK), **attempt**
- **phase1Score**, **phase2Score**, **totalScore**, **accuracy**, **performance**
- **violationCount**, **integrityScore**, **codingAccuracy**, **problemSolvingDepth**, **consistency**
- Unique: (studentId, attempt)
- Index: studentId

### EligibilityDecision
- **id** (PK), **studentId** (FK, unique)
- **status**: eligible | borderline | not_eligible
- **confidence**, **reasons** (array), **scores** (JSON), **recommendation** (text)
- One per student; overwritten on re-run.

### QuestionHash
- **id** (PK), **hash** (unique), **useCount** (default 0)
- **createdAt**
- Rule: question with same hash may be reused only after **useCount >= 1500** (no repeat before 1500 students).
- Index: hash

### StudentQuestionHash
- **id** (PK), **studentId**, **questionHash**
- **createdAt**
- Unique: (studentId, questionHash) — same student never sees same question twice.
- Indexes: studentId, questionHash

### BlueprintUsage
- **id** (PK), **blueprintId** (unique), **count**
- Used to balance question variety across blueprints.

---

## Migrations

- All schema changes via Prisma: `npx prisma migrate dev` (dev) / `npx prisma migrate deploy` (prod).
- Production: run migrations before app deploy; backup before destructive changes.

---

## Concurrency and Performance

- Use connection pooling (Prisma default).
- For very high read load, add read replicas and direct read-only queries for reports.
- Indexes on sessionId, studentId, status, and hash support hot paths (sessions, violations, question lookup).
