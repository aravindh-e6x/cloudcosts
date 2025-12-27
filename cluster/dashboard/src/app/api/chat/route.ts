import { NextRequest, NextResponse } from "next/server"
import { runAgent } from "@/lib/ai/graph"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Run the LangGraph agent with workspace context
    const result = await runAgent(message, context)

    return NextResponse.json({
      answer: result.answer,
      sql: result.sql,
      queryResult: result.queryResult,
      error: result.error,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Failed to process message", details: String(error) },
      { status: 500 }
    )
  }
}
