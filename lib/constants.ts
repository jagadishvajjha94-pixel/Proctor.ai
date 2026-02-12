/**
 * Production constants — do not change without migration/coordination.
 */

/** Number of questions a student must solve in each phase (practice). */
export const QUESTIONS_PER_PHASE = 100

/** No question with the same hash may be reused until it has been assigned to at least this many students (no repetition before 1000). */
export const QUESTION_REUSE_AFTER = 1000
