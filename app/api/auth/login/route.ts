import { store } from "@/lib/store"
import { createSession, createAdminSession } from "@/lib/auth"
import type { Student } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const { email, password, registrationId, name, college } = (await req.json()) as {
      email: string
      password: string
      registrationId?: string
      name?: string
      college?: string
    }

    // Admin login (use ADMIN_PASSWORD env in production)
    const adminPass = process.env.ADMIN_PASSWORD ?? "admin123"
    if (email === "admin@proctorai.com" && password === adminPass) {
      await createAdminSession()
      return Response.json({ role: "admin", redirect: "/admin" })
    }

    // Student login/registration
    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 })
    }

    let student = await store.getStudentByEmail(email)

    if (!student) {
      // If demo password, try to find by any matching criteria or create
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
        return Response.json({
          error: "New students must provide name, registration ID, and college",
          isNewStudent: true,
        }, { status: 400 })
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

    await createSession(student)
    return Response.json({
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
    return Response.json({ error: "Authentication failed" }, { status: 500 })
  }
}
