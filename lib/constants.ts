/**
 * Production constants — do not change without migration/coordination.
 */

/** Number of questions per phase. Total = 4 phases × 5 = 20 questions (Phase 1 & 2 × Attempt 1 & 2). */
export const QUESTIONS_PER_PHASE = 5

/** No question with the same hash may be reused until it has been assigned to at least this many students (no repetition before 1000). */
export const QUESTION_REUSE_AFTER = 1000

/** Assessment duration: 1 hour in seconds. */
export const ASSESSMENT_DURATION_SECONDS = 3600

/** Total marks for the assessment (each attempt scored out of 100). */
export const TOTAL_MARKS = 100
