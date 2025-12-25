import pino from "pino"

// Server-side logger (no transport for Next.js compatibility)
export const serverLogger = pino({
  level: process.env.LOG_LEVEL || "info",
})

// Client-side logger (browser-safe)
export const clientLogger = {
  info: (msg: string, data?: Record<string, unknown>) => {
    console.log(`[INFO] ${msg}`, data || "")
  },
  error: (msg: string, data?: Record<string, unknown>) => {
    console.error(`[ERROR] ${msg}`, data || "")
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${msg}`, data || "")
  },
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${msg}`, data || "")
    }
  },
}
