"use client"

import { useState, useEffect, useMemo } from "react"
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
  Cpu,
  Database,
  HardDrive,
  Layers,
  Box,
} from "lucide-react"
import { DateBanner } from "@/components/shared"
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

// E6 Component types
type ComponentType = "executor" | "planner" | "queue" | "storage" | "schema"

export default function ClusterDetailPage() {
  const params = useParams()
  const database = params.customer as string
  const clusterName = decodeURIComponent(params.cluster as string)

  const [executorData, setExecutorData] = useState<TimeSeriesPoint[]>([])
  const [queueData, setQueueData] = useState<TimeSeriesPoint[]>([])
  const [storageData, setStorageData] = useState<TimeSeriesPoint[]>([])
  const [schemaData, setSchemaData] = useState<TimeSeriesPoint[]>([])
  const [containerData, setContainerData] = useState<TimeSeriesPoint[]>([])
  const [componentSummary, setComponentSummary] = useState<ComponentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Calculate cost from resource usage (simplified: $0.05/CPU-hour, $0.01/GB-hour)
  const calculateCost = (cpuSeconds: number, memoryBytes: number) => {
    const cpuHours = cpuSeconds / 3600
    const gbHours = memoryBytes / (1024 * 1024 * 1024) / 3600
    return (cpuHours * 0.05) + (gbHours * 0.01)
  }

  // Fetch all metrics
  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true)
      setError(null)

      const timeRange = "NOW() - INTERVAL '6 hours'"

      try {
        // Fetch executor metrics
        const executorResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT ts, metric_name, metric_value
              FROM e6_executor_metrics
              WHERE cluster_name = '${clusterName}'
                AND ts >= ${timeRange}
              ORDER BY ts
            `,
          }),
        })
        const executorResult = await executorResponse.json()
        if (executorResult.data) setExecutorData(executorResult.data)

        // Fetch queue metrics (includes planner)
        const queueResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT ts, metric_name, metric_value
              FROM e6_queue_metrics
              WHERE cluster_name = '${clusterName}'
                AND ts >= ${timeRange}
              ORDER BY ts
            `,
          }),
        })
        const queueResult = await queueResponse.json()
        if (queueResult.data) setQueueData(queueResult.data)

        // Fetch storage metrics
        const storageResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT ts, metric_name, metric_value
              FROM e6_storage_metrics
              WHERE cluster_name = '${clusterName}'
                AND ts >= ${timeRange}
              ORDER BY ts
            `,
          }),
        })
        const storageResult = await storageResponse.json()
        if (storageResult.data) setStorageData(storageResult.data)

        // Fetch schema metrics
        const schemaResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT ts, metric_name, metric_value
              FROM e6_schema_metrics
              WHERE cluster_name = '${clusterName}'
                AND ts >= ${timeRange}
              ORDER BY ts
            `,
          }),
        })
        const schemaResult = await schemaResponse.json()
        if (schemaResult.data) setSchemaData(schemaResult.data)

        // Fetch container metrics (for CPU and memory)
        const containerResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT ts, metric_name, metric_value
              FROM e6_container_metrics
              WHERE cluster_name = '${clusterName}'
                AND ts >= ${timeRange}
              ORDER BY ts
            `,
          }),
        })
        const containerResult = await containerResponse.json()
        if (containerResult.data) setContainerData(containerResult.data)

        // Fetch component summary (pod counts, specs, and nodes)
        const summaryResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT
                component,
                pod,
                node,
                metric_name,
                MAX(metric_value) as metric_value
              FROM e6_container_metrics
              WHERE cluster_name = '${clusterName}'
                AND ts >= NOW() - INTERVAL '10 minutes'
                AND component != ''
                AND metric_name IN (
                  'e6data_container_spec_cpu_quota',
                  'e6data_container_spec_cpu_period',
                  'e6data_container_requests',
                  'e6data_container_memory_usage_bytes',
                  'e6data_container_restart_count'
                )
              GROUP BY component, pod, node, metric_name
              ORDER BY component
            `,
          }),
        })
        const summaryResult = await summaryResponse.json()
        if (summaryResult.data) {
          // Group by component and aggregate specs
          const componentMap: Record<string, {
            pods: Set<string>
            nodes: Set<string>
            cpuQuota: number
            cpuPeriod: number
            memoryRequest: number
            memoryUsage: number
            restarts: number
          }> = {}

          for (const row of summaryResult.data) {
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

            // Aggregate metrics (use max for specs, sum for usage)
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

          const summary: ComponentSummary[] = Object.entries(componentMap).map(([comp, data]) => ({
            component: comp,
            podCount: data.pods.size,
            cpuCores: data.cpuPeriod > 0 ? data.cpuQuota / data.cpuPeriod : 0,
            memoryRequest: data.memoryRequest,
            memoryUsage: data.memoryUsage,
            restarts: data.restarts,
            nodes: Array.from(data.nodes),
          }))
          setComponentSummary(summary)
        }

      } catch (err) {
        console.error("Error fetching metrics:", err)
        setError("Failed to fetch cluster metrics")
      } finally {
        setLoading(false)
      }
    }

    if (database && clusterName) {
      fetchMetrics()
    }
  }, [database, clusterName])

  // Transform data for dual-axis chart (CPU vs Cost)
  const transformCpuCostData = (data: TimeSeriesPoint[], componentFilter: string): ChartDataPoint[] => {
    if (!data || data.length === 0) return []

    const byTime: Record<string, ChartDataPoint> = {}

    data.forEach(point => {
      // Filter by component
      if (!point.metric_name.toLowerCase().includes(componentFilter.toLowerCase())) {
        return
      }

      const timeKey = point.ts
      if (!byTime[timeKey]) {
        byTime[timeKey] = { time: formatTime(point.ts), cpu: 0, cost: 0 }
      }

      // Look for CPU-related metrics
      if (point.metric_name.includes('cpu') ||
          point.metric_name.includes('CPU') ||
          point.metric_name.includes('Thread') ||
          point.metric_name.includes('Uptime')) {
        byTime[timeKey].cpu = (byTime[timeKey].cpu || 0) + point.metric_value
      }
    })

    // Calculate cost based on CPU usage
    Object.values(byTime).forEach(point => {
      point.cost = (point.cpu || 0) * 0.00001 // Simplified cost calculation
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }

  // Transform data for dual-axis chart (Memory vs Cost)
  const transformMemoryCostData = (data: TimeSeriesPoint[], componentFilter: string): ChartDataPoint[] => {
    if (!data || data.length === 0) return []

    const byTime: Record<string, ChartDataPoint> = {}

    data.forEach(point => {
      // Filter by component
      if (!point.metric_name.toLowerCase().includes(componentFilter.toLowerCase())) {
        return
      }

      const timeKey = point.ts
      if (!byTime[timeKey]) {
        byTime[timeKey] = { time: formatTime(point.ts), memory: 0, cost: 0 }
      }

      // Look for memory-related metrics
      if (point.metric_name.includes('Memory') ||
          point.metric_name.includes('memory') ||
          point.metric_name.includes('Heap') ||
          point.metric_name.includes('Cache') ||
          point.metric_name.includes('Size')) {
        byTime[timeKey].memory = (byTime[timeKey].memory || 0) + point.metric_value
      }
    })

    // Calculate cost based on memory usage
    Object.values(byTime).forEach(point => {
      point.cost = (point.memory || 0) * 0.00000001 // Simplified cost calculation
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }

  // Transform container data for CPU/Memory charts
  const transformContainerData = (componentType: ComponentType, metricType: 'cpu' | 'memory'): ChartDataPoint[] => {
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

    // Calculate cost
    Object.values(byTime).forEach(point => {
      if (metricType === 'cpu') {
        point.cost = (point.cpu || 0) * 0.00001
      } else {
        point.cost = (point.memory || 0) / (1024 * 1024 * 1024) * 0.01
      }
    })

    return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time))
  }

  // Prepare chart data for each component
  const executorCpuData = useMemo(() => transformContainerData('executor', 'cpu'), [containerData])
  const executorMemoryData = useMemo(() => transformContainerData('executor', 'memory'), [containerData])

  const plannerCpuData = useMemo(() => transformCpuCostData(queueData, 'Planner'), [queueData])
  const plannerMemoryData = useMemo(() => transformMemoryCostData(queueData, 'Planner'), [queueData])

  const queueCpuData = useMemo(() => transformCpuCostData(queueData, 'Queue'), [queueData])
  const queueMemoryData = useMemo(() => transformMemoryCostData(queueData, 'Queue'), [queueData])

  const storageCpuData = useMemo(() => transformCpuCostData(storageData, ''), [storageData])
  const storageMemoryData = useMemo(() => transformMemoryCostData(storageData, ''), [storageData])

  const schemaCpuData = useMemo(() => transformCpuCostData(schemaData, ''), [schemaData])
  const schemaMemoryData = useMemo(() => transformMemoryCostData(schemaData, ''), [schemaData])

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/e6/${database}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
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
              Back
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
      <div className="flex items-center gap-4">
        <Link href={`/e6/${database}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {customerName}
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
                    const icon = comp === 'executor' ? <Cpu className="h-4 w-4" /> :
                                 comp === 'storage' ? <HardDrive className="h-4 w-4" /> :
                                 comp === 'schema' ? <Database className="h-4 w-4" /> :
                                 comp === 'planner' ? <Layers className="h-4 w-4" /> :
                                 comp === 'queue' ? <Layers className="h-4 w-4" /> :
                                 <Box className="h-4 w-4" />
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
