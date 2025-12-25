import { NextRequest, NextResponse } from "next/server"
import logger from "@/lib/logger.server"

const VANTAGE_API_URL = process.env.VANTAGE_API_URL || "https://api.vantage.sh/v2"
const VANTAGE_API_TOKEN = process.env.VANTAGE_API_TOKEN

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  if (!VANTAGE_API_TOKEN) {
    logger.error("VANTAGE_API_TOKEN is not configured")
    return NextResponse.json(
      { error: "Vantage API is not configured" },
      { status: 500 }
    )
  }

  const endpoint = `/${path.join("/")}`
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${VANTAGE_API_URL}${endpoint}${searchParams ? `?${searchParams}` : ""}`

  logger.info({ endpoint, searchParams }, "Vantage API GET request")

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${VANTAGE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        { status: response.status, error: errorText },
        "Vantage API error"
      )
      return NextResponse.json(
        { error: `Vantage API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    logger.error({ error }, "Vantage API request failed")
    return NextResponse.json(
      { error: "Failed to fetch from Vantage API" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params

  if (!VANTAGE_API_TOKEN) {
    logger.error("VANTAGE_API_TOKEN is not configured")
    return NextResponse.json(
      { error: "Vantage API is not configured" },
      { status: 500 }
    )
  }

  const endpoint = `/${path.join("/")}`
  const url = `${VANTAGE_API_URL}${endpoint}`
  const body = await request.json()

  logger.info({ endpoint, body }, "Vantage API POST request")

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VANTAGE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        { status: response.status, error: errorText },
        "Vantage API error"
      )
      return NextResponse.json(
        { error: `Vantage API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    logger.error({ error }, "Vantage API request failed")
    return NextResponse.json(
      { error: "Failed to fetch from Vantage API" },
      { status: 500 }
    )
  }
}
