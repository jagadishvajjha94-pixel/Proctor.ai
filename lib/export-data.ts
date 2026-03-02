import { store } from "./store"

export const EXPORT_HEADERS = [
  "Student ID",
  "Name",
  "Email",
  "College",
  "Language",
  "Attempt 1 Phase 1",
  "Attempt 1 Phase 2",
  "Attempt 2 Phase 1",
  "Attempt 2 Phase 2",
  "Total Score",
  "Score (0-10)",
  "Accuracy %",
  "Performance",
  "Violations",
  "Integrity %",
  "Eligibility",
  "Confidence",
  "Recommendation",
  "Sessions",
  "Status",
  "Registered",
]

export type ExportRow = Record<(typeof EXPORT_HEADERS)[number], string | number>

export async function buildExportRows(): Promise<ExportRow[]> {
  const [students, decisions] = await Promise.all([
    store.getAllStudents(10000, 0),
    store.getAllDecisions(),
  ])

  return Promise.all(
    students.map(async (student) => {
      const [sessions, results] = await Promise.all([
        store.getSessionsByStudent(student.id),
        store.getResults(student.id),
      ])
      const decision = decisions.find((d) => d.studentId === student.id)
      const attempt1 = results.find((r) => r.attempt === 1)
      const attempt2 = results.find((r) => r.attempt === 2)
      const totalScoreSum = results.reduce((sum, r) => sum + r.totalScore, 0)
      const totalScoreDisplay = totalScoreSum > 0 ? totalScoreSum : "N/A"
      const lastResult = results.length > 0 ? results[results.length - 1] : null
      const scoreOutOf10 = lastResult != null ? Math.round((lastResult.totalScore / 100) * 10) : "N/A"

      return {
        "Student ID": student.registrationId,
        Name: student.name,
        Email: student.email,
        College: student.college,
        Language: student.language,
        "Attempt 1 Phase 1": attempt1?.phase1Score ?? "N/A",
        "Attempt 1 Phase 2": attempt1?.phase2Score ?? "N/A",
        "Attempt 2 Phase 1": attempt2?.phase1Score ?? "N/A",
        "Attempt 2 Phase 2": attempt2?.phase2Score ?? "N/A",
        "Total Score": totalScoreDisplay,
        "Score (0-10)": scoreOutOf10,
        "Accuracy %": results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length) + "%" : "N/A",
        Performance: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.performance, 0) / results.length) : "N/A",
        Violations: student.violations,
        "Integrity %": student.integrityScore + "%",
        Eligibility: decision?.status ?? "pending",
        Confidence: decision?.confidence ? decision.confidence + "%" : "N/A",
        Recommendation: decision?.recommendation ?? "N/A",
        Sessions: sessions.length,
        Status: student.status,
        Registered: student.createdAt,
      } as ExportRow
    })
  )
}
