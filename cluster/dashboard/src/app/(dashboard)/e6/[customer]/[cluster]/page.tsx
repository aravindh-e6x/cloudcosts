"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Button,
  Skeleton,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Badge,
  ResponsiveContainer,
  RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  RechartsTooltip,
  Legend,
} from "laminar-ui"
import {
  Server,
  ChevronLeft,
  Box,
} from "lucide-react"
import { DateBanner, DataHealthIndicator } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"
import { E6_SCHEMA_PREFIX } from "@/lib/utils"

interface TimeSeriesPoint {
  ts: string
  metric_name: string
  metric_value: number
}

interface ChartDataPoint {
  time: string
  cpu?: number
  memory?: number
  cost?: number
}

interface QueryChartDataPoint {
  time: string
  executing: number
  executionQueued: number
  planningQueued: number
  totalInPlanner: number
}

interface ComponentSummaryRow {
  component: string
  pod: string
  node: string
  metric_name: string
  metric_value: number
}

interface ComponentSummary {
  component: string
  podCount: number
  cpuCores: number
  memoryRequest: number
  memoryUsage: number
  restarts: number
  nodes: string[]
  [key: string]: unknown
}

interface DataHealthRow {
  last_data: string
}

export default function ClusterDetailPage() {
  const params = useParams()
  const database = params.customer as string
  const clusterName = decodeURIComponent(params.cluster as string)
  const { startTimestamp, endTimestamp } = useDate()
  const dateRange = { startTs: startTimestamp, endTs: endTimestamp }

  // Create display names
  const customerName = useMemo(() => {
    return database
      .replace(E6_SCHEMA_PREFIX, "")
      .split("_")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }, [database])

  // Format time for chart axis
  const formatTime = (ts: string) => {
    const date = new Date(ts)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Fetch data health
  const { data: healthData } = useQuery<DataHealthRow>(
    "e6",
    "getClusterDataHealth",
    [clusterName],
    { database, refetchInterval: 60000 }
  )
  const lastDataTimestamp = healthData?.[0]?.last_data || null

  // Fetch executor metrics
  const { data: executorData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getExecutorMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch queue metrics
  const { data: queueData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getQueueMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch storage metrics
  const { data: storageData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getStorageMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch schema metrics
  const { data: schemaData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getSchemaMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch container metrics
  const { data: containerData, loading, error } = useQuery<TimeSeriesPoint>(
    "e6",
    "getContainerMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch component summary
  const { data: summaryData } = useQuery<ComponentSummaryRow>(
    "e6",
    "getComponentSummary",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Process component summary data
  const componentSummary = useMemo<ComponentSummary[]>(() => {
    if (!summaryData) return []

    const componentMap: Record<string, {
      pods: Set<string>
      nodes: Set<string>
      cpuQuota: number
      cpuPeriod: number
      memoryRequest: number
      memoryUsage: number
      restarts: number
    }> = {}

    for (const row of summaryData) {
      const comp = row.component
      if (!componentMap[comp]) {
        componentMap[comp] = {
          pods: new Set(),
          nodes: new Set(),
          cpuQuota: 0,
          cpuPeriod: 100000,
          memoryRequest: 0,
          memoryUsage: 0,
          restarts: 0,
        }
      }
      if (row.pod) componentMap[comp].pods.add(row.pod)
      if (row.node && row.node !== 'unknown') componentMap[comp].nodes.add(row.node)

      switch (row.metric_name) {
        case 'e6data_container_spec_cpu_quota':
          componentMap[comp].cpuQuota = Math.max(componentMap[comp].cpuQuota, row.metric_value || 0)
          break
        case 'e6data_container_spec_cpu_period':
          componentMap[comp].cpuPeriod = row.metric_value || 100000
          break
        case 'e6data_container_requests':
          componentMap[comp].memoryRequest = Math.max(componentMap[comp].memoryRequest, row.metric_value || 0)
          break
        case 'e6data_container_memory_usage_bytes':
          componentMap[comp].memoryUsage = Math.max(componentMap[comp].memoryUsage, row.metric_value || 0)
          break
        case 'e6data_container_restart_count':
          componentMap[comp].restarts += row.metric_value || 0
          break
      }
    }

    return Object.entries(componentMap).map(([comp, data]) => ({
      component: comp,
      podCount: data.pods.size,
      cpuCores: data.cpuPeriod > 0 ? data.cpuQuota / data.cpuPeriod : 0,
      memoryRequest: data.memoryRequest,
      memoryUsage: data.memoryUsage,
      restarts: data.restarts,
      nodes: Array.from(data.nodes),
    }))
  }, [summaryData])

  // Transform data for dual-axis chart (CPU vs Cost)
  const transformCpuCostData = (data: TimeSeriesPoint[] | null, componentFilter: string): ChartDataPoint[] => {
    if (!data || data.length === 0) return []

    const byTime: Record<string, ChartDataPoint> = {}

    data.forEach(point => {
      if (!point.metric_name.toLowerCase().includes(componentFilter.toLowerCase())) {
        return
      }

      const timeKey = point.ts
      if (!byTime[timeKey]) {
        byTime[timeKey] = { time: formatTime(point.ts), cpu: 0, cost: 0 }
      }

      if (point.metric_name.includes('cpu') ||
          point.metric_name.includes('CPU') ||
          point.metric_name.includes('Thread') ||
          point.metric_name.includes('Uptime')) {
        byTime[timeKey].cpu = (byTime[timeKey].cpu || 0) + point.metric_value
      }
    })

    Object.values(byTime).forEach(point => {
      point.cost = (point.cpu || 0) * 0.00001
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }

  // Transform data for dual-axis chart (Memory vs Cost)
  const transformMemoryCostData = (data: TimeSeriesPoint[] | null, componentFilter: string): ChartDataPoint[] => {
    if (!data || data.length === 0) return []

    const byTime: Record<string, ChartDataPoint> = {}

    data.forEach(point => {
      if (!point.metric_name.toLowerCase().includes(componentFilter.toLowerCase())) {
        return
      }

      const timeKey = point.ts
      if (!byTime[timeKey]) {
        byTime[timeKey] = { time: formatTime(point.ts), memory: 0, cost: 0 }
      }

      if (point.metric_name.includes('Memory') ||
          point.metric_name.includes('memory') ||
          point.metric_name.includes('Heap') ||
          point.metric_name.includes('Cache') ||
          point.metric_name.includes('Size')) {
        byTime[timeKey].memory = (byTime[timeKey].memory || 0) + point.metric_value
      }
    })

    Object.values(byTime).forEach(point => {
      point.cost = (point.memory || 0) * 0.00000001
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }

  // Transform container data for CPU/Memory charts
  const transformContainerData = (metricType: 'cpu' | 'memory'): ChartDataPoint[] => {
    if (!containerData || containerData.length === 0) return []

    const byTime: Record<string, ChartDataPoint> = {}

    containerData.forEach(point => {
      const timeKey = point.ts
      if (!byTime[timeKey]) {
        byTime[timeKey] = { time: formatTime(point.ts), cpu: 0, memory: 0, cost: 0 }
      }

      if (metricType === 'cpu' && point.metric_name.includes('cpu')) {
        byTime[timeKey].cpu = (byTime[timeKey].cpu || 0) + point.metric_value
      }
      if (metricType === 'memory' && point.metric_name.includes('memory')) {
        byTime[timeKey].memory = (byTime[timeKey].memory || 0) + point.metric_value
      }
    })

    Object.values(byTime).forEach(point => {
      if (metricType === 'cpu') {
        point.cost = (point.cpu || 0) * 0.00001
      } else {
        point.cost = (point.memory || 0) / (1024 * 1024 * 1024) * 0.01
      }
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }

  // Transform query metrics data for the query chart
  const transformQueryMetricsData = (data: TimeSeriesPoint[] | null): QueryChartDataPoint[] => {
    if (!data || data.length === 0) return []

    const byTime: Record<string, QueryChartDataPoint> = {}

    data.forEach(point => {
      const timeKey = point.ts
      if (!byTime[timeKey]) {
        byTime[timeKey] = {
          time: formatTime(point.ts),
          executing: 0,
          executionQueued: 0,
          planningQueued: 0,
          totalInPlanner: 0,
        }
      }

      switch (point.metric_name) {
        case 'io_e6x_E6Queue_NumExecutingQueries':
          byTime[timeKey].executing = point.metric_value
          break
        case 'io_e6x_E6Queue_NumExecutionQueuedQueries':
          byTime[timeKey].executionQueued = point.metric_value
          break
        case 'io_e6x_E6Queue_NumPlanningQueuedQueries':
          byTime[timeKey].planningQueued = point.metric_value
          break
        case 'io_e6x_E6Queue_TotalNumQueriesInPlanner':
          byTime[timeKey].totalInPlanner = point.metric_value
          break
      }
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }

  // Prepare chart data for each component
  const executorCpuData = useMemo(() => transformContainerData('cpu'), [containerData])
  const executorMemoryData = useMemo(() => transformContainerData('memory'), [containerData])

  const plannerCpuData = useMemo(() => transformCpuCostData(queueData, 'Planner'), [queueData])
  const plannerMemoryData = useMemo(() => transformMemoryCostData(queueData, 'Planner'), [queueData])

  const queueCpuData = useMemo(() => transformCpuCostData(queueData, 'Queue'), [queueData])
  const queueMemoryData = useMemo(() => transformMemoryCostData(queueData, 'Queue'), [queueData])

  const storageCpuData = useMemo(() => transformCpuCostData(storageData, ''), [storageData])
  const storageMemoryData = useMemo(() => transformMemoryCostData(storageData, ''), [storageData])

  const schemaCpuData = useMemo(() => transformCpuCostData(schemaData, ''), [schemaData])
  const schemaMemoryData = useMemo(() => transformMemoryCostData(schemaData, ''), [schemaData])

  // Query metrics chart data
  const queryMetricsData = useMemo(() => transformQueryMetricsData(queueData), [queueData])

  // Dual Axis Chart Component
  const DualAxisChart = ({
    title,
    data,
    leftKey,
    leftLabel,
    leftColor = "#10b981",
    rightLabel = "Cost ($)",
    rightColor = "#f59e0b",
  }: {
    title: string
    data: ChartDataPoint[]
    leftKey: 'cpu' | 'memory'
    leftLabel: string
    leftColor?: string
    rightLabel?: string
    rightColor?: string
  }) => {
    if (data.length === 0) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => leftKey === 'memory' ? formatBytes(v) : v.toFixed(0)}
                stroke={leftColor}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${v.toFixed(4)}`}
                stroke={rightColor}
              />
              <RechartsTooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(value, name) => {
                  const numValue = Number(value) || 0
                  if (name === leftLabel) {
                    return leftKey === 'memory' ? formatBytes(numValue) : numValue.toFixed(2)
                  }
                  return `$${numValue.toFixed(6)}`
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={leftKey}
                name={leftLabel}
                stroke={leftColor}
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cost"
                name={rightLabel}
                stroke={rightColor}
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  // Query Metrics Chart Component
  const QueryMetricsChart = ({ data }: { data: QueryChartDataPoint[] }) => {
    if (data.length === 0) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Query Metrics</CardTitle>
            <CardDescription>
              Query execution and queue status over time
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No query metrics available
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Query Metrics</CardTitle>
          <CardDescription>
            Query execution and queue status over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                allowDecimals={false}
              />
              <RechartsTooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(value) => (Number(value) || 0).toFixed(0)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="executing"
                name="Executing Queries"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="executionQueued"
                name="Execution Queue"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="planningQueued"
                name="Planning Queue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="totalInPlanner"
                name="Total in Planner"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/e6/${database}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{clusterName}</h1>
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <Skeleton key={i} className="h-[280px] w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/e6/${database}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />

            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{clusterName}</h1>
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DateBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/e6/${database}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{clusterName}</h1>
              <p className="text-sm text-muted-foreground">
                CPU & Memory vs Cost (last 6 hours)
              </p>
            </div>
          </div>
        </div>
        <DataHealthIndicator
          lastDataTimestamp={lastDataTimestamp}
          dataSource="e6metrics-exporter"
          expectedIntervalMinutes={1}
          warningThresholdMinutes={5}
          criticalThresholdMinutes={15}
        />
      </div>

      {/* Component Summary Table */}
      {componentSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cluster Components</CardTitle>
            <CardDescription>
              Active components and their pod specifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={componentSummary}
              columns={[
                {
                  key: "component",
                  header: "Component",
                  render: (value: unknown) => {
                    const comp = String(value)
                    const icon = <Box className="h-4 w-4" />
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{icon}</span>
                        <span className="font-medium capitalize">{comp}</span>
                      </div>
                    )
                  },
                },
                {
                  key: "podCount",
                  header: "Pods",
                  render: (value: unknown) => (
                    <Badge variant="secondary">{String(value)}</Badge>
                  ),
                },
                {
                  key: "cpuCores",
                  header: "CPU (cores)",
                  render: (value: unknown) => {
                    const cores = Number(value) || 0
                    return (
                      <span className="font-mono text-sm">
                        {cores > 0 ? cores.toFixed(0) : '-'}
                      </span>
                    )
                  },
                },
                {
                  key: "memoryRequest",
                  header: "Memory Request",
                  render: (value: unknown) => {
                    const bytes = Number(value) || 0
                    if (bytes === 0) return <span className="text-muted-foreground">-</span>
                    const gb = bytes / (1024 * 1024 * 1024)
                    return (
                      <span className="font-mono text-sm">
                        {gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`}
                      </span>
                    )
                  },
                },
                {
                  key: "memoryUsage",
                  header: "Memory Usage",
                  render: (value: unknown) => {
                    const bytes = Number(value) || 0
                    if (bytes === 0) return <span className="text-muted-foreground">-</span>
                    const gb = bytes / (1024 * 1024 * 1024)
                    return (
                      <span className="font-mono text-sm">
                        {gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`}
                      </span>
                    )
                  },
                },
                {
                  key: "restarts",
                  header: "Restarts",
                  render: (value: unknown) => {
                    const restarts = Number(value) || 0
                    return (
                      <Badge variant={restarts > 0 ? "destructive" : "secondary"}>
                        {restarts}
                      </Badge>
                    )
                  },
                },
                {
                  key: "nodes",
                  header: "Node",
                  render: (value: unknown) => {
                    const nodes = value as string[]
                    if (nodes.length === 0) return <span className="text-muted-foreground">-</span>
                    return (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {nodes[0].split('.')[0]}
                      </code>
                    )
                  },
                },
              ]}
              hoverable
              striped
            />
          </CardContent>
        </Card>
      )}

      {/* Query Metrics Chart - full width */}
      <QueryMetricsChart data={queryMetricsData} />

      {/* Charts Grid - 2 columns: CPU charts on left, Memory charts on right */}
      <div className="grid grid-cols-2 gap-4">
        {/* Executor */}
        <DualAxisChart
          title="Executor - CPU vs Cost"
          data={executorCpuData}
          leftKey="cpu"
          leftLabel="CPU (seconds)"
          leftColor="#10b981"
        />
        <DualAxisChart
          title="Executor - Memory vs Cost"
          data={executorMemoryData}
          leftKey="memory"
          leftLabel="Memory"
          leftColor="#3b82f6"
        />

        {/* Planner */}
        <DualAxisChart
          title="Planner - CPU vs Cost"
          data={plannerCpuData}
          leftKey="cpu"
          leftLabel="CPU Usage"
          leftColor="#10b981"
        />
        <DualAxisChart
          title="Planner - Memory vs Cost"
          data={plannerMemoryData}
          leftKey="memory"
          leftLabel="Memory"
          leftColor="#3b82f6"
        />

        {/* Queue */}
        <DualAxisChart
          title="Queue - CPU vs Cost"
          data={queueCpuData}
          leftKey="cpu"
          leftLabel="CPU Usage"
          leftColor="#10b981"
        />
        <DualAxisChart
          title="Queue - Memory vs Cost"
          data={queueMemoryData}
          leftKey="memory"
          leftLabel="Memory"
          leftColor="#3b82f6"
        />

        {/* Storage */}
        <DualAxisChart
          title="Storage - CPU vs Cost"
          data={storageCpuData}
          leftKey="cpu"
          leftLabel="CPU Usage"
          leftColor="#10b981"
        />
        <DualAxisChart
          title="Storage - Memory vs Cost"
          data={storageMemoryData}
          leftKey="memory"
          leftLabel="Memory"
          leftColor="#3b82f6"
        />

        {/* Schema */}
        <DualAxisChart
          title="Schema - CPU vs Cost"
          data={schemaCpuData}
          leftKey="cpu"
          leftLabel="CPU Usage"
          leftColor="#10b981"
        />
        <DualAxisChart
          title="Schema - Memory vs Cost"
          data={schemaMemoryData}
          leftKey="memory"
          leftLabel="Memory"
          leftColor="#3b82f6"
        />
      </div>

      {/* Show message if no data at all */}
      {executorCpuData.length === 0 &&
       plannerCpuData.length === 0 &&
       queueCpuData.length === 0 &&
       storageCpuData.length === 0 &&
       schemaCpuData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Metrics Data</h3>
          <p>No CPU/Memory metrics found for this cluster in the last 6 hours.</p>
        </div>
      )}
    </div>
  )
}
