import { Router, Request, Response } from "express"
import { store } from "../../lib/store"
import { createSession, createAdminSession, destroySession } from "../auth"
import type { Student } from "../../lib/types"

const router = Router()

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password, registrationId, name, college } = (req.body || {}) as {
      email: string
      password: string
      registrationId?: string
      name?: string
      college?: string
    }

    const adminPass = process.env.ADMIN_PASSWORD ?? "admin123"
    if (email === "admin@proctorai.com" && password === adminPass) {
      await createAdminSession(res)
      return res.json({ role: "admin", redirect: "/admin" })
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    let student = await store.getStudentByEmail(email)

    if (!student) {
      if (password === "demo" && name && registrationId && college) {
        const id = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        student = {
          id,
          name,
          email,
          college,
          registrationId,
          currentAttempt: 1,
          currentPhase: "phase1",
          language: "python",
          status: "not_started",
          violations: 0,
          integrityScore: 100,
          createdAt: new Date().toISOString(),
        } satisfies Student
        await store.setStudent(student)
      } else if (!name || !registrationId || !college) {
        return res.status(400).json({
          error: "New students must provide name, registration ID, and college",
          isNewStudent: true,
        })
      } else {
        const id = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        student = {
          id,
          name,
          email,
          college,
          registrationId,
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
