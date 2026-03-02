import { Router, Request, Response } from "express"
import { appendToSheet } from "../../lib/google-sheets"
import { buildExportRows, EXPORT_HEADERS } from "../../lib/export-data"
import { getAuthenticatedStudent } from "../auth"

const router = Router()

const INTERVIEW_EXPORT_HEADERS = [
  "Student ID",
  "Name",
  "Email",
  "College",
  "Question Types",
  "Coding Type",
  "Language",
  "Performance",
  "Communication",
  "Preparation Rating",
  "Strengths",
  "Areas to Improve",
  "Interview Date",
]

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

router.post("/export", async (_req: Request, res: Response) => {
  try {
    const rows = await buildExportRows()

    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID
    const GOOGLE_SERVICE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

    if (GOOGLE_SHEETS_ID && GOOGLE_SERVICE_KEY) {
      try {
        const { updatedRows } = await appendToSheet(
          GOOGLE_SHEETS_ID,
          GOOGLE_SERVICE_KEY,
          EXPORT_HEADERS,
          rows
        )
        return res.json({
          success: true,
          message: "Data appended to Google Sheets",
          sheetsId: GOOGLE_SHEETS_ID,
          rowCount: rows.length,
          updatedRows,
        })
      } catch (sheetsError) {
        console.error("Google Sheets append error:", sheetsError)
        return res.status(502).json({
          success: false,
          error: "Failed to update Google Sheet",
          data: rows,
          headers: EXPORT_HEADERS,
          csv: generateCSV(rows),
        })
      }
    }

    return res.json({
      success: true,
      message: "Data prepared for export. Configure GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_KEY for automatic Google Sheets integration.",
      data: rows,
      headers: EXPORT_HEADERS,
      csv: generateCSV(rows),
    })
  } catch (error) {
    console.error("Export error:", error)
    return res.status(500).json({ error: "Failed to export data" })
  }
})

router.post("/interview-export", async (req: Request, res: Response) => {
  try {
    const student = await getAuthenticatedStudent(req)
    if (!student) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const body = (req.body || {}) as {
      summary: {
        questionTypes?: string[]
        codingType?: string
        language?: string
        performance?: number
        communication?: number
        preparationRating?: number
        strengths?: string
        areasToImprove?: string
      }
      languagesUsed?: string[]
    }
    const summary = body.summary || {}
    const languagesUsed = body.languagesUsed as string[] | undefined
    const languageDisplay = (languagesUsed?.length ? languagesUsed.join(", ") : summary.language) || "N/A"

    const row: Record<string, string | number> = {
      "Student ID": student.registrationId,
      "Name": student.name,
      "Email": student.email,
      "College": student.college,
      "Question Types": Array.isArray(summary.questionTypes) ? summary.questionTypes.join(", ") : (summary.questionTypes ?? "N/A"),
      "Coding Type": summary.codingType ?? "N/A",
      "Language": languageDisplay,
      "Performance": summary.performance ?? "N/A",
      "Communication": summary.communication ?? "N/A",
      "Preparation Rating": summary.preparationRating ?? "N/A",
      "Strengths": summary.strengths ?? "",
      "Areas to Improve": summary.areasToImprove ?? "",
      "Interview Date": new Date().toISOString().slice(0, 10),
    }

    const rows = [row]
    const GOOGLE_SHEETS_INTERVIEW_ID = process.env.GOOGLE_SHEETS_INTERVIEW_ID
    const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID
    const GOOGLE_SERVICE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const sheetId = GOOGLE_SHEETS_INTERVIEW_ID || GOOGLE_SHEETS_ID

    if (sheetId && GOOGLE_SERVICE_KEY) {
      try {
        const { updatedRows } = await appendToSheet(
          sheetId,
          GOOGLE_SERVICE_KEY,
          INTERVIEW_EXPORT_HEADERS,
          rows,
          GOOGLE_SHEETS_INTERVIEW_ID ? undefined : "Interview"
        )
        return res.json({
          success: true,
          message: "Interview report appended to Google Sheet",
          sheetsId: sheetId,
          rowCount: 1,
          updatedRows,
          csv: generateCSV(rows),
        })
      } catch (sheetsError) {
        console.error("Interview export to sheet error:", sheetsError)
        return res.status(502).json({
          success: false,
          error: "Failed to update Google Sheet",
          csv: generateCSV(rows),
          headers: INTERVIEW_EXPORT_HEADERS,
        })
      }
    }

    return res.json({
      success: true,
      message: "Configure GOOGLE_SHEETS_ID (or GOOGLE_SHEETS_INTERVIEW_ID) and GOOGLE_SERVICE_ACCOUNT_KEY to export to Google Sheet.",
      csv: generateCSV(rows),
      headers: INTERVIEW_EXPORT_HEADERS,
    })
  } catch (error) {
    console.error("Interview export error:", error)
    return res.status(500).json({ error: "Failed to export interview data" })
  }
})

export default router
