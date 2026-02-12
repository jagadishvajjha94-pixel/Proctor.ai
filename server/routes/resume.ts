import { Router, Request, Response } from "express"

const router = Router()

/** POST /api/resume/parse-pdf — body: { pdf: base64String }. Returns { text }. */
router.post("/parse-pdf", async (req: Request, res: Response) => {
  try {
    const { pdf: base64 } = (req.body || {}) as { pdf?: string }
    if (!base64 || typeof base64 !== "string") {
      return res.status(400).json({ error: "Missing pdf (base64 string)" })
    }
    const buffer = Buffer.from(base64, "base64")
    if (buffer.length === 0) {
      return res.status(400).json({ error: "Invalid base64" })
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "PDF too large (max 5MB)" })
    }
    const mod = await import("pdf-parse")
    const pdfParse = typeof mod?.default === "function" ? mod.default : mod
    const data = await (typeof pdfParse === "function" ? pdfParse(buffer) : Promise.reject(new Error("pdf-parse not available")))
    const text = (data?.text ?? "").trim() || ""
    return res.json({ text })
  } catch (error) {
    console.error("PDF parse error:", error)
    return res.status(500).json({ error: "Failed to extract text from PDF", text: "" })
  }
})

export default router
