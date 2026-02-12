import { Router, Request, Response } from "express"
import { store } from "../../lib/store"
import { getSession } from "../auth"
import type { TestSession, TestAttempt, TestPhase, Language } from "../../lib/types"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  try {
    const auth = await getSession(req)
    if (!auth || auth.role !== "student") {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { action, language } = (req.body || {}) as {
      action: "start" | "submit" | "next_phase"
      language?: Language
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
        currentSession.status = "completed"
        currentSession.endTime = new Date().toISOString()
        await store.setSession(currentSession)
      }

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
