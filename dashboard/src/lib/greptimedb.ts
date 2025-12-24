const GREPTIMEDB_URL = process.env.GREPTIMEDB_URL
const GREPTIMEDB_USERNAME = process.env.GREPTIMEDB_USERNAME
const GREPTIMEDB_PASSWORD = process.env.GREPTIMEDB_PASSWORD

if (!GREPTIMEDB_URL || !GREPTIMEDB_USERNAME || !GREPTIMEDB_PASSWORD) {
  throw new Error("Missing required environment variables: GREPTIMEDB_URL, GREPTIMEDB_USERNAME, GREPTIMEDB_PASSWORD")
}

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
}

export async function query(database: string, sql: string): Promise<QueryResult> {
  const response = await fetch(`${GREPTIMEDB_URL}/v1/sql?db=${database}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${GREPTIMEDB_USERNAME}:${GREPTIMEDB_PASSWORD}`).toString("base64")}`,
    },
    body: new URLSearchParams({ sql }),
  })

  if (!response.ok) {
    throw new Error(`Query failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (data.output && data.output[0]?.records) {
    const records = data.output[0].records
    const columns = records.schema.column_schemas.map((col: { name: string }) => col.name)
    const rows = records.rows || []
    return { columns, rows }
  }

  return { columns: [], rows: [] }
}

export function toObjects<T = Record<string, unknown>>(result: QueryResult): T[] {
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    result.columns.forEach((col, i) => {
      obj[col] = row[i]
    })
    return obj as T
  })
}
