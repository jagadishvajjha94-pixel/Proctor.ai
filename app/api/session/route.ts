import { store } from "@/lib/store"
import { getSession } from "@/lib/auth"
import type { TestSession, TestAttempt, TestPhase, Language } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const auth = await getSession()
    if (!auth || auth.role !== "student") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, language } = (await req.json()) as {
      action: "start" | "submit" | "next_phase"
      language?: Language
    }

    const student = await store.getStudent(auth.id)
    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 })
    }

    if (student.status === "locked") {
      return Response.json({ error: "Account is locked due to integrity violations" }, { status: 403 })
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

      return Response.json({ session })
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

      // Progress through phases and attempts
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
      return Response.json({ student, nextStep: student.status === "completed" ? "results" : "continue" })
    }

    return Response.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Session error:", error)
    return Response.json({ error: "Session operation failed" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const auth = await getSession()
    if (!auth) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (auth.role === "admin") {
      const [stats, students] = await Promise.all([store.getStats(), store.getAllStudents(5000, 0)])
      return Response.json({ stats, students })
    }

    const student = await store.getStudent(auth.id)
    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 })
    }

    const [sessions, results, decision] = await Promise.all([
      store.getSessionsByStudent(student.id),
      store.getResults(student.id),
      store.getDecision(student.id),
    ])

    return Response.json({ student, sessions, results, decision })
  } catch (error) {
    console.error("Session GET error:", error)
    return Response.json({ error: "Failed to get session data" }, { status: 500 })
  }
}
