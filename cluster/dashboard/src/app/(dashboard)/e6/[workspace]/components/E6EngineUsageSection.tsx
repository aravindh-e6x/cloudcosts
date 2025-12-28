"use client"

import { useMemo, useState } from "react"
import { Gauge, TrendingUp, Info } from "lucide-react"
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
  BarChart,
  Bar,
} from "recharts"
import { useQuery } from "@/hooks/useQuery"
import { format } from "date-fns"

interface E6EngineUsageSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

interface ClusterUsage {
  e6_cluster: string
  queries_completed: number
  queries_succeeded: number
  queries_failed: number
  avg_query_time_ms: number
  active_connections: number
}

interface TimeSeriesPoint {
  ts: string
  value: number
}

type ModalState =
  | { type: "cluster"; cluster: string }
  | { type: "metric"; metric: "queries" | "success_rate" | "failed" | "avg_time" | "connections" }
  | null

const METRIC_LABELS: Record<string, string> = {
  queries: "Queries",
  success_rate: "Success Rate",
  failed: "Failed Queries",
  avg_time: "Avg Query Time",
  connections: "Active Connections",
}

export function E6EngineUsageSection({ eksCluster, dateRange, selectedDate }: E6EngineUsageSectionProps) {
  const [modalState, setModalState] = useState<ModalState>(null)

  // Fetch E6 engine usage by cluster
  const { data: usageData, loading } = useQuery<ClusterUsage>(
    "workspace",
    "getE6EngineUsageByCluster",
    [dateRange]
  )

  // Fetch time series for selected metric/cluster
  const { data: timeSeriesData } = useQuery<TimeSeriesPoint>(
    "workspace",
    "getQueryTimeSeries",
    [modalState?.type === "metric" ? modalState.metric : "queries", dateRange],
    { enabled: !!modalState }
  )

  const clusters = usageData || []

  const totals = useMemo(() => {
    if (!clusters.length) {
      return {
        completed: 0,
        succeeded: 0,
        failed: 0,
        successRate: "0",
        avgQueryTime: 0,
        connections: 0,
      }
    }
    const totalCompleted = clusters.reduce((sum, m) => sum + (m.queries_completed || 0), 0)
    const totalSucceeded = clusters.reduce((sum, m) => sum + (m.queries_succeeded || 0), 0)
    const totalFailed = clusters.reduce((sum, m) => sum + (m.queries_failed || 0), 0)
    const avgQueryTime =
      totalCompleted > 0
        ? Math.round(clusters.reduce((sum, m) => sum + (m.avg_query_time_ms || 0) * (m.queries_completed || 0), 0) / totalCompleted)
        : 0
    const totalConnections = clusters.reduce((sum, m) => sum + (m.active_connections || 0), 0)
    return {
      completed: totalCompleted,
      succeeded: totalSucceeded,
      failed: totalFailed,
      successRate: totalCompleted > 0 ? ((totalSucceeded / totalCompleted) * 100).toFixed(1) : "0",
      avgQueryTime,
      connections: totalConnections,
    }
  }, [clusters])

  // Format time series data for chart
  const chartData = useMemo(() => {
    if (!timeSeriesData?.length) return []
    return timeSeriesData.map((d) => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.value || 0,
    }))
  }, [timeSeriesData])

  const getModalTitle = () => {
    if (!modalState) return ""
    if (modalState.type === "cluster") {
      return `${modalState.cluster} - Executor Count`
    }
    return `${METRIC_LABELS[modalState.metric]} - Hourly`
  }

  // Color coding for success rate (high = good = green)
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 98) return "text-green-600"
    if (rate >= 95) return "text-orange-500"
    return "text-red-500"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5" />
            E6 Engine Usage
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
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5" />
            E6 Cluster Summary
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">E6 cluster executor counts and activity</p>
                <p className="text-xs text-muted-foreground mt-1">Metrics: container_cpu_allocation (executor pods)</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">{clusters.length}</p>
              <p className="text-xs text-muted-foreground">E6 Clusters</p>
            </div>
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">{totals.connections}</p>
              <p className="text-xs text-muted-foreground">Total Executors</p>
            </div>
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold text-muted-foreground">-</p>
              <p className="text-xs text-muted-foreground">Queries (coming soon)</p>
            </div>
          </div>

          {/* By E6 Cluster Table */}
          {clusters.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No E6 clusters found for the selected time range
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-3">BY E6 CLUSTER</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">E6 CLUSTER</th>
                      <th className="text-right py-2 font-medium">EXECUTORS</th>
                      <th className="text-right py-2 font-medium">QUERIES</th>
                      <th className="text-right py-2 font-medium">SUCCESS</th>
                      <th className="text-right py-2 font-medium">AVG TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusters.map((cluster) => {
                      const queriesCompleted = cluster.queries_completed || 0
                      const queriesSucceeded = cluster.queries_succeeded || 0
                      const activeConnections = cluster.active_connections || 0
                      const avgQueryTimeMs = cluster.avg_query_time_ms || 0
                      const successRateNum =
                        queriesCompleted > 0
                          ? (queriesSucceeded / queriesCompleted) * 100
                          : 0
                      const successRate = queriesCompleted > 0 ? successRateNum.toFixed(1) : "-"
                      return (
                        <tr
                          key={cluster.e6_cluster}
                          className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setModalState({ type: "cluster", cluster: cluster.e6_cluster })}
                        >
                          <td className="py-2 font-medium">{cluster.e6_cluster}</td>
                          <td className="py-2 text-right">{activeConnections}</td>
                          <td className="py-2 text-right text-muted-foreground">
                            {queriesCompleted > 0 ? queriesCompleted.toLocaleString() : "-"}
                          </td>
                          <td
                            className={`py-2 text-right font-medium ${queriesCompleted > 0 ? getSuccessRateColor(successRateNum) : "text-muted-foreground"}`}
                          >
                            {successRate}
                            {queriesCompleted > 0 ? "%" : ""}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            {avgQueryTimeMs > 0 ? `${avgQueryTimeMs}ms` : "-"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            Query metrics will be available once E6 engine metrics are exported
          </p>
        </CardContent>
      </Card>

      {/* Time Series Modal */}
      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalState?.type === "cluster" ? <TrendingUp className="h-5 w-5" /> : <Gauge className="h-5 w-5" />}
              {getModalTitle()} - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No time series data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {modalState?.type === "cluster" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                      formatter={(value) => [(value as number).toLocaleString(), "Executors"]}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                      formatter={(value) => [(value as number).toLocaleString(), modalState?.metric ? METRIC_LABELS[modalState.metric] : ""]}
                    />
                    <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
