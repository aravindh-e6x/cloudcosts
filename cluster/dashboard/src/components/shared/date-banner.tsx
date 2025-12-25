"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, Wifi, WifiOff } from "lucide-react"
import { useDate } from "@/components/providers"

const HEALTH_CHECK_INTERVAL = 5000 // 5 seconds
const STALE_THRESHOLD = 60000 // 1 minute

interface ConnectionStatus {
  isConnected: boolean
  lastSuccessTime: Date | null
  isStale: boolean
  latencyMs: number | null
}

export function DateBanner() {
  const { selectedDate, timeRange } = useDate()
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastSuccessTime: null,
    isStale: true,
    latencyMs: null
  })

  const checkConnectivity = useCallback(async () => {
    const startTime = Date.now()
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: "public",
          sql: "SELECT 1 as health"
        })
      })

      const latency = Date.now() - startTime

      if (response.ok) {
        setStatus({
          isConnected: true,
          lastSuccessTime: new Date(),
          isStale: false,
          latencyMs: latency
        })
      } else {
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          isStale: prev.lastSuccessTime
            ? Date.now() - prev.lastSuccessTime.getTime() > STALE_THRESHOLD
            : true
        }))
      }
    } catch {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isStale: prev.lastSuccessTime
          ? Date.now() - prev.lastSuccessTime.getTime() > STALE_THRESHOLD
          : true
      }))
    }
  }, [])

  // Check connectivity on mount and every 5 seconds
  useEffect(() => {
    checkConnectivity()
    const interval = setInterval(checkConnectivity, HEALTH_CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [checkConnectivity])

  // Check for staleness every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => {
        if (!prev.lastSuccessTime) return prev
        const isStale = Date.now() - prev.lastSuccessTime.getTime() > STALE_THRESHOLD
        if (isStale !== prev.isStale) {
          return { ...prev, isStale }
        }
        return prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Format the date nicely
  const formattedDate = timeRange?.from
    ? timeRange.from.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : selectedDate

  // Format last success time
  const formatLastSuccess = () => {
    if (!status.lastSuccessTime) return "Never"
    const now = new Date()
    const diff = now.getTime() - status.lastSuccessTime.getTime()

    if (diff < 5000) return "Just now"
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return status.lastSuccessTime.toLocaleTimeString()
  }

  // Determine status color
  const getStatusColor = () => {
    if (status.isConnected && !status.isStale) return "emerald"
    if (status.isStale) return "red"
    return "yellow"
  }

  const statusColor = getStatusColor()

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm">
      {/* Left side - Date info */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
          <Calendar className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-foreground">Showing data for: </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formattedDate}</span>
        </div>
      </div>

      {/* Right side - Connection status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
            statusColor === "emerald"
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : statusColor === "red"
              ? "bg-red-500/20 text-red-600 dark:text-red-400"
              : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
          }`}>
            {/* Animated pulse dot */}
            <span className="relative flex h-2.5 w-2.5">
              {status.isConnected && !status.isStale && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                statusColor === "emerald"
                  ? "bg-emerald-500"
                  : statusColor === "red"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`} />
            </span>

            {/* Icon */}
            {status.isConnected && !status.isStale ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}

            {/* Status text */}
            <span className="text-xs font-medium">
              {status.isConnected && !status.isStale
                ? "Live"
                : status.isStale
                ? "Offline"
                : "Connecting..."}
            </span>
          </div>

          {/* Last sync time */}
          <div className="text-xs text-muted-foreground border-l border-border pl-3">
            <span className="opacity-75">Last sync: </span>
            <span className={`font-medium ${
              status.isStale ? "text-red-500" : ""
            }`}>
              {formatLastSuccess()}
            </span>
            {status.latencyMs !== null && status.isConnected && !status.isStale && (
              <span className="opacity-50 ml-1">({status.latencyMs}ms)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
