"use client"

import { useMemo } from "react"
import { DollarSign } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "e6ds"

interface CostBreakdownSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
}

// Mock data for cost by component
const MOCK_COMPONENT_COSTS = [
  { component: "executor", hourly_cost: 1.54 },
  { component: "gateway", hourly_cost: 0.38 },
  { component: "storage", hourly_cost: 0.32 },
  { component: "planner", hourly_cost: 0.19 },
  { component: "queue", hourly_cost: 0.10 },
  { component: "schema", hourly_cost: 0.15 },
]

// Mock data for cost by E6 cluster
const MOCK_E6_CLUSTER_COSTS = [
  { e6_cluster: "prod-analytics", hourly_cost: 1.42 },
  { e6_cluster: "prod-reporting", hourly_cost: 0.86 },
  { e6_cluster: "dev-testing", hourly_cost: 0.40 },
]

export function CostBreakdownSection({ eksCluster, dateRange }: CostBreakdownSectionProps) {
  // Calculate totals and percentages
  const componentCosts = useMemo(() => {
    const total = MOCK_COMPONENT_COSTS.reduce((sum, c) => sum + c.hourly_cost, 0)
    return MOCK_COMPONENT_COSTS.map(c => ({
      ...c,
      percentage: total > 0 ? (c.hourly_cost / total) * 100 : 0
    })).sort((a, b) => b.hourly_cost - a.hourly_cost)
  }, [])

  const e6ClusterCosts = useMemo(() => {
    const total = MOCK_E6_CLUSTER_COSTS.reduce((sum, c) => sum + c.hourly_cost, 0)
    return MOCK_E6_CLUSTER_COSTS.map(c => ({
      ...c,
      percentage: total > 0 ? (c.hourly_cost / total) * 100 : 0
    })).sort((a, b) => b.hourly_cost - a.hourly_cost)
  }, [])

  const totalHourlyCost = MOCK_COMPONENT_COSTS.reduce((sum, c) => sum + c.hourly_cost, 0)

  const getComponentColor = () => {
    return "bg-primary"
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Cost Breakdown
          </CardTitle>
          <span className="text-lg font-bold">${totalHourlyCost.toFixed(2)}/hr</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* By Component */}
          <div>
            <div className="text-xs text-muted-foreground mb-3">BY COMPONENT</div>
            <div className="space-y-2">
              {componentCosts.map((row) => (
                <div key={row.component} className="flex items-center gap-3">
                  <div className="w-28 truncate text-sm font-medium capitalize">
                    {row.component}
                  </div>
                  <div className="flex-1 h-4 bg-muted overflow-hidden">
                    <div
                      className={`h-full ${getComponentColor()}`}
                      style={{ width: `${Math.min(row.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm">
                    ${row.hourly_cost.toFixed(2)}
                  </div>
                  <div className="w-12 text-right text-xs text-muted-foreground">
                    {row.percentage.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By E6 Cluster */}
          <div>
            <div className="text-xs text-muted-foreground mb-3">BY E6 CLUSTER</div>
            <div className="space-y-2">
              {e6ClusterCosts.map((row) => (
                <div key={row.e6_cluster} className="flex items-center gap-3">
                  <div className="w-28 truncate text-sm font-medium">
                    {row.e6_cluster}
                  </div>
                  <div className="flex-1 h-4 bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(row.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm">
                    ${row.hourly_cost.toFixed(2)}/hr
                  </div>
                  <div className="w-12 text-right text-xs text-muted-foreground">
                    {row.percentage.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
