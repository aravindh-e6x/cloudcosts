import { NextResponse } from "next/server"
import { query } from "@/lib/greptimedb.server"

export async function GET() {
  const startTime = Date.now()

  try {
    await query("public", "SELECT 1 as health")
    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      status: "ok",
      latencyMs
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    )
  }
}
