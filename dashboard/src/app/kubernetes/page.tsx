"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  StatCard,
  DataTable,
  LineChart,
  BarChart,
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
    const grouped = new Map<string, Record<string, number>>()
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
    const grouped = new Map<string, Record<string, number>>()
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
    const grouped = new Map<string, Record<string, number>>()
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
        <div>
          <h1 className="text-2xl font-bold">Kubernetes Clusters</h1>
          <p className="text-muted-foreground">
            Cluster resources, pod metrics, and costs
          </p>
        </div>
        <div className="flex items-center gap-4">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard
          label="Running Pods"
          value={summaryData?.pod_count || filteredPods.length}
        />
        <StatCard
          label="Total Nodes"
          value={summaryData?.node_count || filteredNodes.length}
        />
        <StatCard
          label="CPU Allocated"
          value={summaryData?.total_cpu_alloc?.toFixed(2) || 0}
          suffix=" cores"
        />
        <StatCard
          label="Memory Allocated"
          value={(summaryData?.total_mem_alloc ? summaryData.total_mem_alloc / (1024 * 1024 * 1024) : 0).toFixed(1)}
          suffix=" GB"
        />
        <StatCard
          label="Namespace Cost/hr"
          value={namespaceCosts?.filter(n => selectedNamespace === 'all' || n.namespace === selectedNamespace)
            .reduce((sum, n) => sum + (n.estimated_cost_hourly || 0), 0) || 0}
          prefix="$"
        />
        <StatCard
          label="Cluster Cost/hr"
          value={summaryData?.cluster_hourly_cost?.toFixed(2) || 0}
          prefix="$"
        />
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
              <CardDescription>Estimated cost allocation by namespace</CardDescription>
            </CardHeader>
            <CardContent>
              {namespaceCosts && namespaceCosts.length > 0 ? (
                <BarChart
                  data={namespaceCosts.slice(0, 10).map(n => ({
                    namespace: n.namespace,
                    cost: n.estimated_cost_hourly || 0,
                  }))}
                  xAxisKey="namespace"
                  bars={[{ dataKey: "cost", name: "Cost/hr", color: "var(--chart-1)" }]}
                  height={250}
                />
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
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

          {/* Node Time Series Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

            <Card>
              <CardHeader>
                <CardTitle>Node Cost Breakdown</CardTitle>
                <CardDescription>Hourly cost per node</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredNodes.length > 0 ? (
                  <BarChart
                    data={filteredNodes.map(n => ({
                      name: n.name.split("-").pop() || n.name,
                      cost: n.cost_hourly || 0,
                    }))}
                    xAxisKey="name"
                    bars={[{ dataKey: "cost", name: "Cost/hr", color: "var(--chart-2)" }]}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
