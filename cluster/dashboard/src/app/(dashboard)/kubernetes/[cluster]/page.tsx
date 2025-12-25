"use client"

import { useState, useMemo, use, Suspense } from "react"
import Link from "next/link"
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
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "laminar-ui"
import {
  InfoPopover,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
  DataHealthIndicator,
} from "@/components"
import { useDate } from "@/components/providers"
import { useQuery, formatBytes, formatCpu, formatCurrency, formatTime } from "@/hooks/useQuery"
import { CHART_COLORS } from "@/lib/utils"
import { Activity, ArrowLeft, BarChart2 } from "lucide-react"

interface ClusterPageProps {
  params: Promise<{ cluster: string }>
}

function ClusterDetailContent({ cluster }: { cluster: string }) {
  const selectedCluster = decodeURIComponent(cluster)

  const { selectedDate, startTimestamp, endTimestamp } = useDate()
  const dateRange = { startTs: startTimestamp, endTs: endTimestamp }
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all")

  // Modal state for time series charts
  const [openModal, setOpenModal] = useState<'cpu' | 'memory' | 'pod' | 'efficiency' | null>(null)

  // Fetch data with loading and error states - all queries filtered by local timezone day
  const { data: namespaces } = useQuery("kubernetes", "getNamespaces", [selectedCluster, dateRange], { refetchInterval: 60000 })
  const { data: pods, loading: podsLoading, error: podsError, refetch: refetchPods } = useQuery("kubernetes", "getPods", [selectedCluster, dateRange, selectedNamespace], { refetchInterval: 30000 })
  const { data: nodes, loading: nodesLoading, error: nodesError, refetch: refetchNodes } = useQuery("kubernetes", "getNodes", [selectedCluster, dateRange], { refetchInterval: 30000 })
  const { data: summary } = useQuery("kubernetes", "getClusterSummary", [selectedCluster, dateRange], { refetchInterval: 30000 })
  const { data: namespaceCosts } = useQuery("kubernetes", "getCostByNamespace", [selectedCluster, dateRange], { refetchInterval: 60000 })
  const { data: cpuTimeSeries, loading: cpuLoading } = useQuery("kubernetes", "getPodCpuTimeSeries", [selectedCluster, dateRange, selectedNamespace], { refetchInterval: 60000 })
  const { data: memoryTimeSeries, loading: memoryLoading } = useQuery("kubernetes", "getPodMemoryTimeSeries", [selectedCluster, dateRange, selectedNamespace], { refetchInterval: 60000 })
  const { data: nodeCpuTimeSeries, loading: nodeCpuLoading } = useQuery("kubernetes", "getNodeCpuTimeSeries", [selectedCluster, dateRange], { refetchInterval: 60000 })

  // Enhanced visualization queries - all filtered by local timezone day
  const { data: cpuByNsTimeSeries } = useQuery("kubernetes", "getCpuByNamespaceTimeSeries", [selectedCluster, dateRange], { refetchInterval: 60000 })
  const { data: memByNsTimeSeries } = useQuery("kubernetes", "getMemoryByNamespaceTimeSeries", [selectedCluster, dateRange], { refetchInterval: 60000 })
  const { data: capacityTypes } = useQuery("kubernetes", "getNodeCapacityTypes", [selectedCluster, dateRange], { refetchInterval: 60000 })
  const { data: nsEfficiency } = useQuery("kubernetes", "getNamespaceEfficiency", [selectedCluster, dateRange], { refetchInterval: 60000 })
  const { data: nodeAllocatable } = useQuery("kubernetes", "getNodeAllocatable", [selectedCluster, dateRange], { refetchInterval: 60000 })

  // Time series data for modal charts (only fetch when modal is open)
  const { data: cpuAllocTimeSeries } = useQuery("kubernetes", "getCpuAllocationTimeSeries", [selectedCluster, dateRange], { refetchInterval: 60000, enabled: openModal === 'cpu' })
  const { data: memAllocTimeSeries } = useQuery("kubernetes", "getMemoryAllocationTimeSeries", [selectedCluster, dateRange], { refetchInterval: 60000, enabled: openModal === 'memory' })
  const { data: podCountTimeSeries } = useQuery("kubernetes", "getPodCountTimeSeries", [selectedCluster, dateRange], { refetchInterval: 60000, enabled: openModal === 'pod' })
  const { data: efficiencyTimeSeries } = useQuery("kubernetes", "getEfficiencyTimeSeries", [selectedCluster, dateRange], { refetchInterval: 60000, enabled: openModal === 'efficiency' })

  // Data health query - check last data timestamp
  const { data: dataHealth } = useQuery<{ last_data: string }>("kubernetes", "getDataHealth", [selectedCluster], { refetchInterval: 60000 })
  const lastDataTimestamp = dataHealth?.[0]?.last_data || null

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
  const sortedNamespaceCosts = useMemo(() => orderBy(namespaceCosts || [], ['total_cost'], ['desc']), [namespaceCosts])
  const sortedNodesByCost = useMemo(() => orderBy(filteredNodes, ['total_cost'], ['desc']), [filteredNodes])

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
      value: Number(n.total_cost) || 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [sortedNamespaceCosts])

  // Horizontal bar chart data for top namespaces
  const topNamespacesBarData = useMemo(() => {
    return (sortedNamespaceCosts.slice(0, 10) as Record<string, unknown>[]).map(n => ({
      namespace: String(n.namespace).slice(0, 15),
      cost: Number(n.total_cost) || 0,
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
    { key: "total_cost", header: "Total Cost", sortable: true, render: (value: unknown) => formatCurrency(Number(value), 2) },
  ]

  return (
    <div className="space-y-6">
      <DateBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/kubernetes">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{selectedCluster}</h1>
        </div>
        <div className="flex items-center gap-4">
          <DataHealthIndicator
            lastDataTimestamp={lastDataTimestamp}
            dataSource="OpenCost exporter"
            expectedIntervalMinutes={1}
            warningThresholdMinutes={5}
            criticalThresholdMinutes={15}
          />
          <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select namespace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Namespaces</SelectItem>
              {[...new Set(namespaceList)].map((ns) => (
                <SelectItem key={ns} value={ns}>{ns}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Gauges */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {/* CPU Utilization Card */}
        <Card className="relative">
          <div className="absolute top-1 left-1 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpenModal('cpu')}
              title="View time series"
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="absolute top-1 right-1">
            <InfoPopover
              title="CPU Utilization"
              description="Percentage of CPU used vs allocated across all pods. Calculated from container_cpu_usage_seconds_total / container_cpu_allocation. Red indicates >80%, yellow >60%."
            />
          </div>
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

        {/* Memory Utilization Card */}
        <Card className="relative">
          <div className="absolute top-1 left-1 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpenModal('memory')}
              title="View time series"
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="absolute top-1 right-1">
            <InfoPopover
              title="Memory Utilization"
              description="Percentage of memory used vs allocated across all pods. Calculated from container_memory_working_set_bytes / container_memory_allocation_bytes. Red indicates >80%, yellow >60%."
            />
          </div>
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

        {/* Pod Capacity Card */}
        <Card className="relative">
          <div className="absolute top-1 left-1 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpenModal('pod')}
              title="View time series"
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="absolute top-1 right-1">
            <InfoPopover
              title="Pod Capacity"
              description="Running pods vs total allocatable pod capacity across all nodes. Shows how close the cluster is to its pod scheduling limit."
            />
          </div>
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="relative">
              <CircularProgress
                value={podCapacity.percent}
                size={100}
                strokeWidth={8}
                showValue={false}
                className={podCapacity.percent > 80 ? 'text-red-500' : podCapacity.percent > 60 ? 'text-yellow-500' : 'text-primary'}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{podCapacity.used}</span>
                <span className="text-xs text-muted-foreground font-medium">of {podCapacity.total}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Pods Running</p>
          </CardContent>
        </Card>

        {/* Resource Efficiency Card */}
        <Card className="relative">
          <div className="absolute top-1 left-1 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpenModal('efficiency')}
              title="View time series"
            >
              <BarChart2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="absolute top-1 right-1">
            <InfoPopover
              title="Resource Efficiency"
              description="Average efficiency score across namespaces. Measures how much of the allocated CPU is actually being used. Higher is better - low values indicate over-provisioning."
            />
          </div>
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

      {/* Time Series Modals */}
      <Dialog open={openModal === 'cpu'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>CPU Allocation Trend</DialogTitle>
            <DialogDescription>CPU cores allocated over time for {selectedDate}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {cpuAllocTimeSeries && cpuAllocTimeSeries.length > 0 ? (
              <LineChart
                data={cpuAllocTimeSeries.map((d: Record<string, unknown>) => ({
                  time: formatTime(d.time as string),
                  value: Number(d.cpu_allocated) || 0
                }))}
                xAxisKey="time"
                lines={[{ dataKey: "value", name: "CPU Cores", color: CHART_COLORS[0] }]}
                height={300}
                showLegend={false}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Loading...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openModal === 'memory'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Memory Allocation Trend</DialogTitle>
            <DialogDescription>Memory (GB) allocated over time for {selectedDate}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {memAllocTimeSeries && memAllocTimeSeries.length > 0 ? (
              <LineChart
                data={memAllocTimeSeries.map((d: Record<string, unknown>) => ({
                  time: formatTime(d.time as string),
                  value: Number(d.memory_allocated_gb) || 0
                }))}
                xAxisKey="time"
                lines={[{ dataKey: "value", name: "Memory (GB)", color: CHART_COLORS[1] }]}
                height={300}
                showLegend={false}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Loading...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openModal === 'pod'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pod Count Trend</DialogTitle>
            <DialogDescription>Number of running pods over time for {selectedDate}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {podCountTimeSeries && podCountTimeSeries.length > 0 ? (
              <LineChart
                data={podCountTimeSeries.map((d: Record<string, unknown>) => ({
                  time: formatTime(d.time as string),
                  value: Number(d.pod_count) || 0
                }))}
                xAxisKey="time"
                lines={[{ dataKey: "value", name: "Pods", color: CHART_COLORS[2] }]}
                height={300}
                showLegend={false}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Loading...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openModal === 'efficiency'} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Resource Efficiency Trend</DialogTitle>
            <DialogDescription>CPU efficiency percentage over time for {selectedDate}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {efficiencyTimeSeries && efficiencyTimeSeries.length > 0 ? (
              <LineChart
                data={efficiencyTimeSeries.map((d: Record<string, unknown>) => ({
                  time: formatTime(d.time as string),
                  value: Number(d.efficiency_pct) || 0
                }))}
                xAxisKey="time"
                lines={[{ dataKey: "value", name: "Efficiency %", color: CHART_COLORS[3] }]}
                height={300}
                showLegend={false}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Loading...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Cost ({selectedDate})</p>
            <p className="text-2xl font-bold">{formatCurrency(summaryData?.total_cost || 0, 2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Monthly Estimate</p>
            <p className="text-2xl font-bold">{formatCurrency((summaryData?.total_cost || 0) * 30, 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Nodes / Namespaces</p>
            <p className="text-2xl font-bold">{summaryData?.node_count || filteredNodes.length} / {namespaceList.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - 2x2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Namespaces Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Top Namespaces</CardTitle>
              <InfoPopover
                title="Top Namespaces by Cost"
                description="Horizontal bar chart ranking the top 10 namespaces by estimated total cost for the selected date. Useful for identifying which workloads are consuming the most resources."
              />
            </div>
            <CardDescription>Cost ranking for {selectedDate}</CardDescription>
          </CardHeader>
          <CardContent>
            {topNamespacesBarData.length > 0 ? (
              <BarChart
                data={topNamespacesBarData}
                xAxisKey="namespace"
                bars={[{ dataKey: "cost", name: "Total Cost", color: CHART_COLORS[0] }]}
                height={220}
                layout="vertical"
                yAxisFormatter={(value) => `$${value.toFixed(2)}`}
                tooltipFormatter={(value) => formatCurrency(value, 3)}
                showLegend={false}
                className="border-0"
              />
            ) : (
              <EmptyState title="No data available" size="sm" />
            )}
          </CardContent>
        </Card>

        {/* Capacity Types Pie */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Node Capacity Types</CardTitle>
              <InfoPopover
                title="Node Capacity Types"
                description="Breakdown of node costs by capacity type (Spot vs On-Demand). Shows total cost for the selected date by capacity type from EKS node labels."
              />
            </div>
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
              <EmptyState title="No data available" size="sm" />
            )}
          </CardContent>
        </Card>

        {/* CPU by Namespace Stacked Area */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">CPU Usage by Namespace</CardTitle>
              <InfoPopover
                title="CPU Usage by Namespace"
                description="Stacked area chart showing CPU consumption for the selected date, broken down by namespace. Helps identify which namespaces are consuming the most CPU over time."
              />
            </div>
            <CardDescription>Stacked CPU consumption over time (selected date)</CardDescription>
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
              <EmptyState title="No data available" size="sm" />
            )}
          </CardContent>
        </Card>

        {/* Resource Efficiency Stacked Bar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Resource Efficiency</CardTitle>
              <InfoPopover
                title="Resource Efficiency"
                description="Stacked bar chart showing CPU requests vs actual usage per namespace. The 'unused' portion represents over-provisioned resources that could be reclaimed."
              />
            </div>
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
              <EmptyState title="No data available" size="sm" />
            )}
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
            <span className="text-sm">NS Cost</span>
            <span className="font-mono font-semibold">{formatCurrency(sumBy(namespaceCosts?.filter(n => selectedNamespace === 'all' || n.namespace === selectedNamespace) || [], r => Number(r.total_cost) || 0), 2)}</span>
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
              <div className="flex items-center gap-2">
                <CardTitle>Pod Resources</CardTitle>
                <InfoPopover
                  title="Pod Resources"
                  description="Lists all pods with their CPU and memory allocation vs actual usage. Data is aggregated from container_cpu_allocation, container_memory_allocation_bytes, container_cpu_usage_seconds_total, and container_memory_working_set_bytes."
                />
              </div>
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
                <EmptyState title="No pods found" size="sm" />
              )}
            </CardContent>
          </Card>

          {/* Pod Time Series Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Pod CPU Usage</CardTitle>
                  <InfoPopover
                    title="Pod CPU Usage"
                    description="Line chart showing CPU usage for the selected date for the top 5 pods. Data is sampled per hour from container_cpu_usage_seconds_total."
                  />
                </div>
                <CardDescription>CPU usage over time (selected date)</CardDescription>
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
                  <EmptyState title="No data available" size="sm" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Pod Memory Usage</CardTitle>
                  <InfoPopover
                    title="Pod Memory Usage"
                    description="Line chart showing memory usage (working set) for the selected date for the top 5 pods. Values are converted to MB for readability."
                  />
                </div>
                <CardDescription>Memory usage in MB over time (selected date)</CardDescription>
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
                  <EmptyState title="No data available" size="sm" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Cost by Namespace</CardTitle>
                <InfoPopover
                  title="Cost by Namespace"
                  description="Table showing estimated total cost per namespace for the selected date, based on CPU ($0.03/core-hour) and memory ($0.004/GB-hour) allocation. Sorted by highest cost first."
                />
              </div>
              <CardDescription>Total cost by namespace for {selectedDate}</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedNamespaceCosts.length > 0 ? (
                <DataTable
                  data={sortedNamespaceCosts.map(n => ({
                    namespace: n.namespace,
                    total_cpu: n.total_cpu,
                    total_mem: n.total_mem,
                    total_cost: n.total_cost || 0,
                  }))}
                  columns={[
                    { key: "namespace", header: "Namespace", sortable: true },
                    { key: "total_cpu", header: "CPU", sortable: true, render: (value: unknown) => formatCpu(Number(value) * 1000) },
                    { key: "total_mem", header: "Memory", sortable: true, render: (value: unknown) => formatBytes(Number(value)) },
                    { key: "total_cost", header: "Total Cost", sortable: true, render: (value: unknown) => formatCurrency(Number(value), 2) },
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
              <div className="flex items-center gap-2">
                <CardTitle>Node Resources</CardTitle>
                <InfoPopover
                  title="Node Resources"
                  description="Lists all cluster nodes with instance type, region, CPU/memory capacity, memory used, pod count, and total cost for the selected date. Data is from kube_node_info, node_total_hourly_cost, and kube_node_status_capacity."
                />
              </div>
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
                <EmptyState title="No nodes found" size="sm" />
              )}
            </CardContent>
          </Card>

          {/* Node CPU Time Series */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Node CPU Usage</CardTitle>
                <InfoPopover
                  title="Node CPU Usage"
                  description="Line chart showing CPU seconds consumed per node for the selected date. Sampled per hour from node_cpu_seconds_total metric."
                />
              </div>
              <CardDescription>CPU seconds per node (selected date)</CardDescription>
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
                <EmptyState title="No data available" size="sm" />
              )}
            </CardContent>
          </Card>

          {/* Node Cost Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Node Cost Breakdown</CardTitle>
                <InfoPopover
                  title="Node Cost Breakdown"
                  description="Table showing total cost per node for the selected date from node_total_hourly_cost metric. Sorted by highest cost first. Includes instance type and pod count for cost attribution."
                />
              </div>
              <CardDescription>Total cost per node for {selectedDate}</CardDescription>
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
                    { key: "total_cost", header: "Total Cost", sortable: true, render: (value: unknown) => formatCurrency(Number(value), 2) },
                  ]}
                  hoverable
                  striped
                />
              ) : (
                <EmptyState title="No data available" size="sm" />
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
