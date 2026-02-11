import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const limitMap = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 150 // per IP per minute

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown"
}

function checkLimit(ip: string): boolean {
  const now = Date.now()
  const entry = limitMap.get(ip)
  if (!entry) {
    limitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (now > entry.resetAt) {
    limitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_REQUESTS) return false
  entry.count++
  return true
}

export function middleware(request: NextRequest) {
  const ip = getIp(request)
  if (!checkLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
