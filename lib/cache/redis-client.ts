/**
 * Redis client for session management & rate limiting (Upstash)
 * Falls back to in-memory when REDIS_URL not set
 */
let redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: { ex?: number }) => Promise<unknown>; incr: (k: string) => Promise<number> } | null = null
const memoryStore = new Map<string, { value: string; expires?: number }>()

async function getRedis() {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    const { Redis } = await import("@upstash/redis")
    redis = new Redis({ url, token }) as typeof redis
    return redis
  }
  return null
}

export async function cacheGet(key: string): Promise<string | null> {
  const r = await getRedis()
  if (r) return r.get(key)
  const e = memoryStore.get(key)
  if (!e) return null
  if (e.expires && e.expires < Date.now()) {
    memoryStore.delete(key)
    return null
  }
  return e.value
}

export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const r = await getRedis()
  if (r) {
    await r.set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined)
    return
  }
  memoryStore.set(key, {
    value,
    expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
  })
}

export async function cacheIncr(key: string): Promise<number> {
  const r = await getRedis()
  if (r) return r.incr(key)
  const k = `__incr_${key}`
  const prev = memoryStore.get(k)?.value ?? "0"
  const next = parseInt(prev, 10) + 1
  memoryStore.set(k, { value: String(next) })
  return next
}
