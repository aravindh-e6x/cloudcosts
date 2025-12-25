// Query exports - organized by schema
// Each schema has its own file with functions that take date parameters

export * as e6Queries from './e6.server'
export * as kubernetesQueries from './kubernetes.server'
export * as vantageQueries from './vantage.server'

// Re-export DateRange type for convenience
export interface DateRange {
  startTs: string
  endTs: string
}
