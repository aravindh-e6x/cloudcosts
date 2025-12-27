"use client"

import { useMemo, useState } from "react"
import { Gauge, TrendingUp } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "e6ds"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

export function E6EngineUsageSection({ eksCluster, dateRange, selectedDate }: E6EngineUsageSectionProps) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)

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

  // Mock time series for queries per hour
  const chartData = useMemo(() => {
    const data = []
    for (let i = 0; i < 24; i++) {
      // Simulate business hours pattern
      const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.5 + 0.5
      const baseQueries = 150
      data.push({
        time: `${i.toString().padStart(2, '0')}:00`,
        queries: Math.round(baseQueries * hourFactor * (0.8 + Math.random() * 0.4)),
      })
    }
    return data
  }, [selectedCluster])

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5" />
            E6 Engine Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">{totals.completed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Queries/Day</p>
            </div>
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">{totals.successRate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">{totals.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">{totals.avgQueryTime}ms</p>
              <p className="text-xs text-muted-foreground">Avg Query Time</p>
            </div>
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">{totals.connections}</p>
              <p className="text-xs text-muted-foreground">Active Connections</p>
            </div>
          </div>

          {/* By E6 Cluster Table */}
          <div className="text-xs text-muted-foreground mb-3">BY E6 CLUSTER</div>
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
                      onClick={() => setSelectedCluster(cluster.e6_cluster)}
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

          <p className="text-xs text-muted-foreground mt-3">
            Click cluster for time-series
          </p>
        </CardContent>
      </Card>

      {/* Query Time Series Modal */}
      <Dialog open={!!selectedCluster} onOpenChange={(open) => !open && setSelectedCluster(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {selectedCluster} - Queries/Hour - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [(value as number).toLocaleString(), 'Queries']}
                />
                <Bar dataKey="queries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
