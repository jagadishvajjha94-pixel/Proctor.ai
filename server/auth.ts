import type { Request, Response } from "express"
import { SignJWT, jwtVerify } from "jose"
import { store } from "../lib/store"
import type { Student } from "../lib/types"

const SESSION_SECRET = process.env.SESSION_SECRET
const SECRET_KEY = SESSION_SECRET
  ? new TextEncoder().encode(SESSION_SECRET)
  : new TextEncoder().encode("dev-fallback-secret-change-in-production")

async function sign(payload: object, maxAgeSeconds: number): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(SECRET_KEY)
}

async function verify(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export async function getSession(req: Request): Promise<{ id: string; email?: string; role: "student" | "admin" } | null> {
  const token = req.cookies?.session
  if (!token) return null
  const payload = await verify(token)
  if (!payload || !payload.id || !payload.role) return null
  return {
    id: String(payload.id),
    email: payload.email ? String(payload.email) : undefined,
    role: payload.role as "student" | "admin",
  }
}

export async function createSession(res: Response, student: Student): Promise<void> {
  const token = await sign(
    { id: student.id, email: student.email, role: "student" },
    60 * 60 * 4
  )
  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 4 * 1000,
    path: "/",
  })
}

export async function createAdminSession(res: Response): Promise<void> {
  const token = await sign({ id: "admin", role: "admin" }, 60 * 60 * 8)
  res.cookie("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8 * 1000,
    path: "/",
  })
}

export function destroySession(res: Response): void {
  res.clearCookie("session", { path: "/" })
}

export async function getAuthenticatedStudent(req: Request): Promise<Student | null> {
  const session = await getSession(req)
  if (!session || session.role !== "student") return null
  return (await store.getStudent(session.id)) || null
}
