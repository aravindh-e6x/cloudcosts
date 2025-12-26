"use client"

import { useState, useEffect } from "react"
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "e6ds"
import { AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react"

interface DataHealthIndicatorProps {
  lastDataTimestamp: string | number | null
  dataSource: string
  expectedIntervalMinutes?: number // Expected interval between data points (default 5 min)
  warningThresholdMinutes?: number // Show warning after this many minutes (default 10 min)
  criticalThresholdMinutes?: number // Show critical after this many minutes (default 30 min)
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  onRefresh?: () => void
}

type HealthStatus = "healthy" | "warning" | "critical" | "unknown"

// Convert timestamp to milliseconds - handles nanoseconds (18 digits) from GrepTime
function parseTimestamp(timestamp: string | number): number {
  if (typeof timestamp === "number") {
    return timestamp > 1e15 ? Math.floor(timestamp / 1e6) : timestamp
  }
  const parsed = Number(timestamp)
  if (!isNaN(parsed)) {
    return parsed > 1e15 ? Math.floor(parsed / 1e6) : parsed
  }
  return new Date(timestamp).getTime()
}

export function DataHealthIndicator({
  lastDataTimestamp,
  dataSource,
  expectedIntervalMinutes = 5,
  warningThresholdMinutes = 10,
  criticalThresholdMinutes = 30,
  showLabel = true,
  size = "md",
  onRefresh,
}: DataHealthIndicatorProps) {
  const [status, setStatus] = useState<HealthStatus>("unknown")
  const [minutesAgo, setMinutesAgo] = useState<number | null>(null)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())
  const [parsedDate, setParsedDate] = useState<Date | null>(null)

  useEffect(() => {
    const calculateStatus = () => {
      if (!lastDataTimestamp) {
        setStatus("unknown")
        setMinutesAgo(null)
        setParsedDate(null)
        return
      }

      const timestampMs = parseTimestamp(lastDataTimestamp)
      const lastData = new Date(timestampMs)
      setParsedDate(lastData)

      const now = new Date()
      const diffMs = now.getTime() - lastData.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      setMinutesAgo(diffMinutes)
      setLastChecked(now)

      if (diffMinutes < warningThresholdMinutes) {
        setStatus("healthy")
      } else if (diffMinutes < criticalThresholdMinutes) {
        setStatus("warning")
      } else {
        setStatus("critical")
      }
    }

    calculateStatus()

    // Update status every minute
    const interval = setInterval(calculateStatus, 60000)
    return () => clearInterval(interval)
  }, [lastDataTimestamp, warningThresholdMinutes, criticalThresholdMinutes])

  const getStatusConfig = () => {
    switch (status) {
      case "healthy":
        return {
          icon: CheckCircle2,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
          borderColor: "border-emerald-500/20",
          label: "Data Flowing",
          description: `Last data received ${formatTimeAgo(minutesAgo)}`,
        }
      case "warning":
        return {
          icon: AlertTriangle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          label: "Data Delayed",
          description: `No data for ${formatTimeAgo(minutesAgo)}. Expected every ${expectedIntervalMinutes} min.`,
        }
      case "critical":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
          label: "Data Stopped",
          description: `No data for ${formatTimeAgo(minutesAgo)}. Check if ${dataSource} is running.`,
        }
      default:
        return {
          icon: Clock,
          color: "text-muted-foreground",
          bgColor: "bg-muted",
          borderColor: "border-muted",
          label: "Unknown",
          description: "No data timestamp available",
        }
    }
  }

  const formatTimeAgo = (minutes: number | null): string => {
    if (minutes === null) return "unknown"
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ${minutes % 60}m ago`
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h ago`
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1.5 ${textSize}`}>
            <Badge
              className={`${config.bgColor} ${config.color} ${config.borderColor} border cursor-help`}
            >
              <Icon className={`${iconSize} mr-1`} />
              {showLabel && config.label}
            </Badge>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`${iconSize} text-muted-foreground hover:text-foreground`} />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {parsedDate && (
              <p className="text-xs text-muted-foreground">
                Last data: {parsedDate.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Checked: {lastChecked.toLocaleTimeString()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Component to show data health for multiple sources
interface MultiSourceHealthProps {
  sources: {
    name: string
    lastTimestamp: string | number | null
    expectedInterval?: number
  }[]
}

export function MultiSourceDataHealth({ sources }: MultiSourceHealthProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => (
        <DataHealthIndicator
          key={source.name}
          lastDataTimestamp={source.lastTimestamp}
          dataSource={source.name}
          expectedIntervalMinutes={source.expectedInterval || 5}
          size="sm"
        />
      ))}
    </div>
  )
}
