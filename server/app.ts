import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import path from "path"
import { fileURLToPath } from "url"

import authRoutes from "./routes/auth"
import sessionRoutes from "./routes/session"
import adminRoutes from "./routes/admin"
import eligibilityRoutes from "./routes/eligibility"
import questionsRoutes from "./routes/questions"
import codeRoutes from "./routes/code"
import interviewRoutes from "./routes/interview"
import proctoringRoutes from "./routes/proctoring"
import sheetsRoutes from "./routes/sheets"
import resumeRoutes from "./routes/resume"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const limitMap = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 150

function getIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"]
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : req.headers["x-real-ip"]
  return (ip as string) || "unknown"
}

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = getIp(req)
  const now = Date.now()
  const entry = limitMap.get(ip)
  if (!entry) {
    limitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return next()
  }
  if (now > entry.resetAt) {
    limitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return next()
  }
  if (entry.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests" })
  }
  entry.count++
  next()
}

export function createApp() {
  const app = express()
  app.use(express.json({ limit: "10mb" }))
  app.use(cookieParser())
  app.use("/api", rateLimit)

  app.use("/api/auth", authRoutes)
  app.use("/api/session", sessionRoutes)
  app.use("/api/admin", adminRoutes)
  app.use("/api/eligibility", eligibilityRoutes)
  app.use("/api/questions", questionsRoutes)
  app.use("/api/code", codeRoutes)
  app.use("/api/interview", interviewRoutes)
  app.use("/api/proctoring", proctoringRoutes)
  app.use("/api/sheets", sheetsRoutes)
  app.use("/api/resume", resumeRoutes)

  const isProd = process.env.NODE_ENV === "production"
  if (isProd) {
    const distPath = path.join(__dirname, "..", "dist")
    app.use(express.static(distPath))
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"))
    })
  }

  return app
}
