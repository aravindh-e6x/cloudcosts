"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
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
  RechartsAreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  RechartsTooltip,
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

function formatTime(ts: string | number): string {
  if (!ts && ts !== 0) return ''

  // Convert to Date object
  let date: Date
  const numTs = typeof ts === 'number' ? ts : Number(ts)

  if (!isNaN(numTs)) {
    // GreptimeDB returns nanoseconds (19 digits), milliseconds (13 digits), or seconds (10 digits)
    if (numTs > 1e18) {
      // Nanoseconds - divide by 1,000,000
      date = new Date(numTs / 1000000)
    } else if (numTs > 1e15) {
      // Microseconds - divide by 1,000
      date = new Date(numTs / 1000)
    } else if (numTs > 1e12) {
      // Milliseconds
      date = new Date(numTs)
    } else if (numTs > 1e9) {
      // Seconds
      date = new Date(numTs * 1000)
    } else {
      date = new Date(numTs)
    }
  } else if (typeof ts === 'string') {
    date = new Date(ts.replace(' ', 'T'))
  } else {
    return String(ts)
  }

  if (isNaN(date.getTime())) return String(ts)
  return format(date, 'HH:mm')
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

interface CostTimeSeriesChartProps {
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function CostTimeSeriesChart({ clusterName, dateRange }: CostTimeSeriesChartProps) {
  const { data: costData } = useQuery<CostTimeSeriesRow>(
    "kubernetes",
    "getClusterCostTimeSeries",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

  const chartData = useMemo(() => {
    if (!costData || costData.length === 0) return []
    return costData.map(row => ({
      time: formatTime(row.time),
      cost: row.hourly_cost || 0,
    }))
  }, [costData])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Cost Over Time</CardTitle>
          <CardDescription>Hourly infrastructure cost from OpenCost</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
          No cost data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cost Over Time</CardTitle>
        <CardDescription>Hourly infrastructure cost from OpenCost</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsLineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
            <RechartsTooltip contentStyle={{ fontSize: 11 }} formatter={(value) => `$${(Number(value) || 0).toFixed(4)}`} />
            <Line type="monotone" dataKey="cost" name="Hourly Cost" stroke="#10b981" strokeWidth={2} dot={false} fill="#10b981" />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface ComponentTimeSeriesPoint {
  ts: string
  component: string
  cpu_usage: number
  memory_usage: number
}

interface ComponentChartData {
  time: string
  cpu: number
  memory: number
}

interface ComponentMetricsChartsProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function ComponentMetricsCharts({ database, clusterName, dateRange }: ComponentMetricsChartsProps) {
  // Get E6 component metrics from customer database
  const { data: e6Data } = useQuery<ComponentTimeSeriesPoint>(
    "e6",
    "getComponentMetricsTimeSeries",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  // Group data by component
  const componentCharts = useMemo(() => {
    if (!e6Data || e6Data.length === 0) return {}

    const byComponent: Record<string, ComponentChartData[]> = {}
    const tempByComponent: Record<string, Record<string, ComponentChartData>> = {}

    e6Data.forEach(point => {
      const comp = point.component
      if (!comp) return

      if (!tempByComponent[comp]) tempByComponent[comp] = {}

      const timeKey = formatTime(point.ts)
      if (!tempByComponent[comp][timeKey]) {
        tempByComponent[comp][timeKey] = {
          time: timeKey,
          cpu: 0,
          memory: 0,
        }
      }
      tempByComponent[comp][timeKey].cpu += point.cpu_usage || 0
      tempByComponent[comp][timeKey].memory += point.memory_usage || 0
    })

    // Convert to arrays
    Object.keys(tempByComponent).forEach(comp => {
      byComponent[comp] = Object.values(tempByComponent[comp]).sort((a, b) => a.time.localeCompare(b.time))
    })

    return byComponent
  }, [e6Data])

  const components = Object.keys(componentCharts).sort()

  if (components.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Component Usage</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No component data available
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {components.map(component => {
        const data = componentCharts[component]

        return (
          <Card key={component}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">{component} - CPU Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <RechartsAreaChart data={data}>
                  <defs>
                    <linearGradient id={`gradient-${component}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} stroke="#10b981" />
                  <RechartsTooltip contentStyle={{ fontSize: 10 }} formatter={(value) => `${Number(value).toLocaleString()} sec`} />
                  <Area type="monotone" dataKey="cpu" name="CPU" stroke="#10b981" strokeWidth={2} fill={`url(#gradient-${component})`} />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      })}
    </div>
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
                <CostTimeSeriesChart clusterName={clusterName} dateRange={dateRange} />
                <ComponentMetricsCharts database={database} clusterName={clusterName} dateRange={dateRange} />
                <ComponentSummaryTable database={database} clusterName={clusterName} dateRange={dateRange} />
              </div>
            )}
          </DataHealthLoader>
        )
      }}
    </ContainerDataLoader>
  )
}
