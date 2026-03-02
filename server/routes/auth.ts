import { Router, Request, Response } from "express"
import { store } from "../../lib/store"
import { createSession, createAdminSession, destroySession } from "../auth"
import type { Student } from "../../lib/types"

const router = Router()

/** Default admin credentials (use ADMIN_EMAIL / ADMIN_PASSWORD in .env to override) */
const DEFAULT_ADMIN_EMAIL = "admin@admin.com"
const DEFAULT_ADMIN_PASSWORD = "admin123"

/** POST /api/auth/admin-login — admin only; no student logic, returns 401 for wrong credentials */
router.post("/admin-login", async (req: Request, res: Response) => {
  try {
    const raw = (req.body || {}) as { email?: string; password?: string }
    const email = (raw.email ?? "").trim().toLowerCase()
    const password = (raw.password ?? "").trim()
    const adminEmail = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
    const adminPass = (process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD).trim()
    if (email && password && email === adminEmail && password === adminPass) {
      await createAdminSession(res)
      return res.json({ role: "admin", redirect: "/admin" })
    }
    return res.status(401).json({ error: "Invalid email or password" })
  } catch (error) {
    console.error("Admin login error:", error)
    return res.status(500).json({ error: "Authentication failed" })
  }
})

router.post("/login", async (req: Request, res: Response) => {
  try {
    const raw = (req.body || {}) as {
      email?: string
      password?: string
      registrationId?: string
      name?: string
      college?: string
    }
    const email = (raw.email ?? "").trim().toLowerCase()
    const password = (raw.password ?? "").trim()
    const { registrationId, name, college } = raw
    const regId = typeof registrationId === "string" ? registrationId.trim() : ""
    const nameVal = typeof name === "string" ? name.trim() : ""
    const collegeVal = typeof college === "string" ? college.trim() : ""

    const adminEmail = (process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
    const adminPass = (process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD).trim()
    if (email === adminEmail) {
      if (password === adminPass) {
        await createAdminSession(res)
        return res.json({ role: "admin", redirect: "/admin" })
      }
      return res.status(400).json({ error: "Invalid password" })
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    let student = await store.getStudentByEmail(email)

    if (!student) {
      if (password === "demo" && nameVal && regId && collegeVal) {
        const id = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        student = {
          id,
          name: nameVal,
          email,
          college: collegeVal,
          registrationId: regId,
          currentAttempt: 1,
          currentPhase: "phase1",
          language: "python",
          status: "not_started",
          violations: 0,
          integrityScore: 100,
          createdAt: new Date().toISOString(),
        } satisfies Student
        await store.setStudent(student)
      } else if (!nameVal || !regId || !collegeVal) {
        return res.status(400).json({
          error: "New students must provide name, registration ID, and college",
          isNewStudent: true,
        })
      } else {
        const id = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        student = {
          id,
          name: nameVal,
          email,
          college: collegeVal,
          registrationId: regId,
          currentAttempt: 1,
          currentPhase: "phase1",
          language: "python",
          status: "not_started",
          violations: 0,
          integrityScore: 100,
          createdAt: new Date().toISOString(),
        } satisfies Student
        await store.setStudent(student)
      }
    }

    await createSession(res, student)
    return res.json({
      role: "student",
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
      },
      redirect: "/dashboard",
    })
  } catch (error) {
    console.error("Login error:", error)
    return res.status(500).json({ error: "Authentication failed" })
  }
})

router.post("/logout", (_req: Request, res: Response) => {
  destroySession(res)
  return res.json({ success: true })
})

export default router
