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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "laminar-ui"
import { TimeRangePicker, MockBadge, type DateRange } from "@/components/shared"
import { Activity, AlertTriangle, CheckCircle, ArrowLeft, Building2, Server, ChevronRight } from "lucide-react"

// ============================================
// MOCK DATA - Customers and their clusters
// ============================================

interface E6Cluster {
  id: string
  name: string
  customer: string
  region: string
  status: "healthy" | "warning" | "critical"
  components: ComponentData[]
  pods: PodData[]
  [key: string]: unknown
}

interface ComponentData {
  component: string
  pods: number
  cpu_alloc: string
  mem_alloc: string
  cpu_used: string
  mem_used: string
  cost_hourly: number
  [key: string]: string | number
}

interface PodData {
  name: string
  component: string
  size: string
  cpu_alloc: string
  mem_alloc: string
  cpu_used: string
  mem_used: string
  cpu_pct: number
  mem_pct: number
  cost_hourly: number
  [key: string]: string | number
}

const mockCustomers = [
  { id: "zepto", name: "Zepto", clusters: 3 },
  { id: "tekion", name: "Tekion", clusters: 2 },
  { id: "cisco", name: "Cisco", clusters: 4 },
  { id: "swiggy", name: "Swiggy", clusters: 2 },
  { id: "internal", name: "Internal (E6)", clusters: 5 },
]

const mockClustersByCustomer: Record<string, E6Cluster[]> = {
  zepto: [
    {
      id: "zepto-prod-1",
      name: "zepto-prod-us-east",
      customer: "zepto",
      region: "us-east-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 3, cpu_alloc: "12 cores", mem_alloc: "24Gi", cpu_used: "9.6 cores", mem_used: "19.5Gi", cost_hourly: 15.80 },
        { component: "Storage", pods: 4, cpu_alloc: "8 cores", mem_alloc: "64Gi", cpu_used: "6.0 cores", mem_used: "48Gi", cost_hourly: 12.50 },
        { component: "Schema", pods: 2, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.8 cores", mem_used: "5.2Gi", cost_hourly: 4.20 },
        { component: "Queue", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.2 cores", mem_used: "2.8Gi", cost_hourly: 2.80 },
        { component: "Executor", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "0.8 cores", mem_used: "1.5Gi", cost_hourly: 2.10 },
      ],
      pods: [
        { name: "e6-planner-0", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.2 cores", mem_used: "6.5Gi", cpu_pct: 80, mem_pct: 81, cost_hourly: 5.27 },
        { name: "e6-planner-1", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.1 cores", mem_used: "6.2Gi", cpu_pct: 77, mem_pct: 77, cost_hourly: 5.27 },
        { name: "e6-planner-2", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.3 cores", mem_used: "6.8Gi", cpu_pct: 82, mem_pct: 85, cost_hourly: 5.26 },
        { name: "e6-storage-0", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.5 cores", mem_used: "12Gi", cpu_pct: 75, mem_pct: 75, cost_hourly: 3.12 },
        { name: "e6-storage-1", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.4 cores", mem_used: "11Gi", cpu_pct: 70, mem_pct: 68, cost_hourly: 3.13 },
        { name: "e6-schema-0", component: "Schema", size: "2xlarge", cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.4 cores", mem_used: "2.6Gi", cpu_pct: 70, mem_pct: 65, cost_hourly: 2.10 },
        { name: "e6-queue-0", component: "Queue", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.6 cores", mem_used: "1.4Gi", cpu_pct: 60, mem_pct: 70, cost_hourly: 1.40 },
        { name: "e6-executor-0", component: "Executor", size: "xlarge", cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.4 cores", mem_used: "0.75Gi", cpu_pct: 40, mem_pct: 37, cost_hourly: 1.05 },
      ],
    },
    {
      id: "zepto-prod-2",
      name: "zepto-prod-us-west",
      customer: "zepto",
      region: "us-west-2",
      status: "healthy",
      components: [
        { component: "Planner", pods: 2, cpu_alloc: "8 cores", mem_alloc: "16Gi", cpu_used: "6.0 cores", mem_used: "12Gi", cost_hourly: 10.50 },
        { component: "Storage", pods: 3, cpu_alloc: "6 cores", mem_alloc: "48Gi", cpu_used: "4.5 cores", mem_used: "36Gi", cost_hourly: 9.40 },
        { component: "Schema", pods: 1, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.4 cores", mem_used: "2.6Gi", cost_hourly: 2.10 },
        { component: "Queue", pods: 1, cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.6 cores", mem_used: "1.4Gi", cost_hourly: 1.40 },
        { component: "Executor", pods: 1, cpu_alloc: "1 core", mem_alloc: "2Gi", cpu_used: "0.4 cores", mem_used: "0.75Gi", cost_hourly: 1.05 },
      ],
      pods: [
        { name: "e6-planner-0", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.0 cores", mem_used: "6.0Gi", cpu_pct: 75, mem_pct: 75, cost_hourly: 5.25 },
        { name: "e6-planner-1", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.0 cores", mem_used: "6.0Gi", cpu_pct: 75, mem_pct: 75, cost_hourly: 5.25 },
        { name: "e6-storage-0", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.5 cores", mem_used: "12Gi", cpu_pct: 75, mem_pct: 75, cost_hourly: 3.13 },
      ],
    },
    {
      id: "zepto-staging",
      name: "zepto-staging",
      customer: "zepto",
      region: "us-east-1",
      status: "warning",
      components: [
        { component: "Planner", pods: 1, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.5 cores", mem_used: "7.2Gi", cost_hourly: 5.27 },
        { component: "Storage", pods: 1, cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.8 cores", mem_used: "14Gi", cost_hourly: 3.12 },
        { component: "Schema", pods: 1, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.8 cores", mem_used: "3.6Gi", cost_hourly: 2.10 },
      ],
      pods: [
        { name: "e6-planner-0", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.5 cores", mem_used: "7.2Gi", cpu_pct: 87, mem_pct: 90, cost_hourly: 5.27 },
        { name: "e6-storage-0", component: "Storage", size: "8xlarge", cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.8 cores", mem_used: "14Gi", cpu_pct: 90, mem_pct: 87, cost_hourly: 3.12 },
      ],
    },
  ],
  tekion: [
    {
      id: "tekion-prod",
      name: "tekion-prod-us-east",
      customer: "tekion",
      region: "us-east-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 4, cpu_alloc: "16 cores", mem_alloc: "32Gi", cpu_used: "12 cores", mem_used: "26Gi", cost_hourly: 21.00 },
        { component: "Storage", pods: 6, cpu_alloc: "12 cores", mem_alloc: "96Gi", cpu_used: "9 cores", mem_used: "72Gi", cost_hourly: 18.80 },
        { component: "Schema", pods: 2, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.8 cores", mem_used: "5.2Gi", cost_hourly: 4.20 },
        { component: "Queue", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.2 cores", mem_used: "2.8Gi", cost_hourly: 2.80 },
        { component: "Executor", pods: 3, cpu_alloc: "3 cores", mem_alloc: "6Gi", cpu_used: "1.2 cores", mem_used: "2.25Gi", cost_hourly: 3.15 },
      ],
      pods: [
        { name: "e6-planner-0", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.0 cores", mem_used: "6.5Gi", cpu_pct: 75, mem_pct: 81, cost_hourly: 5.25 },
        { name: "e6-planner-1", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.0 cores", mem_used: "6.5Gi", cpu_pct: 75, mem_pct: 81, cost_hourly: 5.25 },
        { name: "e6-planner-2", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.0 cores", mem_used: "6.5Gi", cpu_pct: 75, mem_pct: 81, cost_hourly: 5.25 },
        { name: "e6-planner-3", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.0 cores", mem_used: "6.5Gi", cpu_pct: 75, mem_pct: 81, cost_hourly: 5.25 },
      ],
    },
    {
      id: "tekion-staging",
      name: "tekion-staging",
      customer: "tekion",
      region: "us-west-2",
      status: "healthy",
      components: [
        { component: "Planner", pods: 1, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.0 cores", mem_used: "4Gi", cost_hourly: 5.25 },
        { component: "Storage", pods: 1, cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.0 cores", mem_used: "8Gi", cost_hourly: 3.12 },
      ],
      pods: [
        { name: "e6-planner-0", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.0 cores", mem_used: "4Gi", cpu_pct: 50, mem_pct: 50, cost_hourly: 5.25 },
      ],
    },
  ],
  cisco: [
    {
      id: "cisco-prod-1",
      name: "cisco-prod-us-east",
      customer: "cisco",
      region: "us-east-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 5, cpu_alloc: "20 cores", mem_alloc: "40Gi", cpu_used: "15 cores", mem_used: "32Gi", cost_hourly: 26.25 },
        { component: "Storage", pods: 8, cpu_alloc: "16 cores", mem_alloc: "128Gi", cpu_used: "12 cores", mem_used: "96Gi", cost_hourly: 25.00 },
        { component: "Schema", pods: 3, cpu_alloc: "6 cores", mem_alloc: "12Gi", cpu_used: "4.2 cores", mem_used: "7.8Gi", cost_hourly: 6.30 },
        { component: "Queue", pods: 3, cpu_alloc: "3 cores", mem_alloc: "6Gi", cpu_used: "1.8 cores", mem_used: "4.2Gi", cost_hourly: 4.20 },
        { component: "Executor", pods: 4, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "1.6 cores", mem_used: "3Gi", cost_hourly: 4.20 },
      ],
      pods: [],
    },
    {
      id: "cisco-prod-2",
      name: "cisco-prod-eu-west",
      customer: "cisco",
      region: "eu-west-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 3, cpu_alloc: "12 cores", mem_alloc: "24Gi", cpu_used: "9 cores", mem_used: "18Gi", cost_hourly: 15.75 },
        { component: "Storage", pods: 4, cpu_alloc: "8 cores", mem_alloc: "64Gi", cpu_used: "6 cores", mem_used: "48Gi", cost_hourly: 12.48 },
      ],
      pods: [],
    },
    {
      id: "cisco-staging",
      name: "cisco-staging",
      customer: "cisco",
      region: "us-east-1",
      status: "critical",
      components: [
        { component: "Planner", pods: 1, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.9 cores", mem_used: "7.8Gi", cost_hourly: 5.25 },
        { component: "Storage", pods: 1, cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.95 cores", mem_used: "15.5Gi", cost_hourly: 3.12 },
      ],
      pods: [
        { name: "e6-planner-0", component: "Planner", size: "4xlarge", cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.9 cores", mem_used: "7.8Gi", cpu_pct: 97, mem_pct: 97, cost_hourly: 5.25 },
      ],
    },
    {
      id: "cisco-dev",
      name: "cisco-dev",
      customer: "cisco",
      region: "us-west-2",
      status: "healthy",
      components: [
        { component: "Planner", pods: 1, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1 core", mem_used: "2Gi", cost_hourly: 2.62 },
      ],
      pods: [],
    },
  ],
  swiggy: [
    {
      id: "swiggy-prod",
      name: "swiggy-prod-ap-south",
      customer: "swiggy",
      region: "ap-south-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 4, cpu_alloc: "16 cores", mem_alloc: "32Gi", cpu_used: "12 cores", mem_used: "25Gi", cost_hourly: 21.00 },
        { component: "Storage", pods: 5, cpu_alloc: "10 cores", mem_alloc: "80Gi", cpu_used: "7.5 cores", mem_used: "60Gi", cost_hourly: 15.60 },
        { component: "Schema", pods: 2, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.8 cores", mem_used: "5.2Gi", cost_hourly: 4.20 },
        { component: "Queue", pods: 2, cpu_alloc: "2 cores", mem_alloc: "4Gi", cpu_used: "1.2 cores", mem_used: "2.8Gi", cost_hourly: 2.80 },
        { component: "Executor", pods: 3, cpu_alloc: "3 cores", mem_alloc: "6Gi", cpu_used: "1.2 cores", mem_used: "2.25Gi", cost_hourly: 3.15 },
      ],
      pods: [],
    },
    {
      id: "swiggy-staging",
      name: "swiggy-staging",
      customer: "swiggy",
      region: "ap-south-1",
      status: "warning",
      components: [
        { component: "Planner", pods: 1, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.2 cores", mem_used: "7Gi", cost_hourly: 5.25 },
        { component: "Storage", pods: 1, cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1.7 cores", mem_used: "14Gi", cost_hourly: 3.12 },
      ],
      pods: [],
    },
  ],
  internal: [
    {
      id: "int-perf-dev",
      name: "int-perf-dev",
      customer: "internal",
      region: "us-east-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 2, cpu_alloc: "8 cores", mem_alloc: "16Gi", cpu_used: "4 cores", mem_used: "8Gi", cost_hourly: 10.50 },
        { component: "Storage", pods: 2, cpu_alloc: "4 cores", mem_alloc: "32Gi", cpu_used: "2 cores", mem_used: "16Gi", cost_hourly: 6.24 },
      ],
      pods: [],
    },
    {
      id: "int-control-plane-prod",
      name: "int-control-plane-prod",
      customer: "internal",
      region: "us-east-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 3, cpu_alloc: "12 cores", mem_alloc: "24Gi", cpu_used: "9 cores", mem_used: "18Gi", cost_hourly: 15.75 },
        { component: "Storage", pods: 4, cpu_alloc: "8 cores", mem_alloc: "64Gi", cpu_used: "6 cores", mem_used: "48Gi", cost_hourly: 12.48 },
        { component: "Schema", pods: 2, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2.8 cores", mem_used: "5.2Gi", cost_hourly: 4.20 },
      ],
      pods: [],
    },
    {
      id: "int-control-plane-pilot",
      name: "int-control-plane-pilot",
      customer: "internal",
      region: "us-west-2",
      status: "healthy",
      components: [
        { component: "Planner", pods: 1, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "2 cores", mem_used: "4Gi", cost_hourly: 5.25 },
        { component: "Storage", pods: 1, cpu_alloc: "2 cores", mem_alloc: "16Gi", cpu_used: "1 core", mem_used: "8Gi", cost_hourly: 3.12 },
      ],
      pods: [],
    },
    {
      id: "int-serverless-prod",
      name: "int-serverless-prod",
      customer: "internal",
      region: "us-east-1",
      status: "healthy",
      components: [
        { component: "Planner", pods: 2, cpu_alloc: "8 cores", mem_alloc: "16Gi", cpu_used: "6 cores", mem_used: "12Gi", cost_hourly: 10.50 },
        { component: "Storage", pods: 3, cpu_alloc: "6 cores", mem_alloc: "48Gi", cpu_used: "4.5 cores", mem_used: "36Gi", cost_hourly: 9.36 },
      ],
      pods: [],
    },
    {
      id: "int-serverless-beta",
      name: "int-serverless-beta",
      customer: "internal",
      region: "us-east-1",
      status: "warning",
      components: [
        { component: "Planner", pods: 1, cpu_alloc: "4 cores", mem_alloc: "8Gi", cpu_used: "3.4 cores", mem_used: "7.2Gi", cost_hourly: 5.25 },
      ],
      pods: [],
    },
  ],
}

// Time series data for cluster details
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

// ============================================
// COLUMN DEFINITIONS
// ============================================

const clusterListColumns = [
  { key: "name", header: "Cluster Name", sortable: true },
  { key: "region", header: "Region", sortable: true },
  { key: "status", header: "Status", sortable: true, render: (value: unknown) => {
    const status = String(value)
    return (
      <Badge variant={status === 'healthy' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
        {status === 'healthy' ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }},
  { key: "components", header: "Components", render: (value: unknown) => {
    const components = value as ComponentData[]
    return components.length
  }},
  { key: "totalCost", header: "Cost/hr", sortable: true, render: (_: unknown, row: E6Cluster) => {
    const total = row.components.reduce((sum, c) => sum + c.cost_hourly, 0)
    return `$${total.toFixed(2)}`
  }},
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function E6ClustersPage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<E6Cluster | null>(null)

  // Get clusters for selected customer
  const customerClusters = selectedCustomer ? mockClustersByCustomer[selectedCustomer] || [] : []

  // Calculate cluster stats
  const clusterStats = useMemo(() => {
    if (!selectedCluster) return null
    const totalPods = selectedCluster.components.reduce((sum, c) => sum + c.pods, 0)
    const totalCostHourly = selectedCluster.components.reduce((sum, c) => sum + c.cost_hourly, 0)
    const avgCpuUtil = selectedCluster.pods.length > 0
      ? selectedCluster.pods.reduce((sum, p) => sum + p.cpu_pct, 0) / selectedCluster.pods.length
      : 70 // Default estimate
    const avgMemUtil = selectedCluster.pods.length > 0
      ? selectedCluster.pods.reduce((sum, p) => sum + p.mem_pct, 0) / selectedCluster.pods.length
      : 70 // Default estimate
    return { totalPods, totalCostHourly, avgCpuUtil, avgMemUtil }
  }, [selectedCluster])

  // ============================================
  // STEP 1: Customer Selection
  // ============================================
  if (!selectedCustomer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">E6 Clusters</h1>
            <p className="text-muted-foreground">Select a customer to view their E6 clusters</p>
          </div>
          <div className="flex items-center gap-3">
            <MockBadge />
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          </div>
        </div>

        {/* Overview */}
        <Card className="relative">
          <MockBadge className="absolute top-2 right-2" />
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>All E6 clusters across customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold">{mockCustomers.length}</p>
                <p className="text-sm text-muted-foreground">Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {Object.values(mockClustersByCustomer).flat().length}
                </p>
                <p className="text-sm text-muted-foreground">Total Clusters</p>
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {Object.values(mockClustersByCustomer).flat().filter(c => c.status === 'healthy').length}
                </p>
                <p className="text-sm text-muted-foreground">Healthy</p>
              </div>
              <div>
                <p className="text-3xl font-bold">
                  ${Object.values(mockClustersByCustomer).flat().reduce((sum, c) =>
                    sum + c.components.reduce((s, comp) => s + comp.cost_hourly, 0), 0
                  ).toFixed(0)}/hr
                </p>
                <p className="text-sm text-muted-foreground">Total Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockCustomers.map((customer) => {
            const clusters = mockClustersByCustomer[customer.id] || []

            return (
              <Card
                key={customer.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedCustomer(customer.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{customer.name}</h3>
                        <p className="text-sm text-muted-foreground">{clusters.length} clusters</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================================
  // STEP 2: Cluster Selection (for selected customer)
  // ============================================
  if (!selectedCluster) {
    const customer = mockCustomers.find(c => c.id === selectedCustomer)

    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{customer?.name} Clusters</h1>
              <p className="text-muted-foreground">Select a cluster to view details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MockBadge />
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          </div>
        </div>

        {/* Cluster Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customerClusters.map((cluster) => {
            const totalCost = cluster.components.reduce((sum, c) => sum + c.cost_hourly, 0)
            const totalPods = cluster.components.reduce((sum, c) => sum + c.pods, 0)

            return (
              <Card
                key={cluster.id}
                className="cursor-pointer hover:border-primary transition-colors relative"
                onClick={() => setSelectedCluster(cluster)}
              >
                <MockBadge className="absolute top-2 right-2" />
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Server className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{cluster.name}</h3>
                        <p className="text-sm text-muted-foreground">{cluster.region}</p>
                      </div>
                    </div>
                    <Badge variant={cluster.status === 'healthy' ? 'default' : cluster.status === 'warning' ? 'secondary' : 'destructive'}>
                      {cluster.status}
                    </Badge>
                  </div>
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold">{cluster.components.length}</p>
                      <p className="text-xs text-muted-foreground">Components</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{totalPods}</p>
                      <p className="text-xs text-muted-foreground">Pods</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">${totalCost.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">/hr</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Cluster List Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Clusters</CardTitle>
            <CardDescription>Click a row to view cluster details</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={customerClusters}
              columns={clusterListColumns}
              hoverable
              onRowClick={(row) => setSelectedCluster(row as E6Cluster)}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================
  // STEP 3: Cluster Details
  // ============================================
  const customer = mockCustomers.find(c => c.id === selectedCustomer)

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedCluster(null)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span
                className="hover:text-foreground cursor-pointer"
                onClick={() => { setSelectedCustomer(null); setSelectedCluster(null) }}
              >
                E6 Clusters
              </span>
              <ChevronRight className="h-4 w-4" />
              <span
                className="hover:text-foreground cursor-pointer"
                onClick={() => setSelectedCluster(null)}
              >
                {customer?.name}
              </span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{selectedCluster.name}</span>
            </div>
            <h1 className="text-2xl font-bold">{selectedCluster.name}</h1>
            <p className="text-muted-foreground">{selectedCluster.region}</p>
          </div>
          <Badge
            variant={selectedCluster.status === 'healthy' ? 'default' : selectedCluster.status === 'warning' ? 'secondary' : 'destructive'}
            className="flex items-center gap-1"
          >
            {selectedCluster.status === 'healthy' ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {selectedCluster.status.charAt(0).toUpperCase() + selectedCluster.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Live</span>
          </div>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-3xl font-bold">
              ${clusterStats?.totalCostHourly.toFixed(2)}<span className="text-lg font-normal">/hr</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ~${((clusterStats?.totalCostHourly || 0) * 24 * 30).toFixed(0)}/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CPU Utilization</p>
            <p className="text-3xl font-bold">{clusterStats?.avgCpuUtil.toFixed(0)}%</p>
            <div className="mt-2 h-2 bg-muted overflow-hidden rounded">
              <div
                className={`h-full transition-all ${(clusterStats?.avgCpuUtil || 0) > 80 ? 'bg-red-500' : (clusterStats?.avgCpuUtil || 0) > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(clusterStats?.avgCpuUtil || 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Memory Utilization</p>
            <p className="text-3xl font-bold">{clusterStats?.avgMemUtil.toFixed(0)}%</p>
            <div className="mt-2 h-2 bg-muted overflow-hidden rounded">
              <div
                className={`h-full transition-all ${(clusterStats?.avgMemUtil || 0) > 80 ? 'bg-red-500' : (clusterStats?.avgMemUtil || 0) > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(clusterStats?.avgMemUtil || 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Pods</p>
            <p className="text-3xl font-bold">{clusterStats?.totalPods}</p>
            <p className="text-xs text-muted-foreground mt-1">{selectedCluster.components.length} components</p>
          </CardContent>
        </Card>
      </div>

      {/* Component Table and Cost Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Components</CardTitle>
            <CardDescription>Cost by component (high to low)</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={[...selectedCluster.components].sort((a, b) => b.cost_hourly - a.cost_hourly)}
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

      {/* Pod Details */}
      {selectedCluster.pods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pod Details</CardTitle>
            <CardDescription>Individual pod resource usage and costs</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={selectedCluster.pods}
              columns={podColumns}
              hoverable
              striped
            />
          </CardContent>
        </Card>
      )}

      {/* CPU Usage Chart */}
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
