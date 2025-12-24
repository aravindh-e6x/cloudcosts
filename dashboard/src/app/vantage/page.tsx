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
  Combobox,
  Skeleton,
} from "laminar-ui"
import { TimeRangePicker, type DateRange } from "@/components/shared"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"
import { vantageQueries } from "@/lib/queries"
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface CostByAccount {
  account_id: string
  account_name: string
  provider: string
  cost: number
  [key: string]: unknown
}

interface CostByService {
  service: string
  provider: string
  cost: number
  [key: string]: string | number
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

  // Calculate week-over-week trend
  const costTrend = useMemo(() => {
    if (!dailyCostTrend || dailyCostTrend.length < 14) return { change: 0, direction: 'flat' as const, weeklySpend: 0, prevWeeklySpend: 0 }
    const recentWeek = dailyCostTrend.slice(-7).reduce((sum, d) => sum + d.cost, 0)
    const previousWeek = dailyCostTrend.slice(-14, -7).reduce((sum, d) => sum + d.cost, 0)
    const change = previousWeek > 0 ? ((recentWeek - previousWeek) / previousWeek) * 100 : 0
    return {
      change: Math.abs(change).toFixed(1),
      direction: change > 2 ? 'up' as const : change < -2 ? 'down' as const : 'flat' as const,
      weeklySpend: recentWeek,
      prevWeeklySpend: previousWeek
    }
  }, [dailyCostTrend])

  // Find highest and lowest cost days
  const costExtremes = useMemo(() => {
    if (!dailyCostTrend || dailyCostTrend.length === 0) return { highest: null, lowest: null }
    const sorted = [...dailyCostTrend].sort((a, b) => b.cost - a.cost)
    return {
      highest: sorted[0],
      lowest: sorted[sorted.length - 1]
    }
  }, [dailyCostTrend])

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

  // Cost by provider for table
  const costByProvider = useMemo(() => {
    if (!costByAccount) return []
    const providerTotals = new Map<string, number>()
    costByAccount.forEach(acc => {
      providerTotals.set(acc.provider, (providerTotals.get(acc.provider) || 0) + acc.cost)
    })
    return Array.from(providerTotals.entries())
      .map(([name, value]) => ({
        provider: name.toUpperCase(),
        cost: value,
      }))
      .sort((a, b) => b.cost - a.cost)
  }, [costByAccount])

  // Sorted services by cost
  const sortedServices = useMemo(() => {
    if (!costByService) return []
    return [...costByService].sort((a, b) => b.cost - a.cost)
  }, [costByService])

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
    const grouped = new Map<string, Record<string, string | number>>()
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>5m refresh</span>
          </div>
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

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spend</p>
                <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${costTrend.direction === 'up' ? 'text-red-500' : costTrend.direction === 'down' ? 'text-green-600' : 'text-muted-foreground'}`}>
                {costTrend.direction === 'up' ? <TrendingUp className="h-4 w-4" /> : costTrend.direction === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
                <span>{costTrend.change}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Weekly Spend</p>
            <p className="text-3xl font-bold">{formatCurrency(costTrend.weeklySpend)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              {costTrend.direction === 'up' ? (
                <span className="text-red-500 flex items-center"><ArrowUpRight className="h-3 w-3" /> {formatCurrency(costTrend.weeklySpend - costTrend.prevWeeklySpend)} vs last week</span>
              ) : costTrend.direction === 'down' ? (
                <span className="text-green-600 flex items-center"><ArrowDownRight className="h-3 w-3" /> {formatCurrency(costTrend.prevWeeklySpend - costTrend.weeklySpend)} vs last week</span>
              ) : (
                <span className="text-muted-foreground">Same as last week</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Daily Cost</p>
            <p className="text-3xl font-bold">{formatCurrency(avgDailyCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {costExtremes.highest ? `Peak: ${formatCurrency(costExtremes.highest.cost)}` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Service</p>
            <p className="text-3xl font-bold">{formatCurrency(topService?.cost || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {topService?.service || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Accounts</span>
            <span className="font-mono font-semibold">{summary?.account_count || costByAccount?.length || 0}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Providers</span>
            <span className="font-mono font-semibold">{summary?.provider_count || costByProvider.length}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Services</span>
            <span className="font-mono font-semibold">{costByService?.length || 0}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Lowest Day</span>
            <span className="font-mono font-semibold">{costExtremes.lowest ? formatCurrency(costExtremes.lowest.cost) : '-'}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Highest Day</span>
            <span className="font-mono font-semibold">{costExtremes.highest ? formatCurrency(costExtremes.highest.cost) : '-'}</span>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">Projected</span>
            <span className="font-mono font-semibold">{formatCurrency(avgDailyCost * 30)}</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cost by Provider Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Provider</CardTitle>
            <CardDescription>30-day spend by cloud provider (high to low)</CardDescription>
          </CardHeader>
          <CardContent>
            {costByProvider.length > 0 ? (
              <DataTable
                data={costByProvider}
                columns={[
                  { key: "provider", header: "Provider", sortable: true },
                  { key: "cost", header: "Cost (30d)", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
                ]}
                hoverable
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
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
              <CardDescription>Monthly spend breakdown by account (high to low)</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={filteredAccounts.sort((a, b) => b.cost - a.cost)}
                columns={accountColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6 mt-4">
          {/* Service Cost Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Service</CardTitle>
              <CardDescription>Monthly spend breakdown by service (high to low)</CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <DataTable
                  data={sortedServices}
                  columns={serviceColumns}
                  hoverable
                  striped
                />
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
