"use client"

import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query"

// Re-export formatters from utils for backward compatibility
export { formatBytes, formatCpu, formatCurrency, formatDate, formatTime } from "@/lib/utils"

interface QueryOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
}

async function fetchQuery<T>(database: string, sql: string): Promise<T[]> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ database, sql }),
  })

  if (!response.ok) throw new Error(`Query failed: ${response.status}`)

  const result = await response.json()
  if (result.error) throw new Error(result.error)

  return result.data || []
}

// Generate a stable query key from database and SQL
function getQueryKey(database: string, sql: string): string[] {
  // Create a hash of the SQL for the key (simple version)
  const sqlHash = sql.replace(/\s+/g, " ").trim().slice(0, 100)
  return ["greptimedb", database, sqlHash]
}

export function useQuery<T = Record<string, unknown>>(
  database: string,
  sql: string,
  options?: QueryOptions
) {
  const queryKey = getQueryKey(database, sql)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useTanstackQuery({
    queryKey,
    queryFn: () => fetchQuery<T>(database, sql),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 60 * 1000,
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  }
}

// Hook to prefetch queries
export function usePrefetchQuery() {
  const queryClient = useQueryClient()

  return (database: string, sql: string) => {
    const queryKey = getQueryKey(database, sql)
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchQuery(database, sql),
    })
  }
}

// Hook to invalidate queries
export function useInvalidateQuery() {
  const queryClient = useQueryClient()

  return (database?: string) => {
    if (database) {
      queryClient.invalidateQueries({ queryKey: ["greptimedb", database] })
    } else {
      queryClient.invalidateQueries({ queryKey: ["greptimedb"] })
    }
  }
}
