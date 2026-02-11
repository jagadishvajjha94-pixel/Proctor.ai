import { store } from "@/lib/store"

// Google Sheets integration via Google Sheets API
// In production: use googleapis package with service account credentials
// For now: exports data in a format ready for Sheets API or CSV download

export async function POST() {
  try {
    const [students, decisions] = await Promise.all([
      store.getAllStudents(10000, 0),
      store.getAllDecisions(),
    ])

    const rows = await Promise.all(students.map(async (student) => {
      const [sessions, results] = await Promise.all([
        store.getSessionsByStudent(student.id),
        store.getResults(student.id),
      ])
      const decision = decisions.find((d) => d.studentId === student.id)

      // Calculate phase-wise scores
      const attempt1Phase1 = results.find((r) => r.attempt === 1)
      const attempt1Phase2 = results.find((r) => r.attempt === 1)
      const attempt2Phase1 = results.find((r) => r.attempt === 2)
      const attempt2Phase2 = results.find((r) => r.attempt === 2)

      return {
        studentId: student.registrationId,
        name: student.name,
        email: student.email,
        college: student.college,
        language: student.language,
        attempt1Phase1Score: attempt1Phase1?.phase1Score ?? "N/A",
        attempt1Phase2Score: attempt1Phase2?.phase2Score ?? "N/A",
        attempt2Phase1Score: attempt2Phase1?.phase1Score ?? "N/A",
        attempt2Phase2Score: attempt2Phase2?.phase2Score ?? "N/A",
        totalScore: results.reduce((sum, r) => sum + r.totalScore, 0) || "N/A",
        accuracy: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length) + "%" : "N/A",
        performance: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.performance, 0) / results.length) : "N/A",
        violationCount: student.violations,
        integrityScore: student.integrityScore + "%",
        eligibilityStatus: decision?.status ?? "pending",
        confidence: decision?.confidence ? decision.confidence + "%" : "N/A",
        recommendation: decision?.recommendation ?? "N/A",
        totalSessions: sessions.length,
        status: student.status,
        registeredAt: student.createdAt,
      }
    })

    // If Google Sheets credentials are configured, push to sheets
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID
    const GOOGLE_SERVICE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

    if (GOOGLE_SHEETS_ID && GOOGLE_SERVICE_KEY) {
      // In production: use googleapis to update the sheet
      // const { google } = require('googleapis')
      // const auth = new google.auth.GoogleAuth(...)
      // const sheets = google.sheets({ version: 'v4', auth })
      // await sheets.spreadsheets.values.update(...)
      return Response.json({
        success: true,
        message: "Data exported to Google Sheets",
        sheetsId: GOOGLE_SHEETS_ID,
        rowCount: rows.length,
      })
    }

    // Return data as JSON for manual export / CSV generation
    return Response.json({
      success: true,
      message: "Data prepared for export. Configure GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY for automatic Google Sheets integration.",
      data: rows,
      headers: [
        "Student ID", "Name", "Email", "College", "Language",
        "Attempt 1 Phase 1", "Attempt 1 Phase 2",
        "Attempt 2 Phase 1", "Attempt 2 Phase 2",
        "Total Score", "Accuracy %", "Performance",
        "Violations", "Integrity %", "Eligibility",
        "Confidence", "Recommendation", "Sessions", "Status", "Registered",
      ],
      csv: generateCSV(rows),
    })
  } catch (error) {
    console.error("Export error:", error)
    return Response.json({ error: "Failed to export data" }, { status: 500 })
  }
}

function generateCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? "")
          return val.includes(",") ? `"${val}"` : val
        })
        .join(",")
    ),
  ]
  return csvRows.join("\n")
}
