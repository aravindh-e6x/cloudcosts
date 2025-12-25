"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "laminar-ui"

interface ChangeIndicatorProps {
  value: number
  showIcon?: boolean
  showValue?: boolean
  reverseColors?: boolean // For cases where increase is good (e.g., revenue)
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ChangeIndicator({
  value,
  showIcon = true,
  showValue = true,
  reverseColors = false,
  className,
  size = "md",
}: ChangeIndicatorProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  // For costs: positive = bad (red), negative = good (green)
  // For revenue: positive = good (green), negative = bad (red)
  const colorClass = isNeutral
    ? "text-muted-foreground"
    : reverseColors
      ? isPositive
        ? "text-green-600"
        : "text-red-500"
      : isPositive
        ? "text-red-500"
        : "text-green-600"

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
  }

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <span className={cn("inline-flex items-center gap-1", colorClass, sizeClasses[size], className)}>
      {showIcon && (
        isPositive ? (
          <TrendingUp className={iconSize[size]} />
        ) : isNegative ? (
          <TrendingDown className={iconSize[size]} />
        ) : (
          <Minus className={iconSize[size]} />
        )
      )}
      {showValue && (
        <span>
          {isPositive ? "+" : ""}{value.toFixed(1)}%
        </span>
      )}
    </span>
  )
}

// Simplified badge version for tables
interface ChangeBadgeProps {
  value: number
  className?: string
}

export function ChangeBadge({ value, className }: ChangeBadgeProps) {
  const isPositive = value > 0
  const isNegative = value < 0

  const colorClass = isPositive
    ? "bg-red-100 text-red-700"
    : isNegative
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600"

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      colorClass,
      className
    )}>
      {isPositive ? "+" : ""}{value.toFixed(1)}%
    </span>
  )
}
