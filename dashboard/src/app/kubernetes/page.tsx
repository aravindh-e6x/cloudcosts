"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  LineChart,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
} from "laminar-ui"
import { TimeRangePicker, ClusterSelector, NamespaceSelector, type DateRange } from "@/components/shared"
import { useQuery, formatBytes, formatCpu, formatCurrency, formatTime } from "@/hooks/useQuery"
import { kubernetesQueries } from "@/lib/queries"
import { Activity, AlertCircle, CheckCircle } from "lucide-react"

interface Cluster {
  cluster: string
}

interface Namespace {
  namespace: string
}

interface Pod {
  name: string
  namespace: string
  node: string
  created_by_kind: string
  created_by_name: string
  cpu_alloc: number
  mem_alloc: number
  cpu_used: number
  mem_used: number
  [key: string]: unknown
}

interface Node {
  name: string
  instance_type: string
  region: string
  cost_hourly: number
  cpu_capacity: number
  mem_capacity: number
  mem_used: number
  pods: number
  [key: string]: unknown
}

interface CpuTimeSeries {
  time: string
  pod: string
  cpu_usage: number
}

interface MemoryTimeSeries {
  time: string
  pod: string
  memory_usage: number
}

interface NodeCpuTimeSeries {
  time: string
  node: string
  cpu_seconds: number
}

interface NamespaceCost {
  namespace: string
  total_cpu: number
  total_mem: number
  estimated_cost_hourly: number
}

interface ClusterSummary {
  pod_count: number
  node_count: number
  total_cpu_alloc: number
  total_mem_alloc: number
  cluster_hourly_cost: number
}

export default function KubernetesPage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()
  const [selectedCluster, setSelectedCluster] = useState<string>("")
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all")

  // Fetch clusters
  const { data: clusters, loading: clustersLoading } = useQuery<Cluster>(
    "kubernetes",
    kubernetesQueries.clusters,
    { refetchInterval: 60000 }
  )

  // Set default cluster when loaded
  const clusterList = useMemo(() => {
    const list = clusters?.map(c => c.cluster) || []
    if (list.length > 0 && !selectedCluster) {
      setSelectedCluster(list[0])
    }
    return list
  }, [clusters, selectedCluster])

  // Fetch namespaces for selected cluster
  const { data: namespaces } = useQuery<Namespace>(
    "kubernetes",
    kubernetesQueries.namespaces(selectedCluster),
    { enabled: !!selectedCluster, refetchInterval: 60000 }
  )

  const namespaceList = useMemo(() =>
    namespaces?.map(n => n.namespace) || [],
    [namespaces]
  )

  // Fetch pods
  const { data: pods, loading: podsLoading } = useQuery<Pod>(
    "kubernetes",
    kubernetesQueries.pods(selectedCluster, selectedNamespace),
    { enabled: !!selectedCluster, refetchInterval: 30000 }
  )

  // Fetch nodes
  const { data: nodes, loading: nodesLoading } = useQuery<Node>(
    "kubernetes",
    kubernetesQueries.nodes(selectedCluster),
    { enabled: !!selectedCluster, refetchInterval: 30000 }
  )

  // Fetch cluster summary
  const { data: summary } = useQuery<ClusterSummary>(
    "kubernetes",
    kubernetesQueries.clusterSummary(selectedCluster),
    { enabled: !!selectedCluster, refetchInterval: 30000 }
  )

  // Fetch cost by namespace
  const { data: namespaceCosts } = useQuery<NamespaceCost>(
    "kubernetes",
    kubernetesQueries.costByNamespace(selectedCluster),
    { enabled: !!selectedCluster, refetchInterval: 60000 }
  )

  // Fetch CPU time series
  const { data: cpuTimeSeries } = useQuery<CpuTimeSeries>(
    "kubernetes",
    kubernetesQueries.podCpuTimeSeries(selectedCluster, selectedNamespace, "1 hour"),
    { enabled: !!selectedCluster, refetchInterval: 60000 }
  )

  // Fetch Memory time series
  const { data: memoryTimeSeries } = useQuery<MemoryTimeSeries>(
    "kubernetes",
    kubernetesQueries.podMemoryTimeSeries(selectedCluster, selectedNamespace, "1 hour"),
    { enabled: !!selectedCluster, refetchInterval: 60000 }
  )

  // Fetch Node CPU time series
  const { data: nodeCpuTimeSeries } = useQuery<NodeCpuTimeSeries>(
    "kubernetes",
    kubernetesQueries.nodeCpuTimeSeries(selectedCluster, "1 hour"),
    { enabled: !!selectedCluster, refetchInterval: 60000 }
  )

  // Transform time series data for charts
  const cpuChartData = useMemo(() => {
    if (!cpuTimeSeries) return []
    const grouped = new Map<string, Record<string, string | number>>()
    cpuTimeSeries.forEach(item => {
      const time = formatTime(item.time)
      if (!grouped.has(time)) {
        grouped.set(time, { time })
      }
      grouped.get(time)![item.pod] = item.cpu_usage
    })
    return Array.from(grouped.values()).slice(-20)
  }, [cpuTimeSeries])

  const memoryChartData = useMemo(() => {
    if (!memoryTimeSeries) return []
    const grouped = new Map<string, Record<string, string | number>>()
    memoryTimeSeries.forEach(item => {
      const time = formatTime(item.time)
      if (!grouped.has(time)) {
        grouped.set(time, { time })
      }
      grouped.get(time)![item.pod] = item.memory_usage / (1024 * 1024) // Convert to MB
    })
    return Array.from(grouped.values()).slice(-20)
  }, [memoryTimeSeries])

  const nodeCpuChartData = useMemo(() => {
    if (!nodeCpuTimeSeries) return []
    const grouped = new Map<string, Record<string, string | number>>()
    nodeCpuTimeSeries.forEach(item => {
      const time = formatTime(item.time)
      if (!grouped.has(time)) {
        grouped.set(time, { time })
      }
      grouped.get(time)![item.node] = item.cpu_seconds
    })
    return Array.from(grouped.values()).slice(-20)
  }, [nodeCpuTimeSeries])

  // Get unique pod/node names for chart lines
  const podNames = useMemo(() => {
    if (!cpuTimeSeries) return []
    return [...new Set(cpuTimeSeries.map(item => item.pod))].slice(0, 5)
  }, [cpuTimeSeries])

  const nodeNames = useMemo(() => {
    if (!nodeCpuTimeSeries) return []
    return [...new Set(nodeCpuTimeSeries.map(item => item.node))].slice(0, 5)
  }, [nodeCpuTimeSeries])

  const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

  const summaryData = summary?.[0]
  const filteredPods = pods || []
  const filteredNodes = nodes || []

  // Calculate utilization percentages
  const clusterUtilization = useMemo(() => {
    if (!filteredPods.length) return { cpu: 0, memory: 0 }
    const totalCpuAlloc = filteredPods.reduce((sum, p) => sum + (p.cpu_alloc || 0), 0)
    const totalCpuUsed = filteredPods.reduce((sum, p) => sum + (p.cpu_used || 0), 0)
    const totalMemAlloc = filteredPods.reduce((sum, p) => sum + (p.mem_alloc || 0), 0)
    const totalMemUsed = filteredPods.reduce((sum, p) => sum + (p.mem_used || 0), 0)
    return {
      cpu: totalCpuAlloc > 0 ? (totalCpuUsed / totalCpuAlloc) * 100 : 0,
      memory: totalMemAlloc > 0 ? (totalMemUsed / totalMemAlloc) * 100 : 0
    }
  }, [filteredPods])

  // Sorted namespace costs for table
  const sortedNamespaceCosts = useMemo(() => {
    if (!namespaceCosts || namespaceCosts.length === 0) return []
    return [...namespaceCosts].sort((a, b) => (b.estimated_cost_hourly || 0) - (a.estimated_cost_hourly || 0))
  }, [namespaceCosts])

  // Sorted nodes by cost for table
  const sortedNodesByCost = useMemo(() => {
    if (!filteredNodes || filteredNodes.length === 0) return []
    return [...filteredNodes].sort((a, b) => (b.cost_hourly || 0) - (a.cost_hourly || 0))
  }, [filteredNodes])

  // Health check based on utilization
  const clusterHealth = useMemo(() => {
    if (clusterUtilization.cpu > 90 || clusterUtilization.memory > 90) return 'critical'
    if (clusterUtilization.cpu > 75 || clusterUtilization.memory > 75) return 'warning'
    return 'healthy'
  }, [clusterUtilization])

  const podColumns = [
    { key: "name", header: "Pod Name", sortable: true },
    { key: "namespace", header: "Namespace", sortable: true },
    { key: "node", header: "Node", sortable: true },
    { key: "created_by_kind", header: "Owner Kind", sortable: true, render: (value: unknown) => (
      <Badge variant="outline">{String(value) || "N/A"}</Badge>
    )},
    { key: "cpu_alloc", header: "CPU Alloc", sortable: true, render: (value: unknown) => formatCpu(Number(value) * 1000) },
    { key: "cpu_used", header: "CPU Used", sortable: true, render: (value: unknown) => formatCpu(Number(value) * 1000) },
    { key: "mem_alloc", header: "Mem Alloc", sortable: true, render: (value: unknown) => formatBytes(Number(value)) },
    { key: "mem_used", header: "Mem Used", sortable: true, render: (value: unknown) => formatBytes(Number(value)) },
  ]

  const nodeColumns = [
    { key: "name", header: "Node Name", sortable: true },
    { key: "instance_type", header: "Instance Type", sortable: true },
    { key: "region", header: "Region", sortable: true },
    { key: "cpu_capacity", header: "CPU Cap", sortable: true, render: (value: unknown) => `${Number(value)} cores` },
    { key: "mem_capacity", header: "Mem Cap", sortable: true, render: (value: unknown) => formatBytes(Number(value)) },
    { key: "mem_used", header: "Mem Used", sortable: true, render: (value: unknown) => formatBytes(Number(value)) },
    { key: "pods", header: "Pods", sortable: true },
    { key: "cost_hourly", header: "Cost/hr", sortable: true, render: (value: unknown) => formatCurrency(Number(value), 3) },
  ]

  if (clustersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Kubernetes Clusters</h1>
            <p className="text-muted-foreground">
              Cluster resources, pod metrics, and costs
            </p>
          </div>
          {selectedCluster && (
            <Badge
              variant={clusterHealth === 'healthy' ? 'default' : clusterHealth === 'warning' ? 'secondary' : 'destructive'}
              className="flex items-center gap-1"
            >
              {clusterHealth === 'healthy' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {clusterHealth === 'healthy' ? 'Healthy' : clusterHealth === 'warning' ? 'Warning' : 'Critical'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>30s refresh</span>
          </div>
          <ClusterSelector
            clusters={clusterList}
            value={selectedCluster}
            onChange={setSelectedCluster}
          />
          <NamespaceSelector
            namespaces={namespaceList}
            value={selectedNamespace}
            onChange={setSelectedNamespace}
          />
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Running Pods</p>
                <p className="text-3xl font-bold">{summaryData?.pod_count || filteredPods.length}</p>
                <p className="text-xs text-muted-foreground mt-1">across {namespaceList.length} namespaces</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CPU Utilization</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{clusterUtilization.cpu.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">used</p>
            </div>
            <div className="mt-2 h-2 bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${clusterUtilization.cpu > 80 ? 'bg-red-500' : clusterUtilization.cpu > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(clusterUtilization.cpu, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Memory Utilization</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{clusterUtilization.memory.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">used</p>
            </div>
            <div className="mt-2 h-2 bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${clusterUtilization.memory > 80 ? 'bg-red-500' : clusterUtilization.memory > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(clusterUtilization.memory, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Estimated Cost</p>
            <p className="text-3xl font-bold">{formatCurrency(summaryData?.cluster_hourly_cost || 0, 2)}<span className="text-sm font-normal">/hr</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              ~{formatCurrency((summaryData?.cluster_hourly_cost || 0) * 24 * 30, 0)}/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Nodes</span>
            <span className="font-mono font-semibold">{summaryData?.node_count || filteredNodes.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">CPU Cores</span>
            <span className="font-mono font-semibold">{summaryData?.total_cpu_alloc?.toFixed(1) || 0}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Memory</span>
            <span className="font-mono font-semibold">{(summaryData?.total_mem_alloc ? summaryData.total_mem_alloc / (1024 * 1024 * 1024) : 0).toFixed(0)}Gi</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Namespaces</span>
            <span className="font-mono font-semibold">{namespaceList.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">NS Cost/hr</span>
            <span className="font-mono font-semibold">{formatCurrency(namespaceCosts?.filter(n => selectedNamespace === 'all' || n.namespace === selectedNamespace).reduce((sum, n) => sum + (n.estimated_cost_hourly || 0), 0) || 0, 2)}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Cluster</span>
            <span className="font-mono font-semibold text-xs">{selectedCluster.split('-').slice(-1)[0] || '-'}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Pods vs Nodes */}
      <Tabs defaultValue="pods">
        <TabsList>
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
        </TabsList>

        <TabsContent value="pods" className="space-y-6 mt-4">
          {/* Pod Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pod Resources</CardTitle>
              <CardDescription>
                Resource allocation and usage for pods in {selectedNamespace === "all" ? "all namespaces" : selectedNamespace}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {podsLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <DataTable
                  data={filteredPods}
                  columns={podColumns}
                  hoverable
                  striped
                />
              )}
            </CardContent>
          </Card>

          {/* Pod Time Series Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pod CPU Usage</CardTitle>
                <CardDescription>CPU usage over time (last hour)</CardDescription>
              </CardHeader>
              <CardContent>
                {cpuChartData.length > 0 ? (
                  <LineChart
                    data={cpuChartData}
                    xAxisKey="time"
                    lines={podNames.map((pod, i) => ({
                      dataKey: pod,
                      name: pod.substring(0, 20),
                      color: chartColors[i % chartColors.length],
                    }))}
                    height={300}
                    showLegend
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pod Memory Usage</CardTitle>
                <CardDescription>Memory usage in MB over time (last hour)</CardDescription>
              </CardHeader>
              <CardContent>
                {memoryChartData.length > 0 ? (
                  <LineChart
                    data={memoryChartData}
                    xAxisKey="time"
                    lines={podNames.map((pod, i) => ({
                      dataKey: pod,
                      name: pod.substring(0, 20),
                      color: chartColors[i % chartColors.length],
                    }))}
                    height={300}
                    yAxisFormatter={(value) => `${value}Mi`}
                    showLegend
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Namespace</CardTitle>
              <CardDescription>Estimated hourly cost by namespace (high to low)</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedNamespaceCosts.length > 0 ? (
                <DataTable
                  data={sortedNamespaceCosts.map(n => ({
                    namespace: n.namespace,
                    total_cpu: n.total_cpu,
                    total_mem: n.total_mem,
                    estimated_cost_hourly: n.estimated_cost_hourly || 0,
                  }))}
                  columns={[
                    { key: "namespace", header: "Namespace", sortable: true },
                    { key: "total_cpu", header: "CPU", sortable: true, render: (value: unknown) => formatCpu(Number(value) * 1000) },
                    { key: "total_mem", header: "Memory", sortable: true, render: (value: unknown) => formatBytes(Number(value)) },
                    { key: "estimated_cost_hourly", header: "Cost/hr", sortable: true, render: (value: unknown) => formatCurrency(Number(value), 3) },
                  ]}
                  hoverable
                  striped
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nodes" className="space-y-6 mt-4">
          {/* Node Table */}
          <Card>
            <CardHeader>
              <CardTitle>Node Resources</CardTitle>
              <CardDescription>
                Resource capacity and usage for cluster nodes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nodesLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <DataTable
                  data={filteredNodes}
                  columns={nodeColumns}
                  hoverable
                  striped
                />
              )}
            </CardContent>
          </Card>

          {/* Node CPU Time Series */}
          <Card>
            <CardHeader>
              <CardTitle>Node CPU Usage</CardTitle>
              <CardDescription>CPU seconds per node (last hour)</CardDescription>
            </CardHeader>
            <CardContent>
              {nodeCpuChartData.length > 0 ? (
                <LineChart
                  data={nodeCpuChartData}
                  xAxisKey="time"
                  lines={nodeNames.map((node, i) => ({
                    dataKey: node,
                    name: node.substring(0, 15),
                    color: chartColors[i % chartColors.length],
                  }))}
                  height={300}
                  showLegend
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Node Cost Table */}
          <Card>
            <CardHeader>
              <CardTitle>Node Cost Breakdown</CardTitle>
              <CardDescription>Hourly cost per node (high to low)</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedNodesByCost.length > 0 ? (
                <DataTable
                  data={sortedNodesByCost}
                  columns={[
                    { key: "name", header: "Node Name", sortable: true },
                    { key: "instance_type", header: "Instance Type", sortable: true },
                    { key: "pods", header: "Pods", sortable: true },
                    { key: "cost_hourly", header: "Cost/hr", sortable: true, render: (value: unknown) => formatCurrency(Number(value), 3) },
                  ]}
                  hoverable
                  striped
                />
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
