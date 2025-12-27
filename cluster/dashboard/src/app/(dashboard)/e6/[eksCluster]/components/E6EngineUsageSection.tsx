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

interface E6EngineUsageSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

// Mock data for E6 engine metrics
const MOCK_ENGINE_METRICS = [
  { e6_cluster: "prod-analytics", queries_completed: 3744, queries_succeeded: 3632, queries_failed: 112, avg_query_time_ms: 245, active_connections: 42 },
  { e6_cluster: "prod-reporting", queries_completed: 2136, queries_succeeded: 2094, queries_failed: 42, avg_query_time_ms: 189, active_connections: 28 },
  { e6_cluster: "dev-testing", queries_completed: 0, queries_succeeded: 0, queries_failed: 0, avg_query_time_ms: 0, active_connections: 2 },
]

type ModalState =
  | { type: 'cluster'; cluster: string }
  | { type: 'metric'; metric: 'queries' | 'success_rate' | 'failed' | 'avg_time' | 'connections' }
  | null

const METRIC_LABELS: Record<string, string> = {
  queries: 'Queries',
  success_rate: 'Success Rate',
  failed: 'Failed Queries',
  avg_time: 'Avg Query Time',
  connections: 'Active Connections',
}

const METRIC_UNITS: Record<string, string> = {
  queries: '',
  success_rate: '%',
  failed: '',
  avg_time: 'ms',
  connections: '',
}

// Generate mock time series for overall metrics
const generateMetricTimeSeries = (metric: string) => {
  const data = []
  const baseValues: Record<string, number> = {
    queries: 245,
    success_rate: 97.4,
    failed: 6,
    avg_time: 220,
    connections: 72,
  }
  const base = baseValues[metric] || 100

  for (let i = 0; i < 24; i++) {
    const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.4 + 0.6
    const noise = 0.9 + Math.random() * 0.2
    let value = base * hourFactor * noise

    // Keep success rate between reasonable bounds
    if (metric === 'success_rate') {
      value = 95 + Math.random() * 4
    }

    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      value: metric === 'success_rate' ? value : Math.round(value),
    })
  }
  return data
}

// Generate mock time series for a specific cluster
const generateClusterTimeSeries = (cluster: string) => {
  const data = []
  const clusterData = MOCK_ENGINE_METRICS.find(m => m.e6_cluster === cluster)
  const baseQueries = clusterData ? clusterData.queries_completed / 24 : 100

  for (let i = 0; i < 24; i++) {
    const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.5 + 0.5
    const noise = 0.8 + Math.random() * 0.4
    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      queries: Math.round(baseQueries * hourFactor * noise),
    })
  }
  return data
}

export function E6EngineUsageSection({ eksCluster, dateRange, selectedDate }: E6EngineUsageSectionProps) {
  const [modalState, setModalState] = useState<ModalState>(null)

  const totals = useMemo(() => {
    const totalCompleted = MOCK_ENGINE_METRICS.reduce((sum, m) => sum + m.queries_completed, 0)
    const totalSucceeded = MOCK_ENGINE_METRICS.reduce((sum, m) => sum + m.queries_succeeded, 0)
    const totalFailed = MOCK_ENGINE_METRICS.reduce((sum, m) => sum + m.queries_failed, 0)
    const avgQueryTime = totalCompleted > 0
      ? Math.round(MOCK_ENGINE_METRICS.reduce((sum, m) => sum + m.avg_query_time_ms * m.queries_completed, 0) / totalCompleted)
      : 0
    const totalConnections = MOCK_ENGINE_METRICS.reduce((sum, m) => sum + m.active_connections, 0)
    return {
      completed: totalCompleted,
      succeeded: totalSucceeded,
      failed: totalFailed,
      successRate: totalCompleted > 0 ? ((totalSucceeded / totalCompleted) * 100).toFixed(1) : "0",
      avgQueryTime,
      connections: totalConnections,
    }
  }, [])

  const chartData = useMemo(() => {
    if (!modalState) return []
    if (modalState.type === 'cluster') {
      return generateClusterTimeSeries(modalState.cluster)
    } else {
      return generateMetricTimeSeries(modalState.metric)
    }
  }, [modalState])

  const getModalTitle = () => {
    if (!modalState) return ''
    if (modalState.type === 'cluster') {
      return `${modalState.cluster} - Queries/Hour`
    }
    return `${METRIC_LABELS[modalState.metric]} - Hourly`
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5" />
            E6 Engine Usage
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">Query execution metrics, success rates, and active connections per E6 cluster</p>
                <p className="text-xs text-muted-foreground mt-1">Metrics: query_metrics (query_count, query_duration)</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setModalState({ type: 'metric', metric: 'queries' })}
            >
              <p className="text-2xl font-bold">{totals.completed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Queries/Day</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setModalState({ type: 'metric', metric: 'success_rate' })}
            >
              <p className="text-2xl font-bold">{totals.successRate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setModalState({ type: 'metric', metric: 'failed' })}
            >
              <p className="text-2xl font-bold">{totals.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setModalState({ type: 'metric', metric: 'avg_time' })}
            >
              <p className="text-2xl font-bold">{totals.avgQueryTime}ms</p>
              <p className="text-xs text-muted-foreground">Avg Query Time</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setModalState({ type: 'metric', metric: 'connections' })}
            >
              <p className="text-2xl font-bold">{totals.connections}</p>
              <p className="text-xs text-muted-foreground">Active Connections</p>
            </div>
          </div>

          {/* By E6 Cluster Table */}
          <div className="text-xs text-muted-foreground mb-3">BY E6 CLUSTER (click for trend)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">E6 CLUSTER</th>
                  <th className="text-right py-2 font-medium">QUERIES</th>
                  <th className="text-right py-2 font-medium">SUCCESS</th>
                  <th className="text-right py-2 font-medium">FAILED</th>
                  <th className="text-right py-2 font-medium">AVG TIME</th>
                  <th className="text-right py-2 font-medium">CONNECTIONS</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ENGINE_METRICS.map((cluster) => {
                  const successRate = cluster.queries_completed > 0
                    ? ((cluster.queries_succeeded / cluster.queries_completed) * 100).toFixed(1)
                    : "-"
                  return (
                    <tr
                      key={cluster.e6_cluster}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setModalState({ type: 'cluster', cluster: cluster.e6_cluster })}
                    >
                      <td className="py-2 font-medium">{cluster.e6_cluster}</td>
                      <td className="py-2 text-right">{cluster.queries_completed.toLocaleString()}</td>
                      <td className="py-2 text-right">{successRate}%</td>
                      <td className="py-2 text-right">{cluster.queries_failed}</td>
                      <td className="py-2 text-right">{cluster.avg_query_time_ms}ms</td>
                      <td className="py-2 text-right">{cluster.active_connections}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Time Series Modal */}
      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalState?.type === 'cluster' ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <Gauge className="h-5 w-5" />
              )}
              {getModalTitle()} - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {modalState?.type === 'cluster' ? (
                <BarChart data={chartData}>
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
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [(value as number).toLocaleString(), 'Queries']}
                  />
                  <Bar dataKey="queries" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
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
                    tickFormatter={(v) => modalState?.metric === 'success_rate' ? `${v.toFixed(1)}%` : v.toLocaleString()}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => {
                      const metric = modalState?.metric || 'queries'
                      const unit = METRIC_UNITS[metric]
                      const formatted = metric === 'success_rate'
                        ? (value as number).toFixed(2)
                        : (value as number).toLocaleString()
                      return [`${formatted}${unit}`, METRIC_LABELS[metric]]
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name={modalState?.metric ? METRIC_LABELS[modalState.metric] : ''}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
