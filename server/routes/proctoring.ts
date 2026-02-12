import { Router, Request, Response } from "express"
import { store } from "../../lib/store"
import type { ViolationLog, ViolationType } from "../../lib/types"

const router = Router()

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

router.post("/violation", async (req: Request, res: Response) => {
  try {
    const { sessionId, type, description } = (req.body || {}) as {
      sessionId: string
      type: ViolationType
      description: string
    }

    const session = await store.getSession(sessionId)
    if (!session) {
      return res.status(404).json({ error: "Session not found" })
    }

    const violation: ViolationLog = {
      id: `vio_${Date.now()}`,
      type,
      timestamp: new Date().toISOString(),
      severity: severityMap[type],
      description,
    }

    const totalViolations = await store.addViolation(sessionId, violation)

    let student = await store.getStudent(session.studentId)
    if (student) {
      const severityPenalty = { low: 2, medium: 5, high: 10 }
      student.integrityScore = Math.max(0, student.integrityScore - severityPenalty[violation.severity])
      await store.setStudent(student)
    }

    let warningLevel = 0
    let action = "logged"

    if (totalViolations >= 8) {
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

    return res.json({
      totalViolations,
      warningLevel,
      action,
      violation,
    })
  } catch (error) {
    console.error("Violation logging error:", error)
    return res.status(500).json({ error: "Failed to log violation" })
  }
})

export default router
