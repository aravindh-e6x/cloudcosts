import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatters
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "Ki", "Mi", "Gi", "Ti"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function formatCpu(millicores: number): string {
  if (millicores >= 1000) return `${(millicores / 1000).toFixed(2)} cores`
  return `${millicores.toFixed(0)}m`
}

export function formatCurrency(value: number, decimals = 2): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

// Constants
export const ALLOWED_SCHEMAS = ["kubernetes", "vantage"]
export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
export const REFETCH_INTERVALS = { fast: 30000, normal: 60000, slow: 300000 }
