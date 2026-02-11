import { store } from "@/lib/store"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const auth = await getSession()
    if (!auth || auth.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [stats, students, decisions] = await Promise.all([
      store.getStats(),
      store.getAllStudents(5000, 0),
      store.getAllDecisions(),
    ])

    // Aggregate analytics (paginated - sample for large datasets)
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

    return Response.json({
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
    return Response.json({ error: "Failed to get stats" }, { status: 500 })
  }
}
