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
import { Server, ChevronLeft, Box, DollarSign } from "lucide-react"
import { DateBanner, DataHealthIndicator } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"

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
  cost: number
  [key: string]: unknown
}

interface NodeCostRow {
  node: string
  cpu_cost: number
  ram_cost: number
  total_cost: number
}

interface DataHealthRow {
  last_data: string
}

interface CostSummaryRow {
  node_count: number
  hourly_cost: number
  total_cost: number
}

interface CostTimeSeriesRow {
  time: string
  hourly_cost: number
}

function formatTime(ts: string): string {
  const date = new Date(ts)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatMemorySize(bytes: number): string {
  if (bytes === 0) return '-'
  const gb = bytes / (1024 * 1024 * 1024)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

interface PageHeaderProps {
  database: string
  clusterName: string
  lastDataTimestamp: string | null
}

function PageHeader({ database, clusterName, lastDataTimestamp }: PageHeaderProps) {
  return (
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
  )
}

function LoadingSkeleton({ database, clusterName }: { database: string; clusterName: string }) {
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

function ErrorDisplay({ database, clusterName, error }: { database: string; clusterName: string; error: string }) {
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

interface ComponentSummaryTableProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function ComponentSummaryTable({ database, clusterName, dateRange }: ComponentSummaryTableProps) {
  const { data: summaryData } = useQuery<ComponentSummaryRow>(
    "e6",
    "getComponentSummary",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch node cost breakdown from kubernetes database
  const { data: nodeCostData } = useQuery<NodeCostRow>(
    "kubernetes",
    "getNodeCostBreakdown",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

  // Create a map of node -> cost for easy lookup
  const nodeCostMap = useMemo<Record<string, number>>(() => {
    if (!nodeCostData) return {}
    const map: Record<string, number> = {}
    nodeCostData.forEach(row => {
      map[row.node] = row.total_cost || 0
    })
    return map
  }, [nodeCostData])

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

    // Calculate total CPU cores for cost allocation
    const totalCpuCores = Object.values(componentMap).reduce((sum, data) => {
      return sum + (data.cpuPeriod > 0 ? data.cpuQuota / data.cpuPeriod : 0)
    }, 0)

    return Object.entries(componentMap).map(([comp, data]) => {
      const cpuCores = data.cpuPeriod > 0 ? data.cpuQuota / data.cpuPeriod : 0
      // Calculate cost based on node assignment and CPU allocation ratio
      let componentCost = 0
      const nodes = Array.from(data.nodes)
      if (nodes.length > 0 && totalCpuCores > 0) {
        // Sum up costs from all nodes this component runs on, weighted by CPU ratio
        nodes.forEach(node => {
          const nodeCost = nodeCostMap[node] || 0
          componentCost += nodeCost * (cpuCores / totalCpuCores)
        })
      }

      return {
        component: comp,
        podCount: data.pods.size,
        cpuCores,
        memoryRequest: data.memoryRequest,
        memoryUsage: data.memoryUsage,
        restarts: data.restarts,
        nodes,
        cost: componentCost,
      }
    })
  }, [summaryData, nodeCostMap])

  const columns = useMemo(() => [
    {
      key: "component",
      header: "Component",
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground"><Box className="h-4 w-4" /></span>
          <span className="font-medium capitalize">{String(value)}</span>
        </div>
      ),
    },
    {
      key: "podCount",
      header: "Pods",
      render: (value: unknown) => <Badge variant="secondary">{String(value)}</Badge>,
    },
    {
      key: "cpuCores",
      header: "CPU (cores)",
      render: (value: unknown) => {
        const cores = Number(value) || 0
        return <span className="font-mono text-sm">{cores > 0 ? cores.toFixed(0) : '-'}</span>
      },
    },
    {
      key: "memoryRequest",
      header: "Memory Request",
      render: (value: unknown) => {
        const bytes = Number(value) || 0
        return <span className="font-mono text-sm">{formatMemorySize(bytes)}</span>
      },
    },
    {
      key: "memoryUsage",
      header: "Memory Usage",
      render: (value: unknown) => {
        const bytes = Number(value) || 0
        return <span className="font-mono text-sm">{formatMemorySize(bytes)}</span>
      },
    },
    {
      key: "restarts",
      header: "Restarts",
      render: (value: unknown) => {
        const restarts = Number(value) || 0
        return <Badge variant={restarts > 0 ? "destructive" : "secondary"}>{restarts}</Badge>
      },
    },
    {
      key: "cost",
      header: "Est. Cost",
      render: (value: unknown) => {
        const cost = Number(value) || 0
        return (
          <span className="font-mono text-sm text-green-600 font-medium">
            ${cost.toFixed(2)}
          </span>
        )
      },
    },
    {
      key: "nodes",
      header: "Node",
      render: (value: unknown) => {
        const nodes = value as string[]
        if (nodes.length === 0) return <span className="text-muted-foreground">-</span>
        return <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{nodes[0].split('.')[0]}</code>
      },
    },
  ], [])

  if (componentSummary.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Cluster Components</CardTitle>
        <CardDescription>Active components and their pod specifications</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable data={componentSummary} columns={columns} hoverable striped />
      </CardContent>
    </Card>
  )
}

interface QueryMetricsChartProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function QueryMetricsChart({ database, clusterName, dateRange }: QueryMetricsChartProps) {
  const { data: queueData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getQueueMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  const chartData = useMemo<QueryChartDataPoint[]>(() => {
    if (!queueData || queueData.length === 0) return []

    const byTime: Record<string, QueryChartDataPoint> = {}

    queueData.forEach(point => {
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
  }, [queueData])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Query Metrics</CardTitle>
          <CardDescription>Query execution and queue status over time</CardDescription>
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
        <CardDescription>Query execution and queue status over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <RechartsTooltip contentStyle={{ fontSize: 11 }} formatter={(value) => (Number(value) || 0).toFixed(0)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="executing" name="Executing Queries" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="executionQueued" name="Execution Queue" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="planningQueued" name="Planning Queue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="totalInPlanner" name="Total in Planner" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface CostSummaryCardProps {
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function CostSummaryCard({ clusterName, dateRange }: CostSummaryCardProps) {
  const { data: costData } = useQuery<CostSummaryRow>(
    "kubernetes",
    "getClusterCostSummary",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

  const summary = costData?.[0]
  const totalCost = summary?.total_cost ?? 0
  const hourlyCost = summary?.hourly_cost ?? 0
  const nodeCount = summary?.node_count ?? 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Cluster Cost (OpenCost)</CardTitle>
            <CardDescription>Real infrastructure cost from OpenCost</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold text-green-600">${totalCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Hourly Rate</p>
            <p className="text-2xl font-bold">${hourlyCost.toFixed(4)}/hr</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nodes</p>
            <p className="text-2xl font-bold">{nodeCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface DualAxisChartProps {
  title: string
  data: ChartDataPoint[]
  leftKey: 'cpu' | 'memory'
  leftLabel: string
  leftColor?: string
  rightLabel?: string
  rightColor?: string
}

function DualAxisChart({
  title,
  data,
  leftKey,
  leftLabel,
  leftColor = "#10b981",
  rightLabel = "Cost ($)",
  rightColor = "#f59e0b",
}: DualAxisChartProps) {
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
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => leftKey === 'memory' ? formatBytes(v) : v.toFixed(0)} stroke={leftColor} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(4)}`} stroke={rightColor} />
            <RechartsTooltip contentStyle={{ fontSize: 11 }} formatter={(value, name) => {
              const numValue = Number(value) || 0
              if (name === leftLabel) return leftKey === 'memory' ? formatBytes(numValue) : numValue.toFixed(2)
              return `$${numValue.toFixed(6)}`
            }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey={leftKey} name={leftLabel} stroke={leftColor} strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="cost" name={rightLabel} stroke={rightColor} strokeWidth={2} dot={false} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface ContainerMetricsChartsProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function ContainerMetricsCharts({ database, clusterName, dateRange }: ContainerMetricsChartsProps) {
  // Fetch E6 container metrics
  const { data: containerData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getContainerMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch actual cost time series from OpenCost (kubernetes database)
  const { data: costData } = useQuery<CostTimeSeriesRow>(
    "kubernetes",
    "getClusterCostTimeSeries",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

  // Create a map of time -> cost for easy lookup
  const costByTime = useMemo<Record<string, number>>(() => {
    if (!costData) return {}
    const map: Record<string, number> = {}
    costData.forEach(row => {
      const timeKey = formatTime(row.time)
      map[timeKey] = row.hourly_cost || 0
    })
    return map
  }, [costData])

  const cpuData = useMemo<ChartDataPoint[]>(() => {
    if (!containerData) return []
    const byTime: Record<string, ChartDataPoint> = {}
    containerData.forEach(point => {
      const timeKey = formatTime(point.ts)
      if (!byTime[timeKey]) byTime[timeKey] = { time: timeKey, cpu: 0, cost: 0 }
      if (point.metric_name.includes('cpu')) byTime[timeKey].cpu = (byTime[timeKey].cpu || 0) + point.metric_value
    })
    // Use real cost data from OpenCost
    Object.keys(byTime).forEach(time => {
      byTime[time].cost = costByTime[time] || 0
    })
    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }, [containerData, costByTime])

  const memoryData = useMemo<ChartDataPoint[]>(() => {
    if (!containerData) return []
    const byTime: Record<string, ChartDataPoint> = {}
    containerData.forEach(point => {
      const timeKey = formatTime(point.ts)
      if (!byTime[timeKey]) byTime[timeKey] = { time: timeKey, memory: 0, cost: 0 }
      if (point.metric_name.includes('memory')) byTime[timeKey].memory = (byTime[timeKey].memory || 0) + point.metric_value
    })
    // Use real cost data from OpenCost
    Object.keys(byTime).forEach(time => {
      byTime[time].cost = costByTime[time] || 0
    })
    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }, [containerData, costByTime])

  return (
    <>
      <DualAxisChart title="Executor - CPU vs Cost" data={cpuData} leftKey="cpu" leftLabel="CPU (seconds)" leftColor="#10b981" />
      <DualAxisChart title="Executor - Memory vs Cost" data={memoryData} leftKey="memory" leftLabel="Memory" leftColor="#3b82f6" />
    </>
  )
}

interface GenericMetricsChartsProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
  queryName: string
  componentFilter: string
  titlePrefix: string
}

function GenericMetricsCharts({ database, clusterName, dateRange, queryName, componentFilter, titlePrefix }: GenericMetricsChartsProps) {
  const { data } = useQuery<TimeSeriesPoint>(
    "e6",
    queryName,
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Fetch actual cost time series from OpenCost (kubernetes database)
  const { data: costData } = useQuery<CostTimeSeriesRow>(
    "kubernetes",
    "getClusterCostTimeSeries",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

  // Create a map of time -> cost for easy lookup
  const costByTime = useMemo<Record<string, number>>(() => {
    if (!costData) return {}
    const map: Record<string, number> = {}
    costData.forEach(row => {
      const timeKey = formatTime(row.time)
      map[timeKey] = row.hourly_cost || 0
    })
    return map
  }, [costData])

  const cpuData = useMemo<ChartDataPoint[]>(() => {
    if (!data) return []
    const byTime: Record<string, ChartDataPoint> = {}
    data.forEach(point => {
      if (componentFilter && !point.metric_name.toLowerCase().includes(componentFilter.toLowerCase())) return
      const timeKey = formatTime(point.ts)
      if (!byTime[timeKey]) byTime[timeKey] = { time: timeKey, cpu: 0, cost: 0 }
      if (point.metric_name.includes('cpu') || point.metric_name.includes('CPU') || point.metric_name.includes('Thread') || point.metric_name.includes('Uptime')) {
        byTime[timeKey].cpu = (byTime[timeKey].cpu || 0) + point.metric_value
      }
    })
    // Use real cost data from OpenCost
    Object.keys(byTime).forEach(time => {
      byTime[time].cost = costByTime[time] || 0
    })
    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }, [data, componentFilter, costByTime])

  const memoryData = useMemo<ChartDataPoint[]>(() => {
    if (!data) return []
    const byTime: Record<string, ChartDataPoint> = {}
    data.forEach(point => {
      if (componentFilter && !point.metric_name.toLowerCase().includes(componentFilter.toLowerCase())) return
      const timeKey = formatTime(point.ts)
      if (!byTime[timeKey]) byTime[timeKey] = { time: timeKey, memory: 0, cost: 0 }
      if (point.metric_name.includes('Memory') || point.metric_name.includes('memory') || point.metric_name.includes('Heap') || point.metric_name.includes('Cache') || point.metric_name.includes('Size')) {
        byTime[timeKey].memory = (byTime[timeKey].memory || 0) + point.metric_value
      }
    })
    // Use real cost data from OpenCost
    Object.keys(byTime).forEach(time => {
      byTime[time].cost = costByTime[time] || 0
    })
    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }, [data, componentFilter, costByTime])

  return (
    <>
      <DualAxisChart title={`${titlePrefix} - CPU vs Cost`} data={cpuData} leftKey="cpu" leftLabel="CPU Usage" leftColor="#10b981" />
      <DualAxisChart title={`${titlePrefix} - Memory vs Cost`} data={memoryData} leftKey="memory" leftLabel="Memory" leftColor="#3b82f6" />
    </>
  )
}

interface MetricsChartsGridProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function MetricsChartsGrid({ database, clusterName, dateRange }: MetricsChartsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ContainerMetricsCharts database={database} clusterName={clusterName} dateRange={dateRange} />
      <GenericMetricsCharts database={database} clusterName={clusterName} dateRange={dateRange} queryName="getQueueMetrics" componentFilter="Planner" titlePrefix="Planner" />
      <GenericMetricsCharts database={database} clusterName={clusterName} dateRange={dateRange} queryName="getQueueMetrics" componentFilter="Queue" titlePrefix="Queue" />
      <GenericMetricsCharts database={database} clusterName={clusterName} dateRange={dateRange} queryName="getStorageMetrics" componentFilter="" titlePrefix="Storage" />
      <GenericMetricsCharts database={database} clusterName={clusterName} dateRange={dateRange} queryName="getSchemaMetrics" componentFilter="" titlePrefix="Schema" />
    </div>
  )
}

interface DataHealthLoaderProps {
  database: string
  clusterName: string
  children: (lastDataTimestamp: string | null) => React.ReactNode
}

function DataHealthLoader({ database, clusterName, children }: DataHealthLoaderProps) {
  const { data: healthData } = useQuery<DataHealthRow>(
    "e6",
    "getClusterDataHealth",
    [clusterName],
    { database, refetchInterval: 60000 }
  )
  return <>{children(healthData?.[0]?.last_data || null)}</>
}

interface ContainerDataLoaderProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
  children: (props: { loading: boolean; error: string | null }) => React.ReactNode
}

function ContainerDataLoader({ database, clusterName, dateRange, children }: ContainerDataLoaderProps) {
  const { loading, error } = useQuery<TimeSeriesPoint>(
    "e6",
    "getContainerMetrics",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )
  return <>{children({ loading, error })}</>
}

export default function ClusterDetailPage() {
  const params = useParams()
  const database = params.customer as string
  const clusterName = decodeURIComponent(params.cluster as string)
  const { startTimestamp, endTimestamp } = useDate()
  const dateRange = useMemo(() => ({ startTs: startTimestamp, endTs: endTimestamp }), [startTimestamp, endTimestamp])

  return (
    <ContainerDataLoader database={database} clusterName={clusterName} dateRange={dateRange}>
      {({ loading, error }) => {
        if (loading) {
          return <LoadingSkeleton database={database} clusterName={clusterName} />
        }

        if (error) {
          return <ErrorDisplay database={database} clusterName={clusterName} error={error} />
        }

        return (
          <DataHealthLoader database={database} clusterName={clusterName}>
            {(lastDataTimestamp) => (
              <div className="space-y-6">
                <DateBanner />
                <PageHeader database={database} clusterName={clusterName} lastDataTimestamp={lastDataTimestamp} />
                <CostSummaryCard clusterName={clusterName} dateRange={dateRange} />
                <ComponentSummaryTable database={database} clusterName={clusterName} dateRange={dateRange} />
                <QueryMetricsChart database={database} clusterName={clusterName} dateRange={dateRange} />
                <MetricsChartsGrid database={database} clusterName={clusterName} dateRange={dateRange} />
              </div>
            )}
          </DataHealthLoader>
        )
      }}
    </ContainerDataLoader>
  )
}
