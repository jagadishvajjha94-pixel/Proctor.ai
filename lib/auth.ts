"use server"

import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { store } from "./store"
import type { Student } from "./types"

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

export async function createSession(student: Student) {
  const cookieStore = await cookies()
  const token = await sign(
    { id: student.id, email: student.email, role: "student" },
    60 * 60 * 4 // 4 hours
  )
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 4,
    path: "/",
  })
  return token
}

export async function createAdminSession() {
  const cookieStore = await cookies()
  const token = await sign({ id: "admin", role: "admin" }, 60 * 60 * 8)
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
    path: "/",
  })
  return token
}

export async function getSession(): Promise<{ id: string; email?: string; role: "student" | "admin" } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null
  const payload = await verify(token)
  if (!payload || !payload.id || !payload.role) return null
  return {
    id: String(payload.id),
    email: payload.email ? String(payload.email) : undefined,
    role: payload.role as "student" | "admin",
  }
}

export async function getAuthenticatedStudent(): Promise<Student | null> {
  const session = await getSession()
  if (!session || session.role !== "student") return null
  return (await store.getStudent(session.id)) || null
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
