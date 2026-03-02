/**
 * Feature flags for optional modules (AI Interview, Proctoring).
 * Set VITE_ENABLE_INTERVIEW=true or VITE_ENABLE_PROCTORING=true to re-enable for future upgrades.
 */
const env = typeof import.meta !== "undefined" && import.meta.env
  ? (import.meta.env as Record<string, string | undefined>)
  : {}

export const features = {
  enableInterview: env.VITE_ENABLE_INTERVIEW === "true",
  enableProctoring: env.VITE_ENABLE_PROCTORING === "true",
} as const
