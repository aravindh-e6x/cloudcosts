"use client"

import { useQuery as useTanstackQuery, useQueryClient } from "@tanstack/react-query"

// Re-export formatters from utils for backward compatibility
export { formatBytes, formatCpu, formatCurrency, formatDate, formatTime } from "@/lib/utils"

interface QueryOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
  database?: string // Optional custom database (for e6 customer-specific databases)
}

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  threshold: 5, // Open circuit after 5 failures
  resetTimeout: 30000, // Reset after 30 seconds
}

function checkCircuitBreaker(): boolean {
  if (!circuitBreaker.isOpen) return true

  // Check if we should reset the circuit
  if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
    circuitBreaker.isOpen = false
    circuitBreaker.failures = 0
    return true
  }

  return false
}

function recordSuccess() {
  circuitBreaker.failures = 0
  circuitBreaker.isOpen = false
}

function recordFailure() {
  circuitBreaker.failures++
  circuitBreaker.lastFailure = Date.now()

  if (circuitBreaker.failures >= circuitBreaker.threshold) {
    circuitBreaker.isOpen = true
    console.warn(`Circuit breaker opened after ${circuitBreaker.failures} failures. Will retry after ${circuitBreaker.resetTimeout}ms`)
  }
}

async function fetchQuery<T>(schema: string, queryName: string, params?: unknown[], database?: string): Promise<T[]> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    throw new Error('Circuit breaker is open - too many failures. Retrying soon...')
  }

  try {
    const response = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema, queryName, params, database }),
    })

    if (!response.ok) {
      recordFailure()
      throw new Error(`Query failed: ${response.status}`)
    }

    const result = await response.json()
    if (result.error) {
      recordFailure()
      throw new Error(result.error)
    }

    recordSuccess()
    return result.data || []
  } catch (error) {
    recordFailure()
    throw error
  }
}

// Generate a stable query key from schema, queryName, params, and database
function getQueryKey(schema: string, queryName: string, params?: unknown[], database?: string): unknown[] {
  return ["greptimedb", schema, queryName, database, ...(params || [])]
}

// Exponential backoff retry delay
function retryDelay(attemptIndex: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped)
  return Math.min(1000 * Math.pow(2, attemptIndex), 16000)
}

export function useQuery<T = Record<string, unknown>>(
  schema: string,
  queryName: string,
  params?: unknown[],
  options?: QueryOptions
) {
  const queryKey = getQueryKey(schema, queryName, params, options?.database)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useTanstackQuery({
    queryKey,
    queryFn: () => fetchQuery<T>(schema, queryName, params, options?.database),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default stale time
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 3, // Retry 3 times
    retryDelay, // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when reconnecting
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

  return (schema: string, queryName: string, params?: unknown[]) => {
    const queryKey = getQueryKey(schema, queryName, params)
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchQuery(schema, queryName, params),
    })
  }
}

// Hook to invalidate queries
export function useInvalidateQuery() {
  const queryClient = useQueryClient()

  return (schema?: string) => {
    if (schema) {
      queryClient.invalidateQueries({ queryKey: ["greptimedb", schema] })
    } else {
      queryClient.invalidateQueries({ queryKey: ["greptimedb"] })
    }
  }
}

// Get circuit breaker status
export function getCircuitBreakerStatus() {
  return {
    isOpen: circuitBreaker.isOpen,
    failures: circuitBreaker.failures,
    lastFailure: circuitBreaker.lastFailure,
  }
}
