import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/greptimedb.server"
import logger from "@/lib/logger.server"
import * as kubernetesQueries from "@/lib/queries/kubernetes.server"
import * as vantageQueries from "@/lib/queries/vantage.server"
import * as e6Queries from "@/lib/queries/e6.server"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryModule = Record<string, (...args: any[]) => string>

// Query registry mapping query names to functions
const queryRegistry: Record<string, QueryModule> = {
  kubernetes: kubernetesQueries as QueryModule,
  vantage: vantageQueries as QueryModule,
  e6: e6Queries as QueryModule,
}

// Database mapping for each schema
const databaseMap: Record<string, string> = {
  kubernetes: "kubernetes",
  vantage: "vantage",
  e6: "e6",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { schema, queryName, params } = body

    if (!schema || !queryName) {
      logger.warn({ schema, queryName }, "API request missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: schema, queryName" },
        { status: 400 }
      )
    }

    const schemaQueries = queryRegistry[schema]
    if (!schemaQueries) {
      logger.warn({ schema }, "Unknown schema")
      return NextResponse.json(
        { error: `Unknown schema: ${schema}` },
        { status: 400 }
      )
    }

    const queryFn = schemaQueries[queryName]
    if (!queryFn || typeof queryFn !== "function") {
      logger.warn({ schema, queryName }, "Unknown query")
      return NextResponse.json(
        { error: `Unknown query: ${schema}.${queryName}` },
        { status: 400 }
      )
    }

    // Generate SQL from query function with params
    const sql = params ? queryFn(...params) : queryFn()
    const database = databaseMap[schema]

    const data = await query(database, sql)
    return NextResponse.json({ data })
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : "Unknown error" }, "Query failed")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    )
  }
}
