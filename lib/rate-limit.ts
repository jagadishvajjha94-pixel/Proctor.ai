// Simple in-memory rate limiter for API protection (3000+ concurrent users)
// For multi-instance: use Redis or Upstash
const limitMap = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 100 // per IP per minute for general APIs

export function rateLimit(identifier: string, max = MAX_REQUESTS): boolean {
  const now = Date.now()
  const entry = limitMap.get(identifier)
  if (!entry) {
    limitMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (now > entry.resetAt) {
    limitMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}
