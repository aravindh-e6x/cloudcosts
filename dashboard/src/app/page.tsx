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
  Skeleton,
} from "laminar-ui"
import { TimeRangePicker, type DateRange } from "@/components/shared"
import { DollarSign, Server, HardDrive, Box, AlertTriangle } from "lucide-react"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"
import { overviewQueries } from "@/lib/queries"

interface CostByAccount {
  account_id: string
  provider: string
  cost: number
}

interface DailyCost {
  date: string
  cost: number
}

interface TopService {
  service: string
  cost: number
}

interface TotalCost {
  total_cost: number
}

interface ClusterCount {
  cluster_count: number
}

interface NodeCount {
  node_count: number
}

interface PodCount {
  pod_count: number
}

export default function OverviewPage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()

  // Fetch total cloud spend
  const { data: totalCostData, loading: costLoading } = useQuery<TotalCost>(
    "vantage",
    overviewQueries.totalCloudSpend,
    { refetchInterval: 300000 }
  )

  // Fetch active clusters
  const { data: clusterData } = useQuery<ClusterCount>(
    "kubernetes",
    overviewQueries.activeClusters,
    { refetchInterval: 60000 }
  )

  // Fetch total nodes
  const { data: nodeData } = useQuery<NodeCount>(
    "kubernetes",
    overviewQueries.totalNodes,
    { refetchInterval: 60000 }
  )

  // Fetch total pods
  const { data: podData } = useQuery<PodCount>(
    "kubernetes",
    overviewQueries.totalPods,
    { refetchInterval: 60000 }
  )

  // Fetch cost by account
  const { data: costByAccount } = useQuery<CostByAccount>(
    "vantage",
    overviewQueries.costByAccount,
    { refetchInterval: 300000 }
  )

  // Fetch daily cost trend
  const { data: dailyCostTrend } = useQuery<DailyCost>(
    "vantage",
    overviewQueries.dailyCostTrend,
    { refetchInterval: 300000 }
  )

  // Fetch top services
  const { data: topServices } = useQuery<TopService>(
    "vantage",
    overviewQueries.topServices,
    { refetchInterval: 300000 }
  )

  // Extract values
  const totalCloudSpend = totalCostData?.[0]?.total_cost || 0
  const activeK8sClusters = clusterData?.[0]?.cluster_count || 0
  const totalNodes = nodeData?.[0]?.node_count || 0
  const totalPods = podData?.[0]?.pod_count || 0

  // Daily cost chart data
  const dailyCostChartData = useMemo(() => {
    if (!dailyCostTrend) return []
    return dailyCostTrend.map(item => ({
      date: formatDate(item.date),
      cost: item.cost,
    }))
  }, [dailyCostTrend])

  // Calculate average daily cost
  const avgDailyCost = useMemo(() => {
    if (!dailyCostTrend || dailyCostTrend.length === 0) return 0
    const total = dailyCostTrend.reduce((sum, item) => sum + item.cost, 0)
    return total / dailyCostTrend.length
  }, [dailyCostTrend])

  const costByAccountColumns = [
    { key: "account_id", header: "Account ID", sortable: true },
    { key: "provider", header: "Provider", sortable: true, render: (value: unknown) => String(value).toUpperCase() },
    { key: "cost", header: "Cost (30d)", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
  ]

  if (costLoading) {
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
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-muted-foreground">
            Cloud cost and infrastructure summary
          </p>
        </div>
        <TimeRangePicker value={timeRange} onChange={setTimeRange} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Cloud Spend (30d)"
          value={totalCloudSpend}
          prefix="$"
        />
        <StatCard
          label="K8s Clusters"
          value={activeK8sClusters}
        />
        <StatCard
          label="E6 Clusters"
          value={0}
        />
        <StatCard
          label="Total Nodes"
          value={totalNodes}
        />
        <StatCard
          label="Running Pods"
          value={totalPods}
        />
        <StatCard
          label="Active Alerts"
          value={0}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cost by Account/Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Account</CardTitle>
            <CardDescription>Last 30 days spend by account and provider</CardDescription>
          </CardHeader>
          <CardContent>
            {costByAccount && costByAccount.length > 0 ? (
              <DataTable
                data={costByAccount.slice(0, 10)}
                columns={costByAccountColumns}
                hoverable
                striped
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trend</CardTitle>
            <CardDescription>Daily cloud spend over time</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyCostChartData.length > 0 ? (
              <LineChart
                data={dailyCostChartData}
                xAxisKey="date"
                lines={[
                  { dataKey: "cost", name: "Cost", color: "var(--chart-1)" },
                ]}
                height={300}
                yAxisFormatter={(value) => `$${value}`}
                tooltipFormatter={(value) => formatCurrency(Number(value))}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top AWS Services */}
        <Card>
          <CardHeader>
            <CardTitle>Top AWS Services</CardTitle>
            <CardDescription>Highest cost services</CardDescription>
          </CardHeader>
          <CardContent>
            {topServices && topServices.length > 0 ? (
              <BarChart
                data={topServices}
                xAxisKey="service"
                bars={[
                  { dataKey: "cost", name: "Cost", color: "var(--chart-1)" },
                ]}
                height={300}
                layout="vertical"
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Summary</CardTitle>
            <CardDescription>Current infrastructure status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <span>Kubernetes Clusters</span>
                </div>
                <span className="font-mono font-semibold">{activeK8sClusters}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <Box className="h-5 w-5 text-muted-foreground" />
                  <span>E6 Clusters</span>
                </div>
                <span className="font-mono font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <span>Total Nodes</span>
                </div>
                <span className="font-mono font-semibold">{totalNodes}</span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span>Avg Daily Cost</span>
                </div>
                <span className="font-mono font-semibold">{formatCurrency(avgDailyCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Active Alerts</span>
                </div>
                <span className="font-mono font-semibold text-orange-500">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
