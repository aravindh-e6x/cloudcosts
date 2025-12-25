"use client"

import { Card, CardContent } from "laminar-ui"
import { formatCurrency } from "@/hooks/useQuery"
import { cn } from "laminar-ui"
import { TrendingUp, TrendingDown } from "lucide-react"
import { InfoPopover } from "./info-popover"

interface ComparisonCardProps {
  title: string
  current: number
  previous: number
  currentLabel: string
  previousLabel: string
  className?: string
  description?: string
  sql?: string
}

export function ComparisonCard({
  title,
  current,
  previous,
  currentLabel,
  previousLabel,
  className,
  description,
  sql,
}: ComparisonCardProps) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const absoluteChange = current - previous
  const isIncrease = change > 0
  const isDecrease = change < 0

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {description && (
        <div className="absolute top-2 right-2">
          <InfoPopover title={title} description={description} sql={sql} />
        </div>
      )}
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{currentLabel}</span>
            <span className="text-2xl font-bold">{formatCurrency(current)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">{previousLabel}</span>
            <span className="text-lg text-muted-foreground">{formatCurrency(previous)}</span>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium mt-3",
          isIncrease ? "text-red-500" : isDecrease ? "text-green-600" : "text-muted-foreground"
        )}>
          {isIncrease ? (
            <TrendingUp className="h-4 w-4" />
          ) : isDecrease ? (
            <TrendingDown className="h-4 w-4" />
          ) : null}
          <span>
            {isIncrease ? "+" : ""}{change.toFixed(1)}% ({formatCurrency(absoluteChange)})
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
