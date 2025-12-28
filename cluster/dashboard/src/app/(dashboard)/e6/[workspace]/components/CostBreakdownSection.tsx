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
  Skeleton,
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
import { useQuery } from "@/hooks/useQuery"
import { format } from "date-fns"

interface CostBreakdownSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate?: string
}

interface ComponentCost {
  component: string
  daily_cost: number
}

interface NamespaceCost {
  namespace: string
  daily_cost: number
}

interface ComponentPerNamespaceCost {
  namespace: string
  component: string
  daily_cost: number
}

interface TimeSeriesPoint {
  ts: string
  cost: number
}

type ModalType =
  | { type: "workspace"; component: string; dailyCost: number }
  | { type: "cluster"; namespace: string; component: string; dailyCost: number }
  | null

// Workspace-level components (shared)
const WORKSPACE_COMPONENTS = ["gateway", "storage", "schema"]

export function CostBreakdownSection({ eksCluster, dateRange, selectedDate }: CostBreakdownSectionProps) {
  const [modalState, setModalState] = useState<ModalType>(null)

  // Fetch cost by component
  const { data: componentCostData, loading: componentLoading } = useQuery<ComponentCost>(
    "workspace",
    "getCostByComponent",
    [dateRange]
  )

  // Fetch cost by component per namespace
  const { data: clusterCostData, loading: clusterLoading } = useQuery<ComponentPerNamespaceCost>(
    "workspace",
    "getCostByComponentPerNamespace",
    [dateRange]
  )

  // Fetch time series for selected component
  const { data: timeSeriesData } = useQuery<TimeSeriesPoint>(
    "workspace",
    "getCostTimeSeries",
    [
      modalState && "component" in modalState ? modalState.component : null,
      modalState?.type === "cluster" && "namespace" in modalState ? modalState.namespace : null,
      dateRange,
    ],
    { enabled: !!modalState }
  )

  const loading = componentLoading || clusterLoading

  // Separate workspace vs cluster component costs
  const { workspaceCosts, clusterCosts, namespaces, grandTotal } = useMemo(() => {
    const workspace: Array<ComponentCost & { percentage: number }> = []
    const cluster: Record<string, Array<ComponentPerNamespaceCost & { percentage: number }>> = {}
    const nsSet = new Set<string>()

    // Calculate totals
    let totalCost = 0
    if (componentCostData?.length) {
      totalCost = componentCostData.reduce((sum, c) => sum + (c.daily_cost || 0), 0)
    }

    // Process component costs
    if (componentCostData?.length) {
      componentCostData.forEach((row) => {
        if (WORKSPACE_COMPONENTS.includes(row.component)) {
          const cost = row.daily_cost || 0
          workspace.push({
            ...row,
            daily_cost: cost,
            percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
          })
        }
      })
    }

    // Process cluster costs
    if (clusterCostData?.length) {
      clusterCostData.forEach((row) => {
        nsSet.add(row.namespace)
        if (!cluster[row.namespace]) {
          cluster[row.namespace] = []
        }
        const cost = row.daily_cost || 0
        cluster[row.namespace].push({
          ...row,
          daily_cost: cost,
          percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        })
      })
    }

    // Sort by cost
    workspace.sort((a, b) => b.daily_cost - a.daily_cost)
    Object.values(cluster).forEach((components) => {
      components.sort((a, b) => b.daily_cost - a.daily_cost)
    })

    return {
      workspaceCosts: {
        components: workspace,
        total: workspace.reduce((sum, c) => sum + c.daily_cost, 0),
      },
      clusterCosts: cluster,
      namespaces: Array.from(nsSet).sort(),
      grandTotal: totalCost,
    }
  }, [componentCostData, clusterCostData])

  // Format time series data for chart
  const chartData = useMemo(() => {
    if (!timeSeriesData?.length) return []
    return timeSeriesData.map((d) => ({
      time: format(new Date(d.ts), "HH:mm"),
      cost: d.cost || 0,
    }))
  }, [timeSeriesData])

  // Get modal title
  const getModalTitle = () => {
    if (!modalState) return ""
    const componentName = modalState.component.charAt(0).toUpperCase() + modalState.component.slice(1)
    if (modalState.type === "cluster") {
      return `${modalState.namespace} / ${componentName} - Hourly Cost`
    }
    return `${componentName} - Hourly Cost`
  }

  // Color coding for cost (high % = red = expensive)
  const getCostColor = (pct: number) => {
    if (pct >= 50) return "bg-red-500"
    if (pct >= 30) return "bg-orange-400"
    return "bg-green-500"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
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
            {workspaceCosts.components.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No workspace components found</div>
            ) : (
              <div className="space-y-2">
                {workspaceCosts.components.map((row) => (
                  <div
                    key={row.component}
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 -mx-1 transition-colors"
                    onClick={() => setModalState({ type: "workspace", component: row.component, dailyCost: row.daily_cost })}
                  >
                    <div className="w-20 truncate text-sm font-medium capitalize">{row.component}</div>
                    <div className="flex-1 h-4 bg-muted overflow-hidden">
                      <div
                        className={`h-full ${getCostColor(row.percentage)}`}
                        style={{ width: `${Math.min(row.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-sm">${row.daily_cost.toFixed(0)}</div>
                    <div className="w-12 text-right text-xs text-muted-foreground">{row.percentage.toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            )}
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

            {namespaces.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No cluster components found</div>
            ) : (
              namespaces.map((namespace) => {
                const data = clusterCosts[namespace]
                if (!data) return null
                const nsTotal = data.reduce((sum, c) => sum + (c.daily_cost || 0), 0)
                return (
                  <div key={namespace} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">{namespace}</span>
                      <span className="text-sm">${nsTotal.toFixed(0)}/day</span>
                    </div>
                    <div className="space-y-1 pl-4 border-l-2 border-muted">
                      {data.map((row) => (
                        <div
                          key={row.component}
                          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 -mx-1 transition-colors"
                          onClick={() => setModalState({ type: "cluster", namespace, component: row.component, dailyCost: row.daily_cost })}
                        >
                          <div className="w-20 truncate text-sm capitalize text-muted-foreground">{row.component}</div>
                          <div className="flex-1 h-3 bg-muted overflow-hidden">
                            <div
                              className={`h-full ${getCostColor(row.percentage)}`}
                              style={{ width: `${Math.min(row.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="w-16 text-right text-sm">${row.daily_cost.toFixed(0)}</div>
                          <div className="w-12 text-right text-xs text-muted-foreground">{row.percentage.toFixed(0)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <p className="text-xs text-muted-foreground">Click any row to view hourly cost trend</p>
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
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No time series data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                    formatter={(value) => [`$${(value as number).toFixed(2)}/hr`, "Cost"]}
                  />
                  <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
