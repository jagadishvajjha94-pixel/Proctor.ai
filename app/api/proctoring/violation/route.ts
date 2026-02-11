import { store } from "@/lib/store"
import type { ViolationLog, ViolationType } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const { sessionId, type, description } = (await req.json()) as {
      sessionId: string
      type: ViolationType
      description: string
    }

    const session = await store.getSession(sessionId)
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 })
    }

    const severityMap: Record<ViolationType, "low" | "medium" | "high"> = {
      looking_away: "low",
      suspicious_inactivity: "low",
      tab_switch: "medium",
      copy_paste: "medium",
      talking: "medium",
      camera_off: "high",
      multiple_faces: "high",
      phone_detected: "high",
    }

    const violation: ViolationLog = {
      id: `vio_${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      severity: severityMap[type],
      description,
    }

    const totalViolations = await store.addViolation(sessionId, violation)

    // Update student integrity score
    let student = await store.getStudent(session.studentId)
    if (student) {
      const severityPenalty = { low: 2, medium: 5, high: 10 }
      student.integrityScore = Math.max(0, student.integrityScore - severityPenalty[violation.severity])
      await store.setStudent(student)
    }

    let warningLevel = 0
    let action = "logged"

    if (totalViolations >= 8) {
      // Auto-submit and lock
      session.status = "completed"
      await store.setSession(session)
      if (student) {
        student.status = "locked"
        await store.setStudent(student)
      }
      warningLevel = 3
      action = "locked"
    } else if (totalViolations >= 6) {
      warningLevel = 2
      action = "final_warning"
    } else if (totalViolations >= 3) {
      warningLevel = 1
      action = "warning"
    }

    return Response.json({
      totalViolations,
      warningLevel,
      action,
      violation,
    })
  } catch (error) {
    console.error("Violation logging error:", error)
    return Response.json({ error: "Failed to log violation" }, { status: 500 })
  }
}
