"use client"

import { ReactNode } from "react"
import { QueryError, EmptyState } from "./error-boundary"

interface DataWrapperProps<T> {
  data: T[] | null
  loading: boolean
  error: string | null
  loadingSkeleton: ReactNode
  emptyMessage?: string
  children: (data: T[]) => ReactNode
  onRetry?: () => void
}

export function DataWrapper<T>({
  data,
  loading,
  error,
  loadingSkeleton,
  emptyMessage = "No data available",
  children,
  onRetry,
}: DataWrapperProps<T>) {
  if (loading) return <>{loadingSkeleton}</>
  if (error) return <QueryError message={error} onRetry={onRetry} />
  if (!data || data.length === 0) return <EmptyState message={emptyMessage} />
  return <>{children(data)}</>
}

// Simplified version for inline use
interface InlineLoaderProps {
  loading: boolean
  error?: string | null
  skeleton: ReactNode
  children: ReactNode
}

export function InlineLoader({ loading, error, skeleton, children }: InlineLoaderProps) {
  if (loading) return <>{skeleton}</>
  if (error) return <span className="text-destructive text-sm">{error}</span>
  return <>{children}</>
}
