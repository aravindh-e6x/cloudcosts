"use client"

import { useState, useEffect, useCallback } from "react"

interface QueryResult<T> {
  data: T[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useQuery<T = Record<string, unknown>>(
  database: string,
  sql: string,
  options?: { enabled?: boolean; refetchInterval?: number }
): QueryResult<T> {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const enabled = options?.enabled ?? true

  const fetchData = useCallback(async () => {
    if (!enabled || !sql) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, sql }),
      })

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [database, sql, enabled])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto refetch interval
  useEffect(() => {
    if (options?.refetchInterval && enabled) {
      const interval = setInterval(fetchData, options.refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, options?.refetchInterval, enabled])

  return { data, loading, error, refetch: fetchData }
}

// Helper to format bytes
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "Ki", "Mi", "Gi", "Ti"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

// Helper to format CPU (millicores to cores)
export function formatCpu(millicores: number): string {
  if (millicores >= 1000) {
    return `${(millicores / 1000).toFixed(2)} cores`
  }
  return `${millicores.toFixed(0)}m`
}

// Helper to format currency
export function formatCurrency(value: number, decimals = 2): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

// Helper to format date
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Helper to format time
export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}
