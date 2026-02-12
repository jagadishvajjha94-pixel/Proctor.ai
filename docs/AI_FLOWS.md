# AI Logic Flows

Centralized description of how AI is used across the platform. All prompts and decisions are server-side.

---

## 1. Question Generation (No Repetition)

**Goal:** Unique coding problems per student; no question repeat before 1500 students; same student never sees the same question twice.

**Flow:**
1. Resolve **studentId** from session or auth.
2. Load **studentSeenHashes** (hashes this student has already been assigned).
3. Load **blueprint usage**; select blueprints for this phase (e.g. phase1 vs phase2).
4. For each question slot:
   - Build **uniqueness seed** (random + studentId + attempt + phase + timestamp).
   - Call LLM with **blueprint** (concept/category), **language**, and **uniqueness seed**. Request structured output (title, description, constraints, examples, test cases).
   - Compute **hash** = f(blueprintId, title, description, constraints).
   - If hash in **studentSeenHashes** → retry with new seed (or next blueprint).
   - If **QuestionHash.useCount** in [1, 1499] → skip (reuse only after 1500).
   - Else: increment **useCount**, add to **StudentQuestionHash**, return question.
5. Return list of questions; store assigned hashes.

**Blueprint rules:** Same concept may repeat; values, constraints, logic paths, and context must differ (enforced via seed and hash).

**Validation:** Server-side only; hashing and counters in DB.

---

## 2. Code Evaluation Engine

**Goal:** Correctness, time/space complexity, edge-case handling, code structure, originality. No local execution in production.

**Flow (production):**
1. Receive **code**, **language**, **testCases**, **timeLimit**.
2. Execute in **secure cloud sandbox** (e.g. Piston, Judge0, or container). Run against test cases; capture stdout, stderr, exit code, time, memory.
3. Optionally: second pass with **LLM** for code quality (complexity, originality, structure) using sandbox results.
4. Return: **testResults** (per-case pass/fail), **executionTime**, **memoryUsed**, **codeQuality** (correctness, timeComplexity, spaceComplexity, edgeCaseHandling, codeStructure, originality).

**Flow (dev / fallback):** LLM simulates execution and grading when sandbox is unavailable.

---

## 3. AI Interview Module

**During test (context: code, questionTitle, score):**
- System prompt: senior technical interviewer; ask “why” and “how”; probe complexity, edge cases, follow-ups.
- Adjusts to submitted code and score; concise, placement-level.

**Post-test (context: mode = "post_test"):**
- Technical + HR mock: intro, technical questions (DSA, projects), then behavioral (strengths, teamwork, “tell me about a time”).
- Closing: short feedback (strengths, improvements, readiness).

**Dynamic difficulty:** Implicit in follow-up prompts (e.g. harder if answer is strong).

---

## 4. AI Eligibility Decision

**Inputs:** Student profile, **TestResult** (both attempts), sessions, violation counts, integrity score.

**Flow:**
1. Aggregate: coding accuracy, problem-solving depth, performance, consistency, violation count, integrity.
2. LLM with structured output (schema): **status** (eligible | borderline | not_eligible), **confidence**, **reasons**, **scores** (codingAccuracy, problemSolving, performance, consistency, integrity, behavioralTrust), **recommendation**.
3. Thresholds (in prompt): Eligible (e.g. overall ≥ 70, integrity ≥ 80); Borderline (50–69 or integrity 60–79); Not Eligible (< 50 or integrity < 60 or 8+ violations).
4. Store **EligibilityDecision**; log for audit.

**Explainable and auditable:** Reasons and scores stored; no sensitive logic on client.

---

## 5. Plagiarism / Originality (Extension)

- **Code originality** can be scored by LLM in the code-evaluation step.
- Optional: server-side **plagiarism detection** (e.g. hash/normalize code, compare against other submissions or public repos). Not implemented in base; pluggable as a separate service or post-submit job.
