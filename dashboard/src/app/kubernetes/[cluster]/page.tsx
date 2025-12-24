"use client"

import { useState, useMemo, use, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { groupBy, sumBy, uniq, orderBy, takeRight } from "lodash-es"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  LineChart,
  AreaChart,
  BarChart,
  PieChart,
  StackedBarChart,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  CircularProgress,
  Button,
} from "laminar-ui"
import {
  TimeRangePicker,
  NamespaceSelector,
  MockBadge,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  type DateRange,
} from "@/components/shared"
import { useQuery, formatBytes, formatCpu, formatCurrency, formatTime } from "@/hooks/useQuery"
import { kubernetesQueries } from "@/lib/queries"
import { CHART_COLORS } from "@/lib/utils"
import { Activity, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"

interface ClusterPageProps {
  params: Promise<{ cluster: string }>
}

function ClusterDetailContent({ cluster }: { cluster: string }) {
  const selectedCluster = decodeURIComponent(cluster)

  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const [timeRange, setTimeRange] = useState<DateRange | undefined>(() => {
    if (dateParam) {
      const date = new Date(dateParam)
      return { from: date, to: date }
    }
    return { from: new Date(), to: new Date() }
  })
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all")

  const selectedDate = useMemo(() => {
    return (timeRange?.from || new Date()).toISOString().split('T')[0]
  }, [timeRange])

  // Update URL when date changes (only if different from current)
  useEffect(() => {
    if (dateParam !== selectedDate) {
      router.replace(`/kubernetes/${encodeURIComponent(selectedCluster)}?date=${selectedDate}`, { scroll: false })
    }
  }, [selectedDate, dateParam, router, selectedCluster])

  // Fetch data with loading and error states
  const { data: namespaces } = useQuery("kubernetes", kubernetesQueries.namespaces(selectedCluster), { refetchInterval: 60000 })
  const { data: pods, loading: podsLoading, error: podsError, refetch: refetchPods } = useQuery("kubernetes", kubernetesQueries.pods(selectedCluster, selectedNamespace), { refetchInterval: 30000 })
  const { data: nodes, loading: nodesLoading, error: nodesError, refetch: refetchNodes } = useQuery("kubernetes", kubernetesQueries.nodes(selectedCluster), { refetchInterval: 30000 })
  const { data: summary } = useQuery("kubernetes", kubernetesQueries.clusterSummary(selectedCluster), { refetchInterval: 30000 })
  const { data: namespaceCosts } = useQuery("kubernetes", kubernetesQueries.costByNamespace(selectedCluster), { refetchInterval: 60000 })
  const { data: cpuTimeSeries, loading: cpuLoading } = useQuery("kubernetes", kubernetesQueries.podCpuTimeSeries(selectedCluster, selectedNamespace, "1 hour"), { refetchInterval: 60000 })
  const { data: memoryTimeSeries, loading: memoryLoading } = useQuery("kubernetes", kubernetesQueries.podMemoryTimeSeries(selectedCluster, selectedNamespace, "1 hour"), { refetchInterval: 60000 })
  const { data: nodeCpuTimeSeries, loading: nodeCpuLoading } = useQuery("kubernetes", kubernetesQueries.nodeCpuTimeSeries(selectedCluster, "1 hour"), { refetchInterval: 60000 })

  // New queries for enhanced visualizations
  const { data: cpuByNsTimeSeries } = useQuery("kubernetes", kubernetesQueries.cpuByNamespaceTimeSeries(selectedCluster, "1 hour"), { refetchInterval: 60000 })
  const { data: memByNsTimeSeries } = useQuery("kubernetes", kubernetesQueries.memoryByNamespaceTimeSeries(selectedCluster, "1 hour"), { refetchInterval: 60000 })
  const { data: capacityTypes } = useQuery("kubernetes", kubernetesQueries.nodeCapacityTypes(selectedCluster), { refetchInterval: 60000 })
  const { data: nsEfficiency } = useQuery("kubernetes", kubernetesQueries.namespaceEfficiency(selectedCluster), { refetchInterval: 60000 })
  const { data: nodeAllocatable } = useQuery("kubernetes", kubernetesQueries.nodeAllocatable(selectedCluster), { refetchInterval: 60000 })

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

  // Pod capacity calculation
  const podCapacity = useMemo(() => {
    const totalAllocatable = sumBy(nodeAllocatable || [], r => Number(r.allocatable_pods) || 0)
    const runningPods = summaryData?.pod_count || filteredPods.length
    return { used: runningPods, total: totalAllocatable || 110, percent: totalAllocatable > 0 ? (runningPods / totalAllocatable) * 100 : 0 }
  }, [nodeAllocatable, summaryData, filteredPods])

  // Efficiency score (average across namespaces)
  const avgEfficiency = useMemo(() => {
    if (!nsEfficiency?.length) return 0
    return sumBy(nsEfficiency, r => Number(r.efficiency_pct) || 0) / nsEfficiency.length
  }, [nsEfficiency])

  // Donut chart data for cost by namespace
  const costDonutData = useMemo(() => {
    return (sortedNamespaceCosts.slice(0, 8) as Record<string, unknown>[]).map((n, i) => ({
      name: String(n.namespace),
      value: Number(n.estimated_cost_hourly) || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [sortedNamespaceCosts])

  // Horizontal bar chart data for top namespaces
  const topNamespacesBarData = useMemo(() => {
    return (sortedNamespaceCosts.slice(0, 10) as Record<string, unknown>[]).map(n => ({
      namespace: String(n.namespace).slice(0, 15),
      cost: Number(n.estimated_cost_hourly) || 0,
    }))
  }, [sortedNamespaceCosts])

  // Capacity type pie chart data
  const capacityTypePieData = useMemo(() => {
    return (capacityTypes || []).map((c: Record<string, unknown>, i: number) => ({
      name: String(c.capacity_type) === 'ON_DEMAND' ? 'On-Demand' : String(c.capacity_type) === 'SPOT' ? 'Spot' : String(c.capacity_type),
      value: Number(c.total_cost) || 0,
      color: i === 0 ? CHART_COLORS[0] : CHART_COLORS[1],
    }))
  }, [capacityTypes])

  // Stacked area chart data for CPU by namespace
  const cpuAreaData = useMemo(() => {
    if (!cpuByNsTimeSeries) return []
    const grouped = groupBy(cpuByNsTimeSeries as Record<string, unknown>[], r => formatTime(r.time as string))
    return takeRight(Object.entries(grouped).map(([time, rows]) => ({
      time,
      ...Object.fromEntries(rows.map(r => [r.namespace, Number(r.cpu_usage) || 0]))
    })), 20)
  }, [cpuByNsTimeSeries])

  // Get unique namespaces for area chart
  const cpuAreaNamespaces = useMemo(() => {
    return uniq((cpuByNsTimeSeries || []).map((r: Record<string, unknown>) => String(r.namespace))).slice(0, 5)
  }, [cpuByNsTimeSeries])

  // Efficiency stacked bar data
  const efficiencyBarData = useMemo(() => {
    return ((nsEfficiency || []) as Record<string, unknown>[]).map(n => ({
      namespace: String(n.namespace).slice(0, 12),
      used: Number(n.cpu_used) || 0,
      unused: Number(n.cpu_unused) || 0,
    }))
  }, [nsEfficiency])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/kubernetes?date=${selectedDate}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              All Clusters
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{selectedCluster}</h1>
            <p className="text-muted-foreground">
              Cluster resources, pod metrics, and costs
            </p>
          </div>
          <Badge
            variant={clusterHealth === 'healthy' ? 'default' : clusterHealth === 'warning' ? 'secondary' : 'destructive'}
            className="flex items-center gap-1"
          >
            {clusterHealth === 'healthy' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {clusterHealth === 'healthy' ? 'Healthy' : clusterHealth === 'warning' ? 'Warning' : 'Critical'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <MockBadge />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>30s refresh</span>
          </div>
          <NamespaceSelector
            namespaces={namespaceList}
            value={selectedNamespace}
            onChange={setSelectedNamespace}
          />
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* KPI Gauges */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardContent className="pt-6 flex flex-col items-center">
            <CircularProgress
              value={clusterUtilization.cpu}
              size={100}
              strokeWidth={8}
              label="CPU"
              className={clusterUtilization.cpu > 80 ? 'text-red-500' : clusterUtilization.cpu > 60 ? 'text-yellow-500' : 'text-primary'}
            />
            <p className="text-xs text-muted-foreground mt-2">Used / Allocated</p>
          </CardContent>
        </Card>

        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardContent className="pt-6 flex flex-col items-center">
            <CircularProgress
              value={clusterUtilization.memory}
              size={100}
              strokeWidth={8}
              label="Memory"
              className={clusterUtilization.memory > 80 ? 'text-red-500' : clusterUtilization.memory > 60 ? 'text-yellow-500' : 'text-primary'}
            />
            <p className="text-xs text-muted-foreground mt-2">Used / Allocated</p>
          </CardContent>
        </Card>

        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardContent className="pt-6 flex flex-col items-center">
            <CircularProgress
              value={podCapacity.percent}
              size={100}
              strokeWidth={8}
              showValue={false}
              className={podCapacity.percent > 80 ? 'text-red-500' : podCapacity.percent > 60 ? 'text-yellow-500' : 'text-primary'}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
              <span className="text-lg font-bold">{podCapacity.used}</span>
              <span className="text-[10px] text-muted-foreground">/{podCapacity.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Pod Capacity</p>
          </CardContent>
        </Card>

        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardContent className="pt-6 flex flex-col items-center">
            <CircularProgress
              value={avgEfficiency}
              size={100}
              strokeWidth={8}
              label="Efficiency"
              className={avgEfficiency < 40 ? 'text-red-500' : avgEfficiency < 60 ? 'text-yellow-500' : 'text-primary'}
            />
            <p className="text-xs text-muted-foreground mt-2">Resource Usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Summary Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Hourly Cost</p>
            <p className="text-2xl font-bold">{formatCurrency(summaryData?.cluster_hourly_cost || 0, 2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Daily Estimate</p>
            <p className="text-2xl font-bold">{formatCurrency((summaryData?.cluster_hourly_cost || 0) * 24, 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Monthly Estimate</p>
            <p className="text-2xl font-bold">{formatCurrency((summaryData?.cluster_hourly_cost || 0) * 24 * 30, 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Nodes / Namespaces</p>
            <p className="text-2xl font-bold">{summaryData?.node_count || filteredNodes.length} / {namespaceList.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cost by Namespace Donut */}
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cost by Namespace</CardTitle>
            <CardDescription>Top 8 namespaces by hourly cost</CardDescription>
          </CardHeader>
          <CardContent>
            {costDonutData.length > 0 ? (
              <PieChart
                data={costDonutData}
                height={220}
                donut
                outerRadius={80}
                showLegend
                tooltipFormatter={(value) => formatCurrency(value, 3)}
                className="border-0"
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        {/* Top Namespaces Bar Chart */}
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Namespaces</CardTitle>
            <CardDescription>Hourly cost ranking</CardDescription>
          </CardHeader>
          <CardContent>
            {topNamespacesBarData.length > 0 ? (
              <BarChart
                data={topNamespacesBarData}
                xAxisKey="namespace"
                bars={[{ dataKey: "cost", name: "Cost/hr", color: CHART_COLORS[0] }]}
                height={220}
                layout="vertical"
                yAxisFormatter={(value) => `$${value.toFixed(2)}`}
                tooltipFormatter={(value) => formatCurrency(value, 3)}
                showLegend={false}
                className="border-0"
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        {/* Capacity Types Pie */}
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Node Capacity Types</CardTitle>
            <CardDescription>Spot vs On-Demand cost</CardDescription>
          </CardHeader>
          <CardContent>
            {capacityTypePieData.length > 0 ? (
              <PieChart
                data={capacityTypePieData}
                height={220}
                outerRadius={80}
                showLegend
                tooltipFormatter={(value) => formatCurrency(value, 3)}
                className="border-0"
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage Over Time */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CPU by Namespace Stacked Area */}
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CPU Usage by Namespace</CardTitle>
            <CardDescription>Stacked CPU consumption over time (last hour)</CardDescription>
          </CardHeader>
          <CardContent>
            {cpuAreaData.length > 0 && cpuAreaNamespaces.length > 0 ? (
              <AreaChart
                data={cpuAreaData}
                xAxisKey="time"
                areas={cpuAreaNamespaces.map((ns, i) => ({
                  dataKey: ns,
                  name: ns.substring(0, 15),
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
                height={280}
                showLegend
                stacked
                className="border-0"
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        {/* Resource Efficiency Stacked Bar */}
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resource Efficiency</CardTitle>
            <CardDescription>CPU used vs unused per namespace</CardDescription>
          </CardHeader>
          <CardContent>
            {efficiencyBarData.length > 0 ? (
              <StackedBarChart
                data={efficiencyBarData}
                xAxisKey="namespace"
                stacks={[
                  { dataKey: "used", name: "Used", color: CHART_COLORS[2] },
                  { dataKey: "unused", name: "Unused", color: CHART_COLORS[4] },
                ]}
                height={280}
                showLegend
                className="border-0"
              />
            ) : (
              <EmptyState />
            )}
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

export default function ClusterDetailPage({ params }: ClusterPageProps) {
  const { cluster } = use(params)

  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    }>
      <ClusterDetailContent cluster={cluster} />
    </Suspense>
  )
}
