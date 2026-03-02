import { Router, Request, Response } from "express"
import * as XLSX from "xlsx"
import { store } from "../../lib/store"
import { getSession } from "../auth"
import { buildExportRows, EXPORT_HEADERS } from "../../lib/export-data"

const router = Router()

/** GET /api/admin/export-data — admin only; returns students with scores for table & export */
router.get("/export-data", async (req: Request, res: Response) => {
  try {
    const auth = await getSession(req)
    if (!auth || auth.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const rows = await buildExportRows()
    return res.json({ headers: EXPORT_HEADERS, rows })
  } catch (error) {
    console.error("Admin export-data error:", error)
    return res.status(500).json({ error: "Failed to load export data" })
  }
})

function csvEscape(val: string | number): string {
  const s = String(val ?? "")
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
}

/** GET /api/admin/export-csv — admin only; downloads full sheet as CSV (Excel-compatible) */
router.get("/export-csv", async (req: Request, res: Response) => {
  try {
    const auth = await getSession(req)
    if (!auth || auth.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const rows = await buildExportRows()
    const headers = EXPORT_HEADERS
    const csvRows = [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))]
    const csv = csvRows.join("\r\n")
    const filename = `students-scores-${new Date().toISOString().slice(0, 10)}.csv`
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    return res.send(Buffer.from(csv, "utf-8"))
  } catch (error) {
    console.error("Admin export-csv error:", error)
    return res.status(500).json({ error: "Failed to generate CSV" })
  }
})

/** GET /api/admin/export-excel — admin only; downloads full sheet as .xlsx */
router.get("/export-excel", async (req: Request, res: Response) => {
  try {
    const auth = await getSession(req)
    if (!auth || auth.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const rows = await buildExportRows()
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}])
    XLSX.utils.book_append_sheet(workbook, sheet, "Students")
    const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array
    const buffer = Buffer.from(out)
    const filename = `students-scores-${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Length", String(buffer.length))
    return res.send(buffer)
  } catch (error) {
    console.error("Admin export-excel error:", error)
    const message = error instanceof Error ? error.message : "Failed to generate Excel"
    return res.status(500).json({ error: message })
  }
})

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
