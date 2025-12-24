"use client"

import { Card, CardContent } from "laminar-ui"
import { formatCurrency } from "@/hooks/useQuery"
import { cn } from "laminar-ui"

interface BudgetCardProps {
  title: string
  actual: number
  target: number
  subtitle?: string
  className?: string
}

export function BudgetCard({ title, actual, target, subtitle, className }: BudgetCardProps) {
  const variance = actual - target
  const variancePercent = target > 0 ? (variance / target) * 100 : 0
  const isOverBudget = variance > 0

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(actual)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Target: {formatCurrency(target)}
        </p>
        <p className={cn(
          "text-sm font-medium mt-2",
          isOverBudget ? "text-red-500" : "text-green-600"
        )}>
          {isOverBudget ? "Over" : "Under"} by {formatCurrency(Math.abs(variance))} ({Math.abs(variancePercent).toFixed(1)}%)
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
