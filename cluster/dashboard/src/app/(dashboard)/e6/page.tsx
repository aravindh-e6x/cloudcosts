"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Badge,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ResponsiveContainer,
  RechartsLineChart,
  RechartsAreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  RechartsTooltip,
  Checkbox,
  Label,
} from "e6ds"
import { ComposedChart, Legend } from "recharts"
import { Building2, Server, Box, DollarSign, ChevronDown, Cpu, HardDrive, Activity } from "lucide-react"
import { DateBanner, DataHealthIndicator } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"
import { E6_SCHEMA_PREFIX } from "@/lib/utils"

// Types
interface DatabaseRow {
  schema_name: string
}

interface ClusterListRow {
  cluster_name: string
  last_updated: string | null
}

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

interface QueryMetricsRow {
  ts: string
  metric_name: string
  metric_value: number
}

interface ComponentTimeSeriesPoint {
  ts: string
  component: string
  cpu_usage: number
  memory_usage: number
}

interface ContainerCostPoint {
  time: string
  component: string
  cpu_cost: number
}

interface ComponentChartData {
  time: string
  cpu: number
  memory: number
  cost: number
}

interface CpuTimeSeriesRow {
  ts: string
  cpu_usage: number
}

interface MemoryTimeSeriesRow {
  ts: string
  memory_usage_gb: number
}

interface QueryCountTimeSeriesRow {
  ts: string
  query_count: number
}

// Utility functions
function formatDisplayName(database: string): string {
  return database
    .replace(E6_SCHEMA_PREFIX, "")
    .split("_")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatTime(ts: string | number): string {
  if (!ts && ts !== 0) return ''
  let date: Date
  const numTs = typeof ts === 'number' ? ts : Number(ts)

  if (!isNaN(numTs)) {
    if (numTs > 1e18) {
      date = new Date(numTs / 1000000)
    } else if (numTs > 1e15) {
      date = new Date(numTs / 1000)
    } else if (numTs > 1e12) {
      date = new Date(numTs)
    } else if (numTs > 1e9) {
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

// Selection Header Component
interface SelectionHeaderProps {
  databases: string[]
  selectedDatabase: string | null
  onDatabaseChange: (db: string) => void
  clusters: ClusterListRow[]
  selectedCluster: string | null
  onClusterChange: (cluster: string) => void
  clustersLoading: boolean
  lastDataTimestamp: string | null
}

function SelectionHeader({
  databases,
  selectedDatabase,
  onDatabaseChange,
  clusters,
  selectedCluster,
  onClusterChange,
  clustersLoading,
  lastDataTimestamp,
}: SelectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">E6 Clusters</h1>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedDatabase || ""} onValueChange={onDatabaseChange}>
            <SelectTrigger className="w-[200px] justify-start">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {databases.map((db) => (
                <SelectItem key={db} value={db}>
                  {formatDisplayName(db)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />

          <Select
            value={selectedCluster || ""}
            onValueChange={onClusterChange}
            disabled={!selectedDatabase || clustersLoading}
          >
            <SelectTrigger className="w-[280px] justify-start">
              <Server className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder={clustersLoading ? "Loading clusters..." : "Select cluster"} />
            </SelectTrigger>
            <SelectContent>
              {clusters.map((c) => (
                <SelectItem key={c.cluster_name} value={c.cluster_name}>
                  {c.cluster_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCluster && (
        <DataHealthIndicator
          lastDataTimestamp={lastDataTimestamp}
          dataSource="e6metrics-exporter"
          expectedIntervalMinutes={1}
          warningThresholdMinutes={5}
          criticalThresholdMinutes={15}
        />
      )}
    </div>
  )
}

// Cost Summary Card
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

// Cost Time Series Chart with Overlays
interface CostTimeSeriesChartProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function CostTimeSeriesChart({ database, clusterName, dateRange }: CostTimeSeriesChartProps) {
  const [showCpu, setShowCpu] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [showQueries, setShowQueries] = useState(false)

  // Fetch cost data from kubernetes database
  const { data: costData } = useQuery<CostTimeSeriesRow>(
    "kubernetes",
    "getClusterCostTimeSeries",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

  // Fetch CPU data from E6 database (only when enabled)
  const { data: cpuData } = useQuery<CpuTimeSeriesRow>(
    "e6",
    "getClusterCpuTimeSeries",
    [clusterName, dateRange],
    { database, refetchInterval: 60000, enabled: showCpu }
  )

  // Fetch Memory data from E6 database (only when enabled)
  const { data: memoryData } = useQuery<MemoryTimeSeriesRow>(
    "e6",
    "getClusterMemoryTimeSeries",
    [clusterName, dateRange],
    { database, refetchInterval: 60000, enabled: showMemory }
  )

  // Fetch Query count data from E6 database (only when enabled)
  const { data: queryData } = useQuery<QueryCountTimeSeriesRow>(
    "e6",
    "getClusterQueryCountTimeSeries",
    [clusterName, dateRange],
    { database, refetchInterval: 60000, enabled: showQueries }
  )

  // Merge all data by time
  const chartData = useMemo(() => {
    if (!costData || costData.length === 0) return []

    // Create a map keyed by time
    const dataMap: Record<string, { time: string; cost: number; cpu?: number; memory?: number; queries?: number }> = {}

    // Add cost data
    costData.forEach(row => {
      const time = formatTime(row.time)
      dataMap[time] = { time, cost: row.hourly_cost || 0 }
    })

    // Add CPU data if enabled and available
    if (showCpu && cpuData) {
      cpuData.forEach(row => {
        const time = formatTime(row.ts)
        if (dataMap[time]) {
          dataMap[time].cpu = row.cpu_usage || 0
        }
      })
    }

    // Add Memory data if enabled and available
    if (showMemory && memoryData) {
      memoryData.forEach(row => {
        const time = formatTime(row.ts)
        if (dataMap[time]) {
          dataMap[time].memory = row.memory_usage_gb || 0
        }
      })
    }

    // Add Query data if enabled and available
    if (showQueries && queryData) {
      queryData.forEach(row => {
        const time = formatTime(row.ts)
        if (dataMap[time]) {
          dataMap[time].queries = row.query_count || 0
        }
      })
    }

    return Object.values(dataMap).sort((a, b) => a.time.localeCompare(b.time))
  }, [costData, cpuData, memoryData, queryData, showCpu, showMemory, showQueries])

  // Check if any overlays are active
  const hasOverlays = showCpu || showMemory || showQueries

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Cost Over Time</CardTitle>
              <CardDescription>Hourly infrastructure cost from OpenCost</CardDescription>
            </div>
          </div>
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Cost Over Time</CardTitle>
            <CardDescription>Hourly infrastructure cost from OpenCost</CardDescription>
          </div>
          <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 rounded-lg border">
            <span className="text-xs font-medium text-muted-foreground">Overlays:</span>
            <div className="flex items-center gap-1">
              <Checkbox
                id="cpu-overlay"
                checked={showCpu}
                onCheckedChange={(checked) => setShowCpu(checked === true)}
              />
              <Label htmlFor="cpu-overlay" className="text-xs cursor-pointer flex items-center gap-1">
                <Cpu className="h-3 w-3 text-blue-500" />
                CPU
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <Checkbox
                id="memory-overlay"
                checked={showMemory}
                onCheckedChange={(checked) => setShowMemory(checked === true)}
              />
              <Label htmlFor="memory-overlay" className="text-xs cursor-pointer flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-purple-500" />
                Memory
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <Checkbox
                id="queries-overlay"
                checked={showQueries}
                onCheckedChange={(checked) => setShowQueries(checked === true)}
              />
              <Label htmlFor="queries-overlay" className="text-xs cursor-pointer flex items-center gap-1">
                <Activity className="h-3 w-3 text-orange-500" />
                Queries
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              yAxisId="cost"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              orientation="left"
            />
            {hasOverlays && (
              <YAxis
                yAxisId="overlay"
                tick={{ fontSize: 10 }}
                orientation="right"
                tickFormatter={(v) => {
                  if (showQueries && v >= 1000) return `${(v / 1000).toFixed(0)}k`
                  if (showMemory) return `${v.toFixed(0)}GB`
                  return v.toFixed(0)
                }}
              />
            )}
            <RechartsTooltip
              contentStyle={{ fontSize: 11 }}
              formatter={(value, name) => {
                if (value === undefined || value === null) return ''
                const numValue = Number(value)
                if (name === "Hourly Cost") return `$${numValue.toFixed(4)}`
                if (name === "CPU Usage") return `${numValue.toFixed(0)} cores`
                if (name === "Memory") return `${numValue.toFixed(1)} GB`
                if (name === "Queries") return numValue.toFixed(0)
                return numValue
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="cost"
              type="linear"
              dataKey="cost"
              name="Hourly Cost"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            {showCpu && (
              <Line
                yAxisId="overlay"
                type="linear"
                dataKey="cpu"
                name="CPU Usage"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            )}
            {showMemory && (
              <Line
                yAxisId="overlay"
                type="linear"
                dataKey="memory"
                name="Memory"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            )}
            {showQueries && (
              <Line
                yAxisId="overlay"
                type="linear"
                dataKey="queries"
                name="Queries"
                stroke="#f97316"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Query Metrics Chart
interface QueryMetricsChartProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function QueryMetricsChart({ database, clusterName, dateRange }: QueryMetricsChartProps) {
  const { data: queryData } = useQuery<QueryMetricsRow>(
    "e6",
    "getQueryMetricsTimeSeries",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  const chartData = useMemo(() => {
    if (!queryData || queryData.length === 0) return []

    const byTime: Record<string, { time: string; active: number; queued: number; completed: number; failed: number }> = {}

    queryData.forEach(row => {
      const timeKey = formatTime(row.ts)
      if (!byTime[timeKey]) {
        byTime[timeKey] = { time: timeKey, active: 0, queued: 0, completed: 0, failed: 0 }
      }
      if (row.metric_name === 'io_e6x_E6Engine_NumActiveQueries') {
        byTime[timeKey].active = row.metric_value || 0
      } else if (row.metric_name === 'io_e6x_E6Engine_NumQueuedQueries') {
        byTime[timeKey].queued = row.metric_value || 0
      } else if (row.metric_name === 'io_e6x_E6Engine_NumCompletedQueries') {
        byTime[timeKey].completed = row.metric_value || 0
      } else if (row.metric_name === 'io_e6x_E6Engine_NumFailedQueries') {
        byTime[timeKey].failed = row.metric_value || 0
      }
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }, [queryData])

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Query Metrics</CardTitle>
          <CardDescription>Active, queued, completed, and failed queries</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
          No query data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Query Metrics</CardTitle>
        <CardDescription>Active, queued, completed, and failed queries over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsLineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <RechartsTooltip contentStyle={{ fontSize: 11 }} />
            <Line type="linear" dataKey="active" name="Active" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="linear" dataKey="queued" name="Queued" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="linear" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="linear" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={2} dot={false} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Component Metrics Charts
interface ComponentMetricsChartsProps {
  database: string
  clusterName: string
  dateRange: { startTs: string; endTs: string }
}

function ComponentMetricsCharts({ database, clusterName, dateRange }: ComponentMetricsChartsProps) {
  const { data: e6Data } = useQuery<ComponentTimeSeriesPoint>(
    "e6",
    "getComponentMetricsTimeSeries",
    [clusterName, dateRange],
    { database, refetchInterval: 60000 }
  )

  const { data: costData } = useQuery<ContainerCostPoint>(
    "kubernetes",
    "getContainerCostByComponent",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

  const componentCharts = useMemo(() => {
    const byComponent: Record<string, ComponentChartData[]> = {}
    const tempByComponent: Record<string, Record<string, ComponentChartData>> = {}

    if (e6Data && e6Data.length > 0) {
      e6Data.forEach(point => {
        const comp = point.component
        if (!comp) return

        if (!tempByComponent[comp]) tempByComponent[comp] = {}

        const timeKey = formatTime(point.ts)
        if (!tempByComponent[comp][timeKey]) {
          tempByComponent[comp][timeKey] = { time: timeKey, cpu: 0, memory: 0, cost: 0 }
        }
        tempByComponent[comp][timeKey].cpu += point.cpu_usage || 0
        tempByComponent[comp][timeKey].memory += point.memory_usage || 0
      })
    }

    if (costData && costData.length > 0) {
      costData.forEach(point => {
        const comp = point.component
        if (!comp) return

        if (!tempByComponent[comp]) tempByComponent[comp] = {}

        const timeKey = formatTime(point.time)
        if (!tempByComponent[comp][timeKey]) {
          tempByComponent[comp][timeKey] = { time: timeKey, cpu: 0, memory: 0, cost: 0 }
        }
        tempByComponent[comp][timeKey].cost += point.cpu_cost || 0
      })
    }

    Object.keys(tempByComponent).forEach(comp => {
      byComponent[comp] = Object.values(tempByComponent[comp]).sort((a, b) => a.time.localeCompare(b.time))
    })

    return byComponent
  }, [e6Data, costData])

  const components = Object.keys(componentCharts).sort()

  if (components.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Component Usage & Cost</CardTitle>
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
              <CardTitle className="text-sm font-medium capitalize">{component} - CPU & Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <RechartsAreaChart data={data}>
                  <defs>
                    <linearGradient id={`gradient-cpu-${component}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="cpu" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} stroke="#10b981" />
                  <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v.toFixed(2)}`} stroke="#f59e0b" />
                  <RechartsTooltip
                    contentStyle={{ fontSize: 10 }}
                    formatter={(value, name) => name === 'CPU' ? `${Number(value).toLocaleString()} sec` : `$${Number(value).toFixed(4)}`}
                  />
                  <Area yAxisId="cpu" type="linear" dataKey="cpu" name="CPU" stroke="#10b981" strokeWidth={2} fill={`url(#gradient-cpu-${component})`} />
                  <Line yAxisId="cost" type="linear" dataKey="cost" name="Cost" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// Component Summary Table
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

  const { data: nodeCostData } = useQuery<NodeCostRow>(
    "kubernetes",
    "getNodeCostBreakdown",
    [clusterName, dateRange],
    { refetchInterval: 60000 }
  )

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

    const totalCpuCores = Object.values(componentMap).reduce((sum, data) => {
      return sum + (data.cpuPeriod > 0 ? data.cpuQuota / data.cpuPeriod : 0)
    }, 0)

    return Object.entries(componentMap).map(([comp, data]) => {
      const cpuCores = data.cpuPeriod > 0 ? data.cpuQuota / data.cpuPeriod : 0
      let componentCost = 0
      const nodes = Array.from(data.nodes)
      if (nodes.length > 0 && totalCpuCores > 0) {
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

// Empty State Component
function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <Server className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Select a Customer and Cluster</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Use the dropdowns above to select a customer and cluster to view detailed metrics,
          cost information, and performance charts.
        </p>
      </CardContent>
    </Card>
  )
}

// Loading Skeleton
function ClusterDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[120px] w-full" />
      <Skeleton className="h-[280px] w-full" />
      <Skeleton className="h-[280px] w-full" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[220px] w-full" />
        ))}
      </div>
    </div>
  )
}

// Main Page Component
export default function E6ClustersPage() {
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)
  const { startTimestamp, endTimestamp } = useDate()
  const dateRange = useMemo(() => ({ startTs: startTimestamp, endTs: endTimestamp }), [startTimestamp, endTimestamp])

  // Fetch all E6 databases
  const { data: dbData, loading: dbLoading } = useQuery<DatabaseRow>(
    "e6",
    "getAllDatabases",
    [],
    { database: "information_schema" }
  )

  const e6Databases = useMemo(() => {
    if (!dbData) return []
    return dbData
      .map((row) => row.schema_name)
      .filter((db) => db.startsWith(E6_SCHEMA_PREFIX))
      .sort()
  }, [dbData])

  // Auto-select first database if only one or none selected
  useEffect(() => {
    if (e6Databases.length > 0 && !selectedDatabase) {
      setSelectedDatabase(e6Databases[0])
    }
  }, [e6Databases, selectedDatabase])

  // Fetch clusters for selected database
  const { data: clusterData, loading: clustersLoading } = useQuery<ClusterListRow>(
    "e6",
    "getClusterList",
    [dateRange],
    {
      database: selectedDatabase || "",
      refetchInterval: 60000,
      enabled: !!selectedDatabase
    }
  )

  const clusters = useMemo(() => clusterData || [], [clusterData])

  // Auto-select first cluster when database changes
  useEffect(() => {
    if (clusters.length > 0 && !selectedCluster) {
      setSelectedCluster(clusters[0].cluster_name)
    }
  }, [clusters, selectedCluster])

  // Reset cluster when database changes
  const handleDatabaseChange = (db: string) => {
    setSelectedDatabase(db)
    setSelectedCluster(null)
  }

  // Fetch data health for selected cluster
  const { data: healthData } = useQuery<DataHealthRow>(
    "e6",
    "getClusterDataHealth",
    [selectedCluster || ""],
    {
      database: selectedDatabase || "",
      refetchInterval: 60000,
      enabled: !!selectedDatabase && !!selectedCluster
    }
  )
  const lastDataTimestamp = healthData?.[0]?.last_data || null

  // Check if cluster data is loading
  const { loading: clusterDataLoading } = useQuery<TimeSeriesPoint>(
    "e6",
    "getContainerMetrics",
    [selectedCluster || "", dateRange],
    {
      database: selectedDatabase || "",
      refetchInterval: 60000,
      enabled: !!selectedDatabase && !!selectedCluster
    }
  )

  if (dbLoading) {
    return (
      <div className="space-y-6">
        <DateBanner />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[280px]" />
        </div>
        <ClusterDetailSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DateBanner />

      <SelectionHeader
        databases={e6Databases}
        selectedDatabase={selectedDatabase}
        onDatabaseChange={handleDatabaseChange}
        clusters={clusters}
        selectedCluster={selectedCluster}
        onClusterChange={setSelectedCluster}
        clustersLoading={clustersLoading}
        lastDataTimestamp={lastDataTimestamp}
      />

      {!selectedDatabase || !selectedCluster ? (
        <EmptyState />
      ) : clusterDataLoading ? (
        <ClusterDetailSkeleton />
      ) : (
        <>
          <CostSummaryCard clusterName={selectedCluster} dateRange={dateRange} />
          <CostTimeSeriesChart database={selectedDatabase} clusterName={selectedCluster} dateRange={dateRange} />
          <QueryMetricsChart database={selectedDatabase} clusterName={selectedCluster} dateRange={dateRange} />
          <ComponentMetricsCharts database={selectedDatabase} clusterName={selectedCluster} dateRange={dateRange} />
          <ComponentSummaryTable database={selectedDatabase} clusterName={selectedCluster} dateRange={dateRange} />
        </>
      )}
    </div>
  )
}
