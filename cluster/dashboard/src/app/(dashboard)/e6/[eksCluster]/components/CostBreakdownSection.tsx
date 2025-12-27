"use client"

import { useMemo, useState } from "react"
import { DollarSign, Info, Server, Layers } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "e6ds"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"

interface CostBreakdownSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate?: string
}

// Workspace-level component costs (shared across all E6 clusters)
const WORKSPACE_COMPONENT_COSTS = [
  { component: "gateway", daily_cost: 9.12 },
  { component: "storage", daily_cost: 7.68 },
  { component: "schema", daily_cost: 3.60 },
]

// Cluster-level component costs (per E6 cluster)
const CLUSTER_COMPONENT_COSTS: Record<string, { component: string; daily_cost: number }[]> = {
  "prod-analytics": [
    { component: "executor", daily_cost: 18.48 },
    { component: "planner", daily_cost: 2.88 },
    { component: "queue", daily_cost: 1.44 },
  ],
  "prod-reporting": [
    { component: "executor", daily_cost: 11.52 },
    { component: "planner", daily_cost: 1.44 },
    { component: "queue", daily_cost: 0.72 },
  ],
  "dev-testing": [
    { component: "executor", daily_cost: 5.76 },
    { component: "planner", daily_cost: 0.72 },
    { component: "queue", daily_cost: 0.36 },
  ],
}

const E6_CLUSTERS = ["prod-analytics", "prod-reporting", "dev-testing"]

// Generate mock time series for cost
const generateCostTimeSeries = (dailyCost: number) => {
  const data = []
  const hourlyCost = dailyCost / 24
  for (let i = 0; i < 24; i++) {
    const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.3 + 0.7
    const noise = 0.9 + Math.random() * 0.2
    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      cost: hourlyCost * hourFactor * noise,
    })
  }
  return data
}

type ModalType =
  | { type: 'workspace'; component: string; dailyCost: number }
  | { type: 'cluster'; e6Cluster: string; component: string; dailyCost: number }
  | null

export function CostBreakdownSection({ eksCluster, dateRange, selectedDate }: CostBreakdownSectionProps) {
  const [modalState, setModalState] = useState<ModalType>(null)

  // Calculate workspace component totals and percentages
  const workspaceCosts = useMemo(() => {
    const total = WORKSPACE_COMPONENT_COSTS.reduce((sum, c) => sum + c.daily_cost, 0)
    return {
      components: WORKSPACE_COMPONENT_COSTS.map(c => ({
        ...c,
        percentage: total > 0 ? (c.daily_cost / total) * 100 : 0
      })).sort((a, b) => b.daily_cost - a.daily_cost),
      total,
    }
  }, [])

  // Calculate cluster component costs per E6 cluster
  const clusterCosts = useMemo(() => {
    const result: Record<string, { components: typeof workspaceCosts.components; total: number }> = {}
    for (const cluster of E6_CLUSTERS) {
      const components = CLUSTER_COMPONENT_COSTS[cluster] || []
      const total = components.reduce((sum, c) => sum + c.daily_cost, 0)
      result[cluster] = {
        components: components.map(c => ({
          ...c,
          percentage: total > 0 ? (c.daily_cost / total) * 100 : 0
        })).sort((a, b) => b.daily_cost - a.daily_cost),
        total,
      }
    }
    return result
  }, [])

  // Grand total
  const grandTotal = useMemo(() => {
    const clusterTotal = E6_CLUSTERS.reduce((sum, cluster) => sum + (clusterCosts[cluster]?.total || 0), 0)
    return workspaceCosts.total + clusterTotal
  }, [workspaceCosts, clusterCosts])

  // Generate chart data
  const chartData = useMemo(() => {
    if (!modalState) return []
    return generateCostTimeSeries(modalState.dailyCost)
  }, [modalState])

  // Get modal title
  const getModalTitle = () => {
    if (!modalState) return ''
    const componentName = modalState.component.charAt(0).toUpperCase() + modalState.component.slice(1)
    if (modalState.type === 'cluster') {
      return `${modalState.e6Cluster} / ${componentName} - Hourly Cost`
    }
    return `${componentName} - Hourly Cost`
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" />
              Cost Breakdown
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">Compute costs allocated by component based on resource usage</p>
                  <p className="text-xs text-muted-foreground mt-1">Metrics: node_total_hourly_cost, container_cpu_allocation</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <span className="text-lg font-bold">${grandTotal.toFixed(0)}/day</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workspace Components */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">WORKSPACE COMPONENTS</span>
                <span className="text-xs text-muted-foreground">(shared)</span>
              </div>
              <span className="text-sm font-medium">${workspaceCosts.total.toFixed(0)}/day</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mb-2">
              <div className="w-20">COMPONENT</div>
              <div className="flex-1"></div>
              <div className="w-16 text-right">COST</div>
              <div className="w-12 text-right">%</div>
            </div>
            <div className="space-y-2">
              {workspaceCosts.components.map((row) => (
                <div
                  key={row.component}
                  className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 -mx-1 transition-colors"
                  onClick={() => setModalState({ type: 'workspace', component: row.component, dailyCost: row.daily_cost })}
                >
                  <div className="w-20 truncate text-sm font-medium capitalize">
                    {row.component}
                  </div>
                  <div className="flex-1 h-4 bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(row.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm">
                    ${row.daily_cost.toFixed(0)}
                  </div>
                  <div className="w-12 text-right text-xs text-muted-foreground">
                    {row.percentage.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster Components */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">CLUSTER COMPONENTS</span>
              <span className="text-xs text-muted-foreground">(per E6 cluster)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mb-2">
              <div className="w-20">COMPONENT</div>
              <div className="flex-1"></div>
              <div className="w-16 text-right">COST</div>
              <div className="w-12 text-right">%</div>
            </div>

            {E6_CLUSTERS.map((e6Cluster) => {
              const data = clusterCosts[e6Cluster]
              if (!data) return null
              return (
                <div key={e6Cluster} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">{e6Cluster}</span>
                    <span className="text-sm">${data.total.toFixed(0)}/day</span>
                  </div>
                  <div className="space-y-1 pl-4 border-l-2 border-muted">
                    {data.components.map((row) => (
                      <div
                        key={row.component}
                        className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 -mx-1 transition-colors"
                        onClick={() => setModalState({ type: 'cluster', e6Cluster, component: row.component, dailyCost: row.daily_cost })}
                      >
                        <div className="w-20 truncate text-sm capitalize text-muted-foreground">
                          {row.component}
                        </div>
                        <div className="flex-1 h-3 bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(row.percentage, 100)}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-sm">
                          ${row.daily_cost.toFixed(0)}
                        </div>
                        <div className="w-12 text-right text-xs text-muted-foreground">
                          {row.percentage.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Click any row to view hourly cost trend
          </p>
        </CardContent>
      </Card>

      {/* Time Series Modal */}
      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {getModalTitle()} {selectedDate && `- ${selectedDate}`}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickLine={false}
                  axisLine={{ stroke: '#ccc' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickLine={false}
                  axisLine={{ stroke: '#ccc' }}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`$${(value as number).toFixed(2)}/hr`, 'Cost']}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
