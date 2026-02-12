import { Router, Request, Response } from "express"
import { store } from "../../lib/store"
import { getSession } from "../auth"

const router = Router()

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const auth = await getSession(req)
    if (!auth || auth.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const [stats, students, decisions] = await Promise.all([
      store.getStats(),
      store.getAllStudents(5000, 0),
      store.getAllDecisions(),
    ])

    const languageDistribution: Record<string, number> = {}
    const collegeDistribution: Record<string, number> = {}
    const violationsByType: Record<string, number> = {}

    for (const student of students) {
      languageDistribution[student.language] = (languageDistribution[student.language] || 0) + 1
      collegeDistribution[student.college] = (collegeDistribution[student.college] || 0) + 1

      const sessions = await store.getSessionsByStudent(student.id)
      for (const session of sessions) {
        for (const v of session.violations) {
          violationsByType[v.type] = (violationsByType[v.type] || 0) + 1
        }
      }
    }

    const avgIntegrity = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.integrityScore, 0) / students.length)
      : 100

    return res.json({
      stats,
      analytics: {
        languageDistribution,
        collegeDistribution,
        violationsByType,
        avgIntegrity,
        decisionBreakdown: {
          eligible: decisions.filter((d) => d.status === "eligible").length,
          borderline: decisions.filter((d) => d.status === "borderline").length,
          notEligible: decisions.filter((d) => d.status === "not_eligible").length,
        },
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return res.status(500).json({ error: "Failed to get stats" })
  }
})

export default router
