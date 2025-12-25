import logger from './logger.server'

const QUERY_TIMEOUT_MS = 30000

function getConfig() {
  const url = process.env.GREPTIMEDB_URL
  const username = process.env.GREPTIMEDB_USERNAME
  const password = process.env.GREPTIMEDB_PASSWORD

  if (!url || !username || !password) {
    throw new Error('Missing required environment variables: GREPTIMEDB_URL, GREPTIMEDB_USERNAME, GREPTIMEDB_PASSWORD')
  }

  return { url, username, password }
}

export async function query<T = Record<string, unknown>>(database: string, sql: string): Promise<T[]> {
  const startTime = Date.now()
  const config = getConfig()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)

  try {
    logger.debug({ database, sql: sql.substring(0, 200) }, 'Executing query')

    const response = await fetch(`${config.url}/v1/sql?db=${database}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      },
      body: new URLSearchParams({ sql }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ database, status: response.status, error: errorText }, 'Query failed')
      throw new Error(`Query failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const durationMs = Date.now() - startTime

    if (data.output && data.output[0]?.records) {
      const records = data.output[0].records
      const columns: string[] = records.schema.column_schemas.map((col: { name: string }) => col.name)
      const rows: unknown[][] = records.rows || []

      const result = rows.map((row) => {
        const obj: Record<string, unknown> = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        return obj as T
      })

      logger.debug({ database, rowCount: result.length, durationMs }, 'Query completed')
      return result
    }

    logger.debug({ database, rowCount: 0, durationMs }, 'Query completed (empty result)')
    return []
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({ database, timeoutMs: QUERY_TIMEOUT_MS }, 'Query timed out')
      throw new Error(`Query timed out after ${QUERY_TIMEOUT_MS}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
