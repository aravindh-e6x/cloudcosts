import { NextRequest, NextResponse } from "next/server"
import { query, toObjects } from "@/lib/greptimedb"
import logger from "@/lib/logger.server"

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { database, sql } = body

    if (!database || !sql) {
      logger.warn({ database, hasSql: !!sql }, "API request missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: database, sql" },
        { status: 400 }
      )
    }

    logger.info({ database, sql }, "Executing query")

    const result = await query(database, sql)
    const data = toObjects(result)

    const duration = Date.now() - startTime
    logger.info({ database, rowCount: data.length, durationMs: duration }, "Query completed")

    return NextResponse.json({ data })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error({ error: error instanceof Error ? error.message : "Unknown error", durationMs: duration }, "Query failed")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    )
  }
}
