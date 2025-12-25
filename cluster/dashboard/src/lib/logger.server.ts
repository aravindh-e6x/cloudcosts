import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
})

export default logger

export const queryLogger = logger.child({ module: 'queries' })

export function logQuery(schema: string, queryName: string, params: Record<string, unknown>, sql: string): void {
  queryLogger.trace({ schema, queryName, params, sql: sql.trim() }, `${schema}.${queryName}`)
}
