"use client"

import { Card, CardContent } from "laminar-ui"
import { formatCurrency } from "@/hooks/useQuery"
import { cn } from "laminar-ui"
import { TrendingUp, TrendingDown } from "lucide-react"

interface ComparisonCardProps {
  title: string
  current: number
  previous: number
  currentLabel?: string
  previousLabel?: string
  className?: string
}

export function ComparisonCard({
  title,
  current,
  previous,
  currentLabel = "Current",
  previousLabel = "Previous",
  className,
}: ComparisonCardProps) {
  const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
  const absoluteChange = current - previous
  const isIncrease = change > 0
  const isDecrease = change < 0

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(current)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          vs {formatCurrency(previous)}
        </p>
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium mt-2",
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
