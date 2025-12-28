"use client"

import { useMemo, useState } from "react"
import { TrendingDown, ArrowRight, ChevronDown, ChevronRight } from "lucide-react"
import { EngineSnapshot, CostBreakdown, RightSizingRecommendation, ScalingRecommendation } from "./types"

interface CostViewProps {
  clusterSnapshots: Map<string, EngineSnapshot>
}

export function CostView({ clusterSnapshots }: CostViewProps) {
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null)

  // Aggregate cost data
  const costData = useMemo(() => {
    const clusterCosts: {
      cluster: string
      costPerHour: number
      potentialSavings: number
      breakdown: CostBreakdown[]
      rightSizing: RightSizingRecommendation[]
      scaling: ScalingRecommendation[]
    }[] = []

    let totalCost = 0
    let totalSavings = 0

    clusterSnapshots.forEach((snapshot, cluster) => {
      totalCost += snapshot.totalCostPerHour
      totalSavings += snapshot.potentialSavingsPerHour

      clusterCosts.push({
        cluster,
        costPerHour: snapshot.totalCostPerHour,
        potentialSavings: snapshot.potentialSavingsPerHour,
        breakdown: snapshot.costBreakdown,
        rightSizing: snapshot.rightSizingRecommendations,
        scaling: snapshot.scalingRecommendations,
      })
    })

    // Sort by cost descending
    clusterCosts.sort((a, b) => b.costPerHour - a.costPerHour)

    return {
      clusterCosts,
      totalCost,
      totalSavings,
      dailyCost: totalCost * 24,
      monthlyCost: totalCost * 24 * 30,
    }
  }, [clusterSnapshots])

  // Component cost aggregation
  const componentCosts = useMemo(() => {
    const costs: Record<string, { total: number; instances: number }> = {}

    clusterSnapshots.forEach((snapshot) => {
      snapshot.costBreakdown.forEach((c) => {
        if (!costs[c.component]) {
          costs[c.component] = { total: 0, instances: 0 }
        }
        costs[c.component].total += c.totalCost
        costs[c.component].instances += c.instanceCount
      })
    })

    return Object.entries(costs)
      .map(([component, data]) => ({
        component,
        ...data,
        percentOfTotal: (data.total / costData.totalCost) * 100,
      }))
      .sort((a, b) => b.total - a.total)
  }, [clusterSnapshots, costData.totalCost])

  return (
    <div className="space-y-6">
      {/* Cost Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="text-xs text-muted-foreground">Hourly Cost</div>
          <div className="text-2xl font-bold">${costData.totalCost.toFixed(2)}</div>
        </div>
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="text-xs text-muted-foreground">Daily Cost</div>
          <div className="text-2xl font-bold">${costData.dailyCost.toFixed(2)}</div>
        </div>
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="text-xs text-muted-foreground">Monthly Estimate</div>
          <div className="text-2xl font-bold">${costData.monthlyCost.toFixed(0)}</div>
        </div>
        <div className="border rounded-lg p-4 bg-green-100 border-green-300">
          <div className="text-xs text-green-700">Potential Savings</div>
          <div className="text-2xl font-bold text-green-700">
            -${(costData.totalSavings * 24 * 30).toFixed(0)}/mo
          </div>
          <div className="text-xs text-green-600">
            {((costData.totalSavings / costData.totalCost) * 100).toFixed(0)}% reduction
          </div>
        </div>
      </div>

      {/* Cost by Component */}
      <div>
        <div className="text-sm font-medium mb-3">Cost by Component (All Clusters)</div>
        <div className="space-y-2">
          {componentCosts.map((c) => (
            <div key={c.component} className="flex items-center gap-3">
              <div className="w-20 text-sm font-medium">{c.component}</div>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all flex items-center justify-end pr-2"
                  style={{ width: `${c.percentOfTotal}%` }}
                >
                  {c.percentOfTotal > 15 && (
                    <span className="text-[10px] text-white font-medium">
                      {c.percentOfTotal.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-24 text-right">
                <span className="text-sm font-bold">${c.total.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">/hr</span>
              </div>
              <div className="w-16 text-xs text-muted-foreground text-right">
                {c.instances} pods
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost by Cluster with Recommendations */}
      <div>
        <div className="text-sm font-medium mb-3">Cost by Cluster</div>
        <div className="space-y-2">
          {costData.clusterCosts.map((cc) => (
            <div key={cc.cluster} className="border rounded-lg overflow-hidden">
              {/* Cluster Header */}
              <div
                className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedCluster(expandedCluster === cc.cluster ? null : cc.cluster)}
              >
                <div className="flex items-center gap-2">
                  {expandedCluster === cc.cluster ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{cc.cluster}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    <span className="font-bold">${cc.costPerHour.toFixed(2)}</span>
                    <span className="text-muted-foreground">/hr</span>
                  </span>
                  {cc.potentialSavings > 0 && (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <TrendingDown className="h-3.5 w-3.5" />
                      -${cc.potentialSavings.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedCluster === cc.cluster && (
                <div className="p-3 border-t space-y-4">
                  {/* Component Breakdown */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Component Breakdown</div>
                    <div className="grid grid-cols-5 gap-2">
                      {cc.breakdown.map((b) => (
                        <div key={b.component} className="border rounded p-2 text-center">
                          <div className="text-xs text-muted-foreground">{b.component}</div>
                          <div className="text-sm font-bold">${b.totalCost.toFixed(2)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {b.instanceCount} × (CPU: ${b.cpuCost.toFixed(2)} + Mem: ${b.memoryCost.toFixed(2)})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right-sizing Recommendations */}
                  {cc.rightSizing.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Right-sizing Recommendations</div>
                      <div className="space-y-2">
                        {cc.rightSizing.map((r, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                            <div className="flex-1">
                              <span className="font-medium">{r.instance}</span>
                              <span className="text-muted-foreground ml-2">{r.reason}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {r.currentCpu} CPU / {r.currentMemGb}GB
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-medium text-green-700">
                                {r.recommendedCpu} CPU / {r.recommendedMemGb}GB
                              </span>
                            </div>
                            <div className="text-green-700 font-bold">
                              -${r.savingsPerHour.toFixed(2)}/hr
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scaling Recommendations */}
                  {cc.scaling.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Scaling Recommendations</div>
                      <div className="space-y-2">
                        {cc.scaling.map((s, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 p-2 border rounded text-sm ${
                              s.direction === "scale_down"
                                ? "bg-green-50 border-green-200"
                                : "bg-yellow-50 border-yellow-200"
                            }`}
                          >
                            <div className="flex-1">
                              <span className="font-medium capitalize">{s.component}</span>
                              <span className="text-muted-foreground ml-2">{s.reason}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">{s.currentCount} pods</span>
                              <ArrowRight className="h-3 w-3" />
                              <span
                                className={`font-medium ${
                                  s.direction === "scale_down" ? "text-green-700" : "text-yellow-700"
                                }`}
                              >
                                {s.recommendedCount} pods
                              </span>
                            </div>
                            <div className={`text-xs ${s.direction === "scale_down" ? "text-green-700" : "text-yellow-700"}`}>
                              {s.impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cc.rightSizing.length === 0 && cc.scaling.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      No optimization recommendations at this time
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
