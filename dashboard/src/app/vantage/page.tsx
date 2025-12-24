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
  PieChart,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Combobox,
  Skeleton,
} from "laminar-ui"
import { TimeRangePicker, type DateRange } from "@/components/shared"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"
import { vantageQueries } from "@/lib/queries"

interface CostByAccount {
  account_id: string
  account_name: string
  provider: string
  cost: number
}

interface CostByService {
  service: string
  provider: string
  cost: number
}

interface DailyCost {
  date: string
  cost: number
}

interface DailyCostByProvider {
  date: string
  provider: string
  cost: number
}

interface CostSummary {
  total_cost: number
  provider_count: number
  account_count: number
}

export default function VantagePage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  // Fetch cost by account
  const { data: costByAccount, loading: accountsLoading } = useQuery<CostByAccount>(
    "vantage",
    vantageQueries.costByAccount,
    { refetchInterval: 300000 }
  )

  // Fetch cost by service
  const { data: costByService, loading: servicesLoading } = useQuery<CostByService>(
    "vantage",
    vantageQueries.costByService,
    { refetchInterval: 300000 }
  )

  // Fetch daily cost trend
  const { data: dailyCostTrend } = useQuery<DailyCost>(
    "vantage",
    vantageQueries.dailyCostTrend,
    { refetchInterval: 300000 }
  )

  // Fetch daily cost by provider
  const { data: dailyCostByProvider } = useQuery<DailyCostByProvider>(
    "vantage",
    vantageQueries.dailyCostByProvider,
    { refetchInterval: 300000 }
  )

  // Fetch cost summary
  const { data: costSummary } = useQuery<CostSummary>(
    "vantage",
    vantageQueries.costSummary,
    { refetchInterval: 300000 }
  )

  // Calculate totals and aggregations
  const summary = costSummary?.[0]
  const totalCost = summary?.total_cost || costByAccount?.reduce((sum, acc) => sum + acc.cost, 0) || 0
  const avgDailyCost = totalCost / 30

  // Filter accounts if selection is made
  const filteredAccounts = useMemo(() => {
    if (!costByAccount) return []
    if (selectedAccounts.length === 0) return costByAccount
    return costByAccount.filter(acc => selectedAccounts.includes(acc.account_id))
  }, [costByAccount, selectedAccounts])

  // Account options for filter
  const accountOptions = useMemo(() =>
    costByAccount?.map(acc => ({
      value: acc.account_id,
      label: acc.account_name || acc.account_id,
    })) || [],
    [costByAccount]
  )

  // Cost by provider for pie chart
  const costByProvider = useMemo(() => {
    if (!costByAccount) return []
    const providerTotals = new Map<string, number>()
    costByAccount.forEach(acc => {
      providerTotals.set(acc.provider, (providerTotals.get(acc.provider) || 0) + acc.cost)
    })
    const colors: Record<string, string> = {
      aws: "#FF9900",
      azure: "#0078D4",
      gcp: "#4285F4",
      snowflake: "#29B5E8",
      databricks: "#FF3621",
    }
    return Array.from(providerTotals.entries()).map(([name, value]) => ({
      name: name.toUpperCase(),
      value,
      color: colors[name] || "#666666",
    }))
  }, [costByAccount])

  // Daily cost chart data
  const dailyCostChartData = useMemo(() => {
    if (!dailyCostTrend) return []
    return dailyCostTrend.map(item => ({
      date: formatDate(item.date),
      cost: item.cost,
    }))
  }, [dailyCostTrend])

  // Service trend data (grouped by date and service)
  const serviceTrendData = useMemo(() => {
    if (!dailyCostByProvider) return []
    const grouped = new Map<string, Record<string, number>>()
    dailyCostByProvider.forEach(item => {
      const date = formatDate(item.date)
      if (!grouped.has(date)) {
        grouped.set(date, { date })
      }
      grouped.get(date)![item.provider] = item.cost
    })
    return Array.from(grouped.values())
  }, [dailyCostByProvider])

  // Get unique providers for chart lines
  const providers = useMemo(() => {
    if (!dailyCostByProvider) return []
    return [...new Set(dailyCostByProvider.map(item => item.provider))]
  }, [dailyCostByProvider])

  const providerColors: Record<string, string> = {
    aws: "#FF9900",
    azure: "#0078D4",
    gcp: "#4285F4",
    snowflake: "#29B5E8",
    databricks: "#FF3621",
  }

  // Top service
  const topService = costByService?.[0]

  const accountColumns = [
    { key: "account_name", header: "Account Name", sortable: true, render: (value: unknown, row: CostByAccount) => String(value) || row.account_id },
    { key: "account_id", header: "Account ID", sortable: true },
    { key: "provider", header: "Provider", sortable: true, render: (value: unknown) => String(value).toUpperCase() },
    { key: "cost", header: "Cost (30d)", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
  ]

  const serviceColumns = [
    { key: "service", header: "Service", sortable: true },
    { key: "provider", header: "Provider", sortable: true, render: (value: unknown) => String(value).toUpperCase() },
    { key: "cost", header: "Cost (30d)", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "percentage", header: "% of Total", sortable: true, render: (_value: unknown, row: CostByService) => {
      const pct = totalCost > 0 ? (row.cost / totalCost * 100) : 0
      return `${pct.toFixed(1)}%`
    }},
  ]

  if (accountsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
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
          <h1 className="text-2xl font-bold">Vantage Costs</h1>
          <p className="text-muted-foreground">
            Cloud cost analysis from Vantage reports
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Combobox
            options={accountOptions}
            value={selectedAccounts}
            onValueChange={(value) => setSelectedAccounts(Array.isArray(value) ? value : [value])}
            multiple
            placeholder="Filter accounts..."
            clearable
          />
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard
          label="Total Spend (30d)"
          value={totalCost}
          prefix="$"
        />
        <StatCard
          label="Avg Daily Cost"
          value={avgDailyCost}
          prefix="$"
        />
        <StatCard
          label="Accounts"
          value={summary?.account_count || costByAccount?.length || 0}
        />
        <StatCard
          label="Top Service"
          value={topService?.cost || 0}
          prefix="$"
          suffix={topService ? ` (${topService.service})` : ""}
        />
        <StatCard
          label="Providers"
          value={summary?.provider_count || costByProvider.length}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cost by Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Provider</CardTitle>
            <CardDescription>Last 30 days spend by cloud provider</CardDescription>
          </CardHeader>
          <CardContent>
            {costByProvider.length > 0 ? (
              <PieChart
                data={costByProvider}
                height={300}
                showLegend
                donut
                tooltipFormatter={(value) => formatCurrency(Number(value))}
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
            <CardDescription>Daily spend over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyCostChartData.length > 0 ? (
              <LineChart
                data={dailyCostChartData}
                xAxisKey="date"
                lines={[
                  { dataKey: "cost", name: "Total Cost", color: "var(--chart-1)" },
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

      {/* Tabs for different views */}
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">By Account</TabsTrigger>
          <TabsTrigger value="services">By Service</TabsTrigger>
          <TabsTrigger value="trends">Provider Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6 mt-4">
          {/* Account Cost Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Account</CardTitle>
              <CardDescription>Monthly spend breakdown by account</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredAccounts}
                columns={accountColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>

          {/* Account Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Account Cost Comparison</CardTitle>
              <CardDescription>Visual comparison of account spending</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAccounts.length > 0 ? (
                <BarChart
                  data={filteredAccounts.slice(0, 10).map(acc => ({
                    name: acc.account_name || acc.account_id,
                    cost: acc.cost,
                  }))}
                  xAxisKey="name"
                  bars={[{ dataKey: "cost", name: "Cost", color: "var(--chart-1)" }]}
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6 mt-4">
          {/* Service Cost Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Service</CardTitle>
              <CardDescription>Monthly spend breakdown by service</CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <DataTable
                  data={costByService || []}
                  columns={serviceColumns}
                  hoverable
                  striped
                />
              )}
            </CardContent>
          </Card>

          {/* Service Cost Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Services by Cost</CardTitle>
              <CardDescription>Highest spending services</CardDescription>
            </CardHeader>
            <CardContent>
              {costByService && costByService.length > 0 ? (
                <BarChart
                  data={costByService.slice(0, 10)}
                  xAxisKey="service"
                  bars={[{ dataKey: "cost", name: "Cost", color: "var(--chart-2)" }]}
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
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-4">
          {/* Provider Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Cost Trends</CardTitle>
              <CardDescription>Daily cost by provider over time</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceTrendData.length > 0 ? (
                <LineChart
                  data={serviceTrendData}
                  xAxisKey="date"
                  lines={providers.map(provider => ({
                    dataKey: provider,
                    name: provider.toUpperCase(),
                    color: providerColors[provider] || "#666666",
                  }))}
                  height={350}
                  yAxisFormatter={(value) => `$${value}`}
                  showLegend
                />
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stacked Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost Breakdown</CardTitle>
              <CardDescription>Cost composition per day by provider</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceTrendData.length > 0 ? (
                <BarChart
                  data={serviceTrendData.slice(-14)}
                  xAxisKey="date"
                  bars={providers.map(provider => ({
                    dataKey: provider,
                    name: provider.toUpperCase(),
                    color: providerColors[provider] || "#666666",
                    stacked: true,
                  }))}
                  height={300}
                  stacked
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
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
