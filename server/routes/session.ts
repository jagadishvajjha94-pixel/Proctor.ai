import { Router, Request, Response } from "express"
import { store } from "../../lib/store"
import { getSession } from "../auth"
import { TOTAL_MARKS } from "../../lib/constants"
import type { TestSession, TestAttempt, TestPhase, Language, TestResult, Submission } from "../../lib/types"

const router = Router()

/** Compute phase score (0–100) from session submissions; total marks = 100. */
function phaseScoreFromSubmissions(submissions: { score: number }[]): number {
  if (submissions.length === 0) return 0
  const sum = submissions.reduce((s, sub) => s + sub.score, 0)
  return Math.round((sum / submissions.length))
}

/** POST /api/session/submission — persist a single code submission for the current session */
router.post("/submission", async (req: Request, res: Response) => {
  try {
    const auth = await getSession(req)
    if (!auth || auth.role !== "student") {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const { sessionId, submission } = (req.body || {}) as { sessionId: string; submission: Submission }
    if (!sessionId || !submission?.questionId) {
      return res.status(400).json({ error: "sessionId and submission with questionId required" })
    }
    const session = await store.getSession(sessionId)
    if (!session || session.studentId !== auth.id || session.status !== "in_progress") {
      return res.status(403).json({ error: "Invalid or not your active session" })
    }
    await store.addSubmission(sessionId, submission)
    return res.json({ ok: true })
  } catch (error) {
    console.error("Submission save error:", error)
    return res.status(500).json({ error: "Failed to save submission" })
  }
})

router.post("/", async (req: Request, res: Response) => {
  try {
    const auth = await getSession(req)
    if (!auth || auth.role !== "student") {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { action, language, submissions: bodySubmissions } = (req.body || {}) as {
      action: "start" | "submit" | "next_phase"
      language?: Language
      submissions?: Submission[]
    }

    const student = await store.getStudent(auth.id)
    if (!student) {
      return res.status(404).json({ error: "Student not found" })
    }

    if (student.status === "locked") {
      return res.status(403).json({ error: "Account is locked due to integrity violations" })
    }

    if (action === "start") {
      if (language) student.language = language

      const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      const session: TestSession = {
        id: sessionId,
        studentId: student.id,
        attempt: student.currentAttempt,
        phase: student.currentPhase,
        status: "in_progress",
        startTime: new Date().toISOString(),
        violations: [],
        questions: [],
        submissions: [],
      }

      await store.setSession(session)
      student.status = "in_progress"
      await store.setStudent(student)

      return res.json({ session })
    }

    if (action === "submit") {
      const sessions = await store.getSessionsByStudent(student.id)
      const currentSession = sessions.find(
        (s) => s.attempt === student.currentAttempt && s.phase === student.currentPhase && s.status === "in_progress"
      )

      if (currentSession) {
        // Sync any submissions sent with final submit (e.g. from client state) so scores are correct
        if (Array.isArray(bodySubmissions) && bodySubmissions.length > 0) {
          for (const sub of bodySubmissions) {
            if (sub?.questionId) await store.addSubmission(currentSession.id, sub)
          }
        }
        currentSession.status = "completed"
        currentSession.endTime = new Date().toISOString()
        await store.setSession(currentSession)
      }

      const completedAttempt = student.currentAttempt
      const completedPhase = student.currentPhase

      if (student.currentPhase === "phase1") {
        student.currentPhase = "phase2"
        student.status = "not_started"
      } else if (student.currentPhase === "phase2" && student.currentAttempt === 1) {
        student.currentAttempt = 2 as TestAttempt
        student.currentPhase = "phase1" as TestPhase
        student.status = "not_started"
      } else {
        student.status = "completed"
      }

      await store.setStudent(student)

      // When both phases of an attempt are completed, compute scores (out of TOTAL_MARKS) and save result
      if (completedPhase === "phase2") {
        // Re-fetch sessions so completed session includes persisted submissions for scoring
        const sessionsForScoring = await store.getSessionsByStudent(student.id)
        const attemptSessions = sessionsForScoring.filter((s) => s.attempt === completedAttempt && s.status === "completed")
        const p1 = attemptSessions.find((s) => s.phase === "phase1")
        const p2 = attemptSessions.find((s) => s.phase === "phase2")
        if (p1 && p2) {
          const phase1Score = Math.min(TOTAL_MARKS, phaseScoreFromSubmissions(p1.submissions))
          const phase2Score = Math.min(TOTAL_MARKS, phaseScoreFromSubmissions(p2.submissions))
          const totalScore = Math.round((phase1Score + phase2Score) / 2)
          const result: TestResult = {
            studentId: student.id,
            attempt: completedAttempt as TestAttempt,
            phase1Score,
            phase2Score,
            totalScore,
            accuracy: totalScore,
            performance: totalScore,
            violationCount: student.violations,
            integrityScore: student.integrityScore,
            codingAccuracy: totalScore,
            problemSolvingDepth: totalScore,
            consistency: totalScore,
          }
          await store.addResult(result)
        }
      }

      return res.json({ student, nextStep: student.status === "completed" ? "results" : "continue" })
    }

    return res.status(400).json({ error: "Invalid action" })
  } catch (error) {
    console.error("Session error:", error)
    return res.status(500).json({ error: "Session operation failed" })
  }
})

router.get("/", async (_req: Request, res: Response) => {
  try {
    const auth = await getSession(_req)
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    if (auth.role === "admin") {
      const [stats, students] = await Promise.all([store.getStats(), store.getAllStudents(5000, 0)])
      return res.json({ stats, students })
    }

    const student = await store.getStudent(auth.id)
    if (!student) {
      return res.status(404).json({ error: "Student not found" })
    }

    const [sessions, results, decision] = await Promise.all([
      store.getSessionsByStudent(student.id),
      store.getResults(student.id),
      store.getDecision(student.id),
    ])

    return res.json({ student, sessions, results, decision })
  } catch (error) {
    console.error("Session GET error:", error)
    return res.status(500).json({ error: "Failed to get session data" })
  }
})

export default router
