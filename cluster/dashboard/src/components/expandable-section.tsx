"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "e6ds"
import { ChevronDown, ChevronRight } from "lucide-react"
import { formatCurrency } from "@/hooks/useQuery"
import { cn } from "e6ds"

interface ExpandableSectionProps {
  title: string
  subtitle?: string
  owner?: string
  total: number
  compute?: number
  nonCompute?: number
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

export function ExpandableSection({
  title,
  subtitle,
  owner,
  total,
  compute,
  nonCompute,
  children,
  defaultExpanded = false,
  className,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const computePercent = compute && total > 0 ? (compute / total) * 100 : 0
  const nonComputePercent = nonCompute && total > 0 ? (nonCompute / total) * 100 : 0

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button className="mt-1 text-muted-foreground">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
              {owner && (
                <p className="text-sm text-muted-foreground">Owner: {owner}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{formatCurrency(total)}</p>
            </div>
            {compute !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Compute</p>
                <p className="text-lg font-semibold">{formatCurrency(compute)}</p>
                <p className="text-xs text-muted-foreground">{computePercent.toFixed(1)}%</p>
              </div>
            )}
            {nonCompute !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Non-Compute</p>
                <p className="text-lg font-semibold">{formatCurrency(nonCompute)}</p>
                <p className="text-xs text-muted-foreground">{nonComputePercent.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 border-t">
          {children}
        </CardContent>
      )}
    </Card>
  )
}
