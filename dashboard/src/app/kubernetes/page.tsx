"use client"

import { useState, useMemo } from "react"
import { groupBy, sumBy, uniq, orderBy, takeRight } from "lodash-es"
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
import {
  TimeRangePicker,
  ClusterSelector,
  NamespaceSelector,
  MockBadge,
  TableSkeleton,
  ChartSkeleton,
  StatCardSkeleton,
  QueryError,
  EmptyState,
  type DateRange,
} from "@/components/shared"
import { useQuery, formatBytes, formatCpu, formatCurrency, formatTime } from "@/hooks/useQuery"
import { kubernetesQueries } from "@/lib/queries"
import { CHART_COLORS } from "@/lib/utils"
import { Activity, AlertCircle, CheckCircle } from "lucide-react"

export default function KubernetesPage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()
  const [selectedCluster, setSelectedCluster] = useState<string>("")
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all")

  // Fetch data with loading and error states
  const { data: clusters, loading: clustersLoading, error: clustersError } = useQuery("kubernetes", kubernetesQueries.clusters, { refetchInterval: 60000 })
  const { data: namespaces } = useQuery("kubernetes", kubernetesQueries.namespaces(selectedCluster), { enabled: !!selectedCluster, refetchInterval: 60000 })
  const { data: pods, loading: podsLoading, error: podsError, refetch: refetchPods } = useQuery("kubernetes", kubernetesQueries.pods(selectedCluster, selectedNamespace), { enabled: !!selectedCluster, refetchInterval: 30000 })
  const { data: nodes, loading: nodesLoading, error: nodesError, refetch: refetchNodes } = useQuery("kubernetes", kubernetesQueries.nodes(selectedCluster), { enabled: !!selectedCluster, refetchInterval: 30000 })
  const { data: summary, loading: summaryLoading } = useQuery("kubernetes", kubernetesQueries.clusterSummary(selectedCluster), { enabled: !!selectedCluster, refetchInterval: 30000 })
  const { data: namespaceCosts } = useQuery("kubernetes", kubernetesQueries.costByNamespace(selectedCluster), { enabled: !!selectedCluster, refetchInterval: 60000 })
  const { data: cpuTimeSeries, loading: cpuLoading } = useQuery("kubernetes", kubernetesQueries.podCpuTimeSeries(selectedCluster, selectedNamespace, "1 hour"), { enabled: !!selectedCluster, refetchInterval: 60000 })
  const { data: memoryTimeSeries, loading: memoryLoading } = useQuery("kubernetes", kubernetesQueries.podMemoryTimeSeries(selectedCluster, selectedNamespace, "1 hour"), { enabled: !!selectedCluster, refetchInterval: 60000 })
  const { data: nodeCpuTimeSeries, loading: nodeCpuLoading } = useQuery("kubernetes", kubernetesQueries.nodeCpuTimeSeries(selectedCluster, "1 hour"), { enabled: !!selectedCluster, refetchInterval: 60000 })

  // Derived data with lodash
  const clusterList = useMemo(() => {
    const list = clusters?.map((c: Record<string, unknown>) => c.cluster as string) || []
    if (list.length > 0 && !selectedCluster) setSelectedCluster(list[0])
    return list
  }, [clusters, selectedCluster])

  const namespaceList = useMemo(() => namespaces?.map((n: Record<string, unknown>) => n.namespace as string) || [], [namespaces])

  // Transform time series for charts using lodash
  const transformTimeSeries = (data: Record<string, unknown>[] | null, valueKey: string, groupKey: string, transform?: (v: number) => number) => {
    if (!data) return []
    const grouped = groupBy(data, (r) => formatTime(r.time as string))
    return takeRight(Object.entries(grouped).map(([time, rows]) => ({
      time,
      ...Object.fromEntries(rows.map(r => [r[groupKey], transform ? transform(r[valueKey] as number) : r[valueKey]]))
    })), 20)
  }

  const cpuChartData = useMemo(() => transformTimeSeries(cpuTimeSeries, 'cpu_usage', 'pod'), [cpuTimeSeries])
  const memoryChartData = useMemo(() => transformTimeSeries(memoryTimeSeries, 'memory_usage', 'pod', v => v / (1024 * 1024)), [memoryTimeSeries])
  const nodeCpuChartData = useMemo(() => transformTimeSeries(nodeCpuTimeSeries, 'cpu_seconds', 'node'), [nodeCpuTimeSeries])

  // Unique names for chart lines
  const podNames = useMemo(() => uniq(cpuTimeSeries?.map((r: Record<string, unknown>) => r.pod as string).filter(Boolean) || []).slice(0, 5), [cpuTimeSeries])
  const nodeNames = useMemo(() => uniq(nodeCpuTimeSeries?.map((r: Record<string, unknown>) => r.node as string).filter(Boolean) || []).slice(0, 5), [nodeCpuTimeSeries])

  const summaryData = summary?.[0] as Record<string, number> | undefined
  const filteredPods = (pods || []) as Record<string, unknown>[]
  const filteredNodes = (nodes || []) as Record<string, unknown>[]

  // Utilization with lodash
  const clusterUtilization = useMemo(() => {
    if (!filteredPods.length) return { cpu: 0, memory: 0 }
    const cpuAlloc = sumBy(filteredPods, p => (p.cpu_alloc as number) || 0)
    const cpuUsed = sumBy(filteredPods, p => (p.cpu_used as number) || 0)
    const memAlloc = sumBy(filteredPods, p => (p.mem_alloc as number) || 0)
    const memUsed = sumBy(filteredPods, p => (p.mem_used as number) || 0)
    return { cpu: cpuAlloc > 0 ? (cpuUsed / cpuAlloc) * 100 : 0, memory: memAlloc > 0 ? (memUsed / memAlloc) * 100 : 0 }
  }, [filteredPods])

  // Sorted data with lodash
  const sortedNamespaceCosts = useMemo(() => orderBy(namespaceCosts || [], ['estimated_cost_hourly'], ['desc']), [namespaceCosts])
  const sortedNodesByCost = useMemo(() => orderBy(filteredNodes, ['cost_hourly'], ['desc']), [filteredNodes])

  // Health check
  const clusterHealth = clusterUtilization.cpu > 90 || clusterUtilization.memory > 90 ? 'critical' : clusterUtilization.cpu > 75 || clusterUtilization.memory > 75 ? 'warning' : 'healthy'

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
          <MockBadge />
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
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
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

        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
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

        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
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

        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
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
        <Card className="bg-muted/50 relative">
          <MockBadge className="absolute top-1 right-1" />
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Nodes</span>
            <span className="font-mono font-semibold">{summaryData?.node_count || filteredNodes.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 relative">
          <MockBadge className="absolute top-1 right-1" />
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">CPU Cores</span>
            <span className="font-mono font-semibold">{summaryData?.total_cpu_alloc?.toFixed(1) || 0}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 relative">
          <MockBadge className="absolute top-1 right-1" />
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Memory</span>
            <span className="font-mono font-semibold">{(summaryData?.total_mem_alloc ? summaryData.total_mem_alloc / (1024 * 1024 * 1024) : 0).toFixed(0)}Gi</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 relative">
          <MockBadge className="absolute top-1 right-1" />
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Namespaces</span>
            <span className="font-mono font-semibold">{namespaceList.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 relative">
          <MockBadge className="absolute top-1 right-1" />
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">NS Cost/hr</span>
            <span className="font-mono font-semibold">{formatCurrency(sumBy(namespaceCosts?.filter(n => selectedNamespace === 'all' || n.namespace === selectedNamespace) || [], r => Number(r.estimated_cost_hourly) || 0), 2)}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50 relative">
          <MockBadge className="absolute top-1 right-1" />
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
          <Card className="relative">
            <MockBadge className="absolute top-2 right-2" />
            <CardHeader>
              <CardTitle>Pod Resources</CardTitle>
              <CardDescription>
                Resource allocation and usage for pods in {selectedNamespace === "all" ? "all namespaces" : selectedNamespace}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {podsLoading ? (
                <TableSkeleton rows={8} />
              ) : podsError ? (
                <QueryError message={podsError} onRetry={refetchPods} />
              ) : filteredPods.length > 0 ? (
                <DataTable data={filteredPods} columns={podColumns} hoverable striped />
              ) : (
                <EmptyState message="No pods found" />
              )}
            </CardContent>
          </Card>

          {/* Pod Time Series Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="relative">
              <MockBadge className="absolute top-2 right-2" />
              <CardHeader>
                <CardTitle>Pod CPU Usage</CardTitle>
                <CardDescription>CPU usage over time (last hour)</CardDescription>
              </CardHeader>
              <CardContent>
                {cpuLoading ? (
                  <ChartSkeleton height={300} />
                ) : cpuChartData.length > 0 ? (
                  <LineChart
                    data={cpuChartData}
                    xAxisKey="time"
                    lines={podNames.map((pod, i) => ({
                      dataKey: pod,
                      name: pod.substring(0, 20),
                      color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                    height={300}
                    showLegend
                  />
                ) : (
                  <EmptyState />
                )}
              </CardContent>
            </Card>

            <Card className="relative">
              <MockBadge className="absolute top-2 right-2" />
              <CardHeader>
                <CardTitle>Pod Memory Usage</CardTitle>
                <CardDescription>Memory usage in MB over time (last hour)</CardDescription>
              </CardHeader>
              <CardContent>
                {memoryLoading ? (
                  <ChartSkeleton height={300} />
                ) : memoryChartData.length > 0 ? (
                  <LineChart
                    data={memoryChartData}
                    xAxisKey="time"
                    lines={podNames.map((pod, i) => ({
                      dataKey: pod,
                      name: pod.substring(0, 20),
                      color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                    height={300}
                    yAxisFormatter={(value) => `${value}Mi`}
                    showLegend
                  />
                ) : (
                  <EmptyState />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          <Card className="relative">
            <MockBadge className="absolute top-2 right-2" />
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
          <Card className="relative">
            <MockBadge className="absolute top-2 right-2" />
            <CardHeader>
              <CardTitle>Node Resources</CardTitle>
              <CardDescription>
                Resource capacity and usage for cluster nodes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nodesLoading ? (
                <TableSkeleton rows={6} />
              ) : nodesError ? (
                <QueryError message={nodesError} onRetry={refetchNodes} />
              ) : filteredNodes.length > 0 ? (
                <DataTable data={filteredNodes} columns={nodeColumns} hoverable striped />
              ) : (
                <EmptyState message="No nodes found" />
              )}
            </CardContent>
          </Card>

          {/* Node CPU Time Series */}
          <Card className="relative">
            <MockBadge className="absolute top-2 right-2" />
            <CardHeader>
              <CardTitle>Node CPU Usage</CardTitle>
              <CardDescription>CPU seconds per node (last hour)</CardDescription>
            </CardHeader>
            <CardContent>
              {nodeCpuLoading ? (
                <ChartSkeleton height={300} />
              ) : nodeCpuChartData.length > 0 ? (
                <LineChart
                  data={nodeCpuChartData}
                  xAxisKey="time"
                  lines={nodeNames.map((node, i) => ({
                    dataKey: node,
                    name: node.substring(0, 15),
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                  height={300}
                  showLegend
                />
              ) : (
                <EmptyState />
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
              {nodesLoading ? (
                <TableSkeleton rows={5} />
              ) : sortedNodesByCost.length > 0 ? (
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
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
