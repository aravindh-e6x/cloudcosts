"use client"

import { useState } from "react"
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
  PieChart,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "laminar-ui"
import { TimeRangePicker, ClusterSelector, type DateRange } from "@/components/shared"

// Mock E6 clusters
const mockE6Clusters = ["e6-prod-us-east", "e6-prod-us-west", "e6-staging", "e6-analytics"]

// Mock component data
const mockComponents = [
  { component: "Planner", pods: 3, cpu_alloc: "12 cores", mem_alloc: "24Gi", cpu_used: "9.6 cores", mem_used: "19.5Gi", cost_hourly: 15.80 },
  { component: "Storage", pods: 4, cpu_alloc: "8 cores", mem_alloc: "64Gi", cpu_used: "6.0 cores", mem_used: "48Gi", cost_hourly: 12.50 },
  { component: "Schema", pods: 2, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.8 cores", mem_used: "5.2Gi", cost_hourly: 4.20 },
  { component: "Queue", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.2 cores", mem_used: "2.8Gi", cost_hourly: 2.80 },
  { component: "Gateway", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "0.8 cores", mem_used: "1.5Gi", cost_hourly: 2.10 },
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

const mockGatewayPods = [
  { name: "e6-gateway-0", component: "Gateway", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.4 cores", mem_used: "0.75Gi", cpu_pct: 40, mem_pct: 37, cost_hourly: 1.05 },
  { name: "e6-gateway-1", component: "Gateway", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.4 cores", mem_used: "0.75Gi", cpu_pct: 40, mem_pct: 37, cost_hourly: 1.05 },
]

const allPods = [...mockPlannerPods, ...mockStoragePods, ...mockSchemaPods, ...mockQueuePods, ...mockGatewayPods]

// Time series data
const mockResourceTimeSeries = [
  { time: "10:00", planner_cpu: 78, storage_cpu: 72, schema_cpu: 68, queue_cpu: 58, gateway_cpu: 38 },
  { time: "10:15", planner_cpu: 82, storage_cpu: 75, schema_cpu: 70, queue_cpu: 62, gateway_cpu: 42 },
  { time: "10:30", planner_cpu: 85, storage_cpu: 78, schema_cpu: 72, queue_cpu: 58, gateway_cpu: 40 },
  { time: "10:45", planner_cpu: 80, storage_cpu: 74, schema_cpu: 68, queue_cpu: 55, gateway_cpu: 38 },
  { time: "11:00", planner_cpu: 76, storage_cpu: 70, schema_cpu: 65, queue_cpu: 60, gateway_cpu: 42 },
  { time: "11:15", planner_cpu: 88, storage_cpu: 82, schema_cpu: 75, queue_cpu: 65, gateway_cpu: 45 },
  { time: "11:30", planner_cpu: 92, storage_cpu: 85, schema_cpu: 78, queue_cpu: 62, gateway_cpu: 40 },
  { time: "11:45", planner_cpu: 78, storage_cpu: 72, schema_cpu: 70, queue_cpu: 58, gateway_cpu: 38 },
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

  const filteredPods = selectedComponent
    ? allPods.filter(p => p.component === selectedComponent)
    : allPods

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">E6 Clusters</h1>
          <p className="text-muted-foreground">
            E6 component resources and cost breakdown
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ClusterSelector
            clusters={mockE6Clusters}
            value={selectedCluster}
            onChange={setSelectedCluster}
            placeholder="Select E6 cluster"
          />
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Pods"
          value={totalPods}
          previousValue={totalPods - 1}
        />
        <StatCard
          label="Components"
          value={mockComponents.length}
          previousValue={mockComponents.length}
        />
        <StatCard
          label="Cost/hour"
          value={totalCostHourly}
          prefix="$"
          previousValue={totalCostHourly - 2}
        />
        <StatCard
          label="Cost/day"
          value={totalCostDaily}
          prefix="$"
          previousValue={totalCostDaily - 48}
        />
        <StatCard
          label="Cost/month (est)"
          value={totalCostMonthly}
          prefix="$"
          previousValue={totalCostMonthly - 1500}
        />
        <StatCard
          label="Avg CPU Util"
          value={72}
          suffix="%"
          previousValue={68}
        />
      </div>

      {/* Cost Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Component</CardTitle>
            <CardDescription>Hourly cost distribution (OpenCost)</CardDescription>
          </CardHeader>
          <CardContent>
            <PieChart
              data={costByComponent}
              height={300}
              showLegend
              donut
              tooltipFormatter={(value) => `$${value.toFixed(2)}/hr`}
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

      {/* Component Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Component Summary</CardTitle>
          <CardDescription>Resource allocation and cost per E6 component</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={mockComponents}
            columns={componentColumns}
            hoverable
            striped
            onRowClick={(row) => setSelectedComponent(selectedComponent === row.component ? null : row.component)}
          />
        </CardContent>
      </Card>

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
          <TabsTrigger value="gateway" onClick={() => setSelectedComponent("Gateway")}>
            Gateway ({mockGatewayPods.length})
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

        <TabsContent value="gateway" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gateway Pods</CardTitle>
              <CardDescription>Gateway service instances</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockGatewayPods}
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
              { dataKey: "gateway_cpu", name: "Gateway", color: "#DDA0DD" },
            ]}
            height={350}
            yAxisFormatter={(value) => `${value}%`}
            showLegend
          />
        </CardContent>
      </Card>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Component Cost Comparison</CardTitle>
          <CardDescription>Hourly cost by component</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            data={mockComponents}
            xAxisKey="component"
            bars={[{ dataKey: "cost_hourly", name: "Cost/hr", color: "var(--chart-1)" }]}
            height={300}
          />
        </CardContent>
      </Card>
    </div>
  )
}
