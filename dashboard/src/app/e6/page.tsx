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
} from "laminar-ui"
import { TimeRangePicker, ClusterSelector, type DateRange } from "@/components/shared"
import { Activity, AlertTriangle, CheckCircle, Cpu, MemoryStick, Box, Zap } from "lucide-react"

// Mock E6 clusters
const mockE6Clusters = ["e6-prod-us-east", "e6-prod-us-west", "e6-staging", "e6-analytics"]

// Mock component data
const mockComponents = [
  { component: "Planner", pods: 3, cpu_alloc: "12 cores", mem_alloc: "24Gi", cpu_used: "9.6 cores", mem_used: "19.5Gi", cost_hourly: 15.80 },
  { component: "Storage", pods: 4, cpu_alloc: "8 cores", mem_alloc: "64Gi", cpu_used: "6.0 cores", mem_used: "48Gi", cost_hourly: 12.50 },
  { component: "Schema", pods: 2, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.8 cores", mem_used: "5.2Gi", cost_hourly: 4.20 },
  { component: "Queue", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.2 cores", mem_used: "2.8Gi", cost_hourly: 2.80 },
  { component: "Executor", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "0.8 cores", mem_used: "1.5Gi", cost_hourly: 2.10 },
]

// Mock pod details per component
const mockPlannerPods = [
  { name: "e6-planner-0", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.2 cores", mem_used: "6.5Gi", cpu_pct: 80, mem_pct: 81, cost_hourly: 5.27 },
  { name: "e6-planner-1", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.1 cores", mem_used: "6.2Gi", cpu_pct: 77, mem_pct: 77, cost_hourly: 5.27 },
  { name: "e6-planner-2", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.3 cores", mem_used: "6.8Gi", cpu_pct: 82, mem_pct: 85, cost_hourly: 5.26 },
]

const mockStoragePods = [
  { name: "e6-storage-0", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.5 cores", mem_used: "12Gi", cpu_pct: 75, mem_pct: 75, cost_hourly: 3.12 },
  { name: "e6-storage-1", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.4 cores", mem_used: "11Gi", cpu_pct: 70, mem_pct: 68, cost_hourly: 3.13 },
  { name: "e6-storage-2", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.6 cores", mem_used: "13Gi", cpu_pct: 80, mem_pct: 81, cost_hourly: 3.12 },
  { name: "e6-storage-3", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.5 cores", mem_used: "12Gi", cpu_pct: 75, mem_pct: 75, cost_hourly: 3.13 },
]

const mockSchemaPods = [
  { name: "e6-schema-0", component: "Schema", size: "2xlarge", cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.4 cores", mem_used: "2.6Gi", cpu_pct: 70, mem_pct: 65, cost_hourly: 2.10 },
  { name: "e6-schema-1", component: "Schema", size: "2xlarge", cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.4 cores", mem_used: "2.6Gi", cpu_pct: 70, mem_pct: 65, cost_hourly: 2.10 },
]

const mockQueuePods = [
  { name: "e6-queue-0", component: "Queue", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.6 cores", mem_used: "1.4Gi", cpu_pct: 60, mem_pct: 70, cost_hourly: 1.40 },
  { name: "e6-queue-1", component: "Queue", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.6 cores", mem_used: "1.4Gi", cpu_pct: 60, mem_pct: 70, cost_hourly: 1.40 },
]

const mockExecutorPods = [
  { name: "e6-executor-0", component: "Executor", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.4 cores", mem_used: "0.75Gi", cpu_pct: 40, mem_pct: 37, cost_hourly: 1.05 },
  { name: "e6-executor-1", component: "Executor", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.4 cores", mem_used: "0.75Gi", cpu_pct: 40, mem_pct: 37, cost_hourly: 1.05 },
]

const allPods = [...mockPlannerPods, ...mockStoragePods, ...mockSchemaPods, ...mockQueuePods, ...mockExecutorPods]

// Time series data
const mockResourceTimeSeries = [
  { time: "10:00", planner_cpu: 78, storage_cpu: 72, schema_cpu: 68, queue_cpu: 58, executor_cpu: 38 },
  { time: "10:15", planner_cpu: 82, storage_cpu: 75, schema_cpu: 70, queue_cpu: 62, executor_cpu: 42 },
  { time: "10:30", planner_cpu: 85, storage_cpu: 78, schema_cpu: 72, queue_cpu: 58, executor_cpu: 40 },
  { time: "10:45", planner_cpu: 80, storage_cpu: 74, schema_cpu: 68, queue_cpu: 55, executor_cpu: 38 },
  { time: "11:00", planner_cpu: 76, storage_cpu: 70, schema_cpu: 65, queue_cpu: 60, executor_cpu: 42 },
  { time: "11:15", planner_cpu: 88, storage_cpu: 82, schema_cpu: 75, queue_cpu: 65, executor_cpu: 45 },
  { time: "11:30", planner_cpu: 92, storage_cpu: 85, schema_cpu: 78, queue_cpu: 62, executor_cpu: 40 },
  { time: "11:45", planner_cpu: 78, storage_cpu: 72, schema_cpu: 70, queue_cpu: 58, executor_cpu: 38 },
]

const mockCostTrend = [
  { time: "Day 1", total: 890 },
  { time: "Day 2", total: 920 },
  { time: "Day 3", total: 885 },
  { time: "Day 4", total: 945 },
  { time: "Day 5", total: 910 },
  { time: "Day 6", total: 875 },
  { time: "Day 7", total: 905 },
]

const componentColumns = [
  { key: "component", header: "Component", sortable: true },
  { key: "pods", header: "Pods", sortable: true },
  { key: "cpu_alloc", header: "CPU Alloc", sortable: true },
  { key: "cpu_used", header: "CPU Used", sortable: true },
  { key: "mem_alloc", header: "Mem Alloc", sortable: true },
  { key: "mem_used", header: "Mem Used", sortable: true },
  { key: "cost_hourly", header: "Cost/hr", sortable: true, render: (value: unknown) => `$${Number(value).toFixed(2)}` },
]

const podColumns = [
  { key: "name", header: "Pod Name", sortable: true },
  { key: "component", header: "Component", sortable: true, render: (value: unknown) => (
    <Badge variant="outline">{String(value)}</Badge>
  )},
  { key: "size", header: "Size", sortable: true },
  { key: "cpu_alloc", header: "CPU Alloc" },
  { key: "cpu_used", header: "CPU Used" },
  { key: "cpu_pct", header: "CPU %", sortable: true, render: (value: unknown) => (
    <span className={Number(value) > 80 ? "text-orange-500 font-semibold" : ""}>{String(value)}%</span>
  )},
  { key: "mem_alloc", header: "Mem Alloc" },
  { key: "mem_used", header: "Mem Used" },
  { key: "mem_pct", header: "Mem %", sortable: true, render: (value: unknown) => (
    <span className={Number(value) > 80 ? "text-orange-500 font-semibold" : ""}>{String(value)}%</span>
  )},
  { key: "cost_hourly", header: "Cost/hr", sortable: true, render: (value: unknown) => `$${Number(value).toFixed(2)}` },
]

const costByComponent = mockComponents.map(c => ({
  name: c.component,
  value: c.cost_hourly,
  color: c.component === "Planner" ? "#FF6B6B" :
         c.component === "Storage" ? "#4ECDC4" :
         c.component === "Schema" ? "#45B7D1" :
         c.component === "Queue" ? "#96CEB4" : "#DDA0DD"
}))

export default function E6ClustersPage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()
  const [selectedCluster, setSelectedCluster] = useState(mockE6Clusters[0])
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)

  const totalPods = mockComponents.reduce((sum, c) => sum + c.pods, 0)
  const totalCostHourly = mockComponents.reduce((sum, c) => sum + c.cost_hourly, 0)
  const totalCostDaily = totalCostHourly * 24
  const totalCostMonthly = totalCostDaily * 30

  // Calculate overall utilization
  const avgCpuUtil = useMemo(() => {
    return allPods.reduce((sum, p) => sum + p.cpu_pct, 0) / allPods.length
  }, [])

  const avgMemUtil = useMemo(() => {
    return allPods.reduce((sum, p) => sum + p.mem_pct, 0) / allPods.length
  }, [])

  // Cluster health based on utilization
  const clusterHealth = useMemo(() => {
    if (avgCpuUtil > 90 || avgMemUtil > 90) return 'critical'
    if (avgCpuUtil > 75 || avgMemUtil > 75) return 'warning'
    return 'healthy'
  }, [avgCpuUtil, avgMemUtil])

  const filteredPods = selectedComponent
    ? allPods.filter(p => p.component === selectedComponent)
    : allPods

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">E6 Clusters</h1>
            <p className="text-muted-foreground">
              E6 component resources and cost breakdown
            </p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Mock Data
          </Badge>
          <Badge
            variant={clusterHealth === 'healthy' ? 'default' : clusterHealth === 'warning' ? 'secondary' : 'destructive'}
            className="flex items-center gap-1"
          >
            {clusterHealth === 'healthy' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {clusterHealth === 'healthy' ? 'Healthy' : clusterHealth === 'warning' ? 'Warning' : 'Critical'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Live</span>
          </div>
          <ClusterSelector
            clusters={mockE6Clusters}
            value={selectedCluster}
            onChange={setSelectedCluster}
            placeholder="Select E6 cluster"
          />
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold">${totalCostHourly.toFixed(2)}<span className="text-lg font-normal">/hr</span></p>
                <p className="text-xs text-muted-foreground mt-1">~${totalCostMonthly.toFixed(0)}/month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CPU Utilization</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{avgCpuUtil.toFixed(0)}%</p>
            </div>
            <div className="mt-2 h-2 bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${avgCpuUtil > 80 ? 'bg-red-500' : avgCpuUtil > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(avgCpuUtil, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Memory Utilization</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{avgMemUtil.toFixed(0)}%</p>
            </div>
            <div className="mt-2 h-2 bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${avgMemUtil > 80 ? 'bg-red-500' : avgMemUtil > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(avgMemUtil, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Pods</p>
            <p className="text-3xl font-bold">{totalPods}</p>
            <p className="text-xs text-muted-foreground mt-1">{mockComponents.length} components</p>
          </CardContent>
        </Card>
      </div>

      {/* Component Quick Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {mockComponents.map((comp, i) => (
          <Card
            key={comp.component}
            className={`bg-muted/50 cursor-pointer transition-all hover:border-primary ${selectedComponent === comp.component ? 'border-primary' : ''}`}
            onClick={() => setSelectedComponent(selectedComponent === comp.component ? null : comp.component)}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" style={{ borderColor: costByComponent[i].color, color: costByComponent[i].color }}>
                  {comp.component}
                </Badge>
                <span className="text-xs text-muted-foreground">{comp.pods} pods</span>
              </div>
              <p className="font-mono font-semibold">${comp.cost_hourly.toFixed(2)}/hr</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Table and Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Component</CardTitle>
            <CardDescription>Hourly cost distribution (high to low)</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={[...mockComponents].sort((a, b) => b.cost_hourly - a.cost_hourly)}
              columns={componentColumns}
              hoverable
              striped
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trend</CardTitle>
            <CardDescription>Total cluster cost over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={mockCostTrend}
              xAxisKey="time"
              lines={[{ dataKey: "total", name: "Total Cost", color: "var(--chart-1)" }]}
              height={300}
              yAxisFormatter={(value) => `$${value}`}
              tooltipFormatter={(value) => `$${value.toFixed(2)}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Component Details Tabs */}
      <Tabs defaultValue="all-pods">
        <TabsList>
          <TabsTrigger value="all-pods" onClick={() => setSelectedComponent(null)}>
            All Pods ({allPods.length})
          </TabsTrigger>
          <TabsTrigger value="planner" onClick={() => setSelectedComponent("Planner")}>
            Planner ({mockPlannerPods.length})
          </TabsTrigger>
          <TabsTrigger value="storage" onClick={() => setSelectedComponent("Storage")}>
            Storage ({mockStoragePods.length})
          </TabsTrigger>
          <TabsTrigger value="schema" onClick={() => setSelectedComponent("Schema")}>
            Schema ({mockSchemaPods.length})
          </TabsTrigger>
          <TabsTrigger value="queue" onClick={() => setSelectedComponent("Queue")}>
            Queue ({mockQueuePods.length})
          </TabsTrigger>
          <TabsTrigger value="executor" onClick={() => setSelectedComponent("Executor")}>
            Executor ({mockExecutorPods.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-pods" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All E6 Pods</CardTitle>
              <CardDescription>Detailed view of all pods in the cluster</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={allPods}
                columns={podColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planner" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Planner Pods</CardTitle>
              <CardDescription>Query planner instances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockPlannerPods}
                columns={podColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Pods</CardTitle>
              <CardDescription>Storage layer instances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockStoragePods}
                columns={podColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schema Pods</CardTitle>
              <CardDescription>Schema service instances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockSchemaPods}
                columns={podColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Queue Pods</CardTitle>
              <CardDescription>Queue service instances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockQueuePods}
                columns={podColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executor" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Executor Pods</CardTitle>
              <CardDescription>Executor service instances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockExecutorPods}
                columns={podColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resource Usage Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>CPU Usage by Component</CardTitle>
          <CardDescription>CPU utilization percentage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart
            data={mockResourceTimeSeries}
            xAxisKey="time"
            lines={[
              { dataKey: "planner_cpu", name: "Planner", color: "#FF6B6B" },
              { dataKey: "storage_cpu", name: "Storage", color: "#4ECDC4" },
              { dataKey: "schema_cpu", name: "Schema", color: "#45B7D1" },
              { dataKey: "queue_cpu", name: "Queue", color: "#96CEB4" },
              { dataKey: "executor_cpu", name: "Executor", color: "#DDA0DD" },
            ]}
            height={350}
            yAxisFormatter={(value) => `${value}%`}
            showLegend
          />
        </CardContent>
      </Card>
    </div>
  )
}
