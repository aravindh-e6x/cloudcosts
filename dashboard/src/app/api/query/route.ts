import { NextRequest, NextResponse } from "next/server"
import { query, toObjects } from "@/lib/greptimedb"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { database, sql } = body

    if (!database || !sql) {
      return NextResponse.json(
        { error: "Missing required fields: database, sql" },
        { status: 400 }
      )
    }

    const result = await query(database, sql)
    const data = toObjects(result)

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Query error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    )
  }
}
