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
  Skeleton,
  Badge,
} from "laminar-ui"
import {
  TimeRangePicker,
  BudgetCard,
  ComparisonCard,
  ChangeBadge,
  ExpandableSection,
  type DateRange,
} from "@/components/shared"
import { Activity, TrendingUp, TrendingDown } from "lucide-react"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"
import { overviewQueries } from "@/lib/queries"

// Monthly budget target
const MONTHLY_BUDGET = 50000

// ============================================
// TYPE DEFINITIONS
// ============================================

interface DailyCost {
  date: string
  cost: number
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

interface BudgetSummary {
  today_spend: number
  last_7d_spend: number
  mtd_spend: number
  day_of_month: number
  days_in_month: number
}

interface ExecutiveSummary {
  today: number
  yesterday: number
  this_week: number
  last_week: number
  same_week_last_month: number
  mtd: number
  same_period_last_month: number
}

interface DailySnapshot {
  metric: string
  today: number
  yesterday: number
  [key: string]: string | number
}

interface TrendsData {
  metric: string
  this_week: number
  last_week: number
  mtd: number
  prev_mtd: number
  [key: string]: string | number
}

interface ProviderCost {
  provider: string
  cost: number
  today: number
  yesterday: number
  last_7d: number
  prev_7d: number
  mtd: number
  prev_mtd: number
  [key: string]: string | number
}

interface ServiceCost {
  service: string
  cost: number
  today: number
  yesterday: number
  last_7d: number
  prev_7d: number
  mtd: number
  prev_mtd: number
  [key: string]: string | number
}

interface AWSAccount {
  account_id: string
  account_name: string
  cost: number
  today: number
  yesterday: number
  last_7d: number
  prev_7d: number
  mtd: number
  prev_mtd: number
  [key: string]: string | number
}


// ============================================
// HELPER COMPONENTS
// ============================================

function ChangeCell({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-muted-foreground">-</span>
  const change = ((current - previous) / previous) * 100
  return <ChangeBadge value={change} />
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OverviewPage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()

  // Fetch budget summary
  const { data: budgetData, loading: budgetLoading } = useQuery<BudgetSummary>(
    "vantage",
    overviewQueries.budgetSummary,
    { refetchInterval: 300000 }
  )

  // Fetch executive summary
  const { data: execSummaryData } = useQuery<ExecutiveSummary>(
    "vantage",
    overviewQueries.executiveSummary,
    { refetchInterval: 300000 }
  )

  // Fetch daily snapshot
  const { data: dailySnapshotData } = useQuery<DailySnapshot>(
    "vantage",
    overviewQueries.dailySnapshot,
    { refetchInterval: 300000 }
  )

  // Fetch daily snapshot total
  const { data: dailySnapshotTotalData } = useQuery<DailySnapshot>(
    "vantage",
    overviewQueries.dailySnapshotTotal,
    { refetchInterval: 300000 }
  )

  // Fetch trends by provider
  const { data: trendsData } = useQuery<TrendsData>(
    "vantage",
    overviewQueries.trendsbyProvider,
    { refetchInterval: 300000 }
  )

  // Fetch trends total
  const { data: trendsTotalData } = useQuery<TrendsData>(
    "vantage",
    overviewQueries.trendsTotal,
    { refetchInterval: 300000 }
  )

  // Fetch cost by provider full
  const { data: providerCostData } = useQuery<ProviderCost>(
    "vantage",
    overviewQueries.costByProviderFull,
    { refetchInterval: 300000 }
  )

  // Fetch top services
  const { data: topServicesData } = useQuery<ServiceCost>(
    "vantage",
    overviewQueries.topServicesFull,
    { refetchInterval: 300000 }
  )

  // Fetch AWS account breakdown
  const { data: awsAccountsData } = useQuery<AWSAccount>(
    "vantage",
    overviewQueries.awsAccountBreakdown,
    { refetchInterval: 300000 }
  )

  // Fetch daily cost trend
  const { data: dailyCostTrend } = useQuery<DailyCost>(
    "vantage",
    overviewQueries.dailyCostTrend,
    { refetchInterval: 300000 }
  )

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const budget = budgetData?.[0]
  const execSummary = execSummaryData?.[0]
  const dailyTotal = dailySnapshotTotalData?.[0]
  const trendsTotal = trendsTotalData?.[0]

  // Budget calculations
  const dailyTarget = MONTHLY_BUDGET / 30
  const weeklyTarget = dailyTarget * 7
  const dayOfMonth = budget?.day_of_month || new Date().getDate()
  const daysInMonth = budget?.days_in_month || 30
  const mtdTarget = (MONTHLY_BUDGET / daysInMonth) * dayOfMonth
  const projectedMonthly = budget?.mtd_spend
    ? (budget.mtd_spend / dayOfMonth) * daysInMonth
    : 0

  // Daily cost chart data
  const dailyCostChartData = useMemo(() => {
    if (!dailyCostTrend) return []
    return dailyCostTrend.map(item => ({
      date: formatDate(item.date),
      cost: item.cost,
    }))
  }, [dailyCostTrend])

  // Combined daily snapshot with total
  const dailySnapshotWithTotal = useMemo(() => {
    const total = dailyTotal ? [dailyTotal] : []
    const providers = dailySnapshotData || []
    return [...total, ...providers]
  }, [dailySnapshotData, dailyTotal])

  // Combined trends with total
  const trendsWithTotal = useMemo(() => {
    const total = trendsTotal ? [trendsTotal] : []
    const providers = trendsData || []
    return [...total, ...providers]
  }, [trendsData, trendsTotal])

  // ============================================
  // COLUMN DEFINITIONS
  // ============================================

  const dailySnapshotColumns = [
    { key: "metric", header: "Metric", sortable: true, render: (value: unknown) => (
      <span className={String(value) === 'Total' ? 'font-bold' : ''}>{String(value).toUpperCase()}</span>
    )},
    { key: "today", header: "Today", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "yesterday", header: "Yesterday", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "change", header: "Change", render: (_: unknown, row: DailySnapshot) => (
      <ChangeCell current={row.today} previous={row.yesterday} />
    )},
  ]

  const trendsColumns = [
    { key: "metric", header: "Metric", sortable: true, render: (value: unknown) => (
      <span className={String(value) === 'Total' ? 'font-bold' : ''}>{String(value).toUpperCase()}</span>
    )},
    { key: "this_week", header: "This Week", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "last_week", header: "Last Week", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "wow_change", header: "WoW Change", render: (_: unknown, row: TrendsData) => (
      <ChangeCell current={row.this_week} previous={row.last_week} />
    )},
    { key: "mtd", header: "MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_mtd", header: "Prev MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "mom_change", header: "MoM Change", render: (_: unknown, row: TrendsData) => (
      <ChangeCell current={row.mtd} previous={row.prev_mtd} />
    )},
  ]

  const providerColumns = [
    { key: "provider", header: "Provider", sortable: true, render: (value: unknown) => (
      <Badge variant="outline">{String(value).toUpperCase()}</Badge>
    )},
    { key: "cost", header: "Cost", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "today", header: "Today", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "yesterday", header: "Yesterday", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "day_change", header: "Change", render: (_: unknown, row: ProviderCost) => (
      <ChangeCell current={row.today} previous={row.yesterday} />
    )},
    { key: "last_7d", header: "Last 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_7d", header: "Prev 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "wow", header: "WoW", render: (_: unknown, row: ProviderCost) => (
      <ChangeCell current={row.last_7d} previous={row.prev_7d} />
    )},
    { key: "mtd", header: "MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_mtd", header: "Prev MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "mom", header: "MoM", render: (_: unknown, row: ProviderCost) => (
      <ChangeCell current={row.mtd} previous={row.prev_mtd} />
    )},
  ]

  const serviceColumns = [
    { key: "service", header: "Service", sortable: true },
    { key: "cost", header: "Cost", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "today", header: "Today", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "yesterday", header: "Yesterday", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "day_change", header: "Change", render: (_: unknown, row: ServiceCost) => (
      <ChangeCell current={row.today} previous={row.yesterday} />
    )},
    { key: "last_7d", header: "Last 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_7d", header: "Prev 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "wow", header: "WoW", render: (_: unknown, row: ServiceCost) => (
      <ChangeCell current={row.last_7d} previous={row.prev_7d} />
    )},
    { key: "mtd", header: "MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_mtd", header: "Prev MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "mom", header: "MoM", render: (_: unknown, row: ServiceCost) => (
      <ChangeCell current={row.mtd} previous={row.prev_mtd} />
    )},
  ]

  const awsAccountColumns = [
    { key: "account_name", header: "Account", sortable: true },
    { key: "cost", header: "Cost", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "today", header: "Today", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "yesterday", header: "Yesterday", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "day_change", header: "Change", render: (_: unknown, row: AWSAccount) => (
      <ChangeCell current={row.today} previous={row.yesterday} />
    )},
    { key: "last_7d", header: "Last 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_7d", header: "Prev 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "wow", header: "WoW", render: (_: unknown, row: AWSAccount) => (
      <ChangeCell current={row.last_7d} previous={row.prev_7d} />
    )},
    { key: "mtd", header: "MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_mtd", header: "Prev MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "mom", header: "MoM", render: (_: unknown, row: AWSAccount) => (
      <ChangeCell current={row.mtd} previous={row.prev_mtd} />
    )},
  ]

  const pocCustomerColumns = [
    { key: "customer", header: "Customer", sortable: true },
    { key: "owner", header: "Owner", sortable: true },
    { key: "provider", header: "Provider", sortable: true, render: (value: unknown) => (
      <Badge variant={String(value).toLowerCase() === 'aws' ? 'default' : String(value).toLowerCase() === 'gcp' ? 'secondary' : 'outline'}>
        {String(value).toUpperCase()}
      </Badge>
    )},
    { key: "cost", header: "Cost", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "today", header: "Today", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "yesterday", header: "Yesterday", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "day_change", header: "Change", render: (_: unknown, row: POCCustomer) => (
      <ChangeCell current={row.today} previous={row.yesterday} />
    )},
    { key: "last_7d", header: "Last 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_7d", header: "Prev 7D", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "wow", header: "WoW", render: (_: unknown, row: POCCustomer) => (
      <ChangeCell current={row.last_7d} previous={row.prev_7d} />
    )},
    { key: "mtd", header: "MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_mtd", header: "Prev MTD", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "mom", header: "MoM", render: (_: unknown, row: POCCustomer) => (
      <ChangeCell current={row.mtd} previous={row.prev_mtd} />
    )},
  ]

  // ============================================
  // LOADING STATE
  // ============================================

  if (budgetLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cloud Cost Report</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Live</span>
          </div>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Hero: Today's Total Spend */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Total Cloud Spend</p>
          <p className="text-5xl font-bold mt-2">{formatCurrency(dailyTotal?.today || 0)}</p>
        </CardContent>
      </Card>

      {/* Monthly Budget Target Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🎯</span> Monthly Budget Target: {formatCurrency(MONTHLY_BUDGET)}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Our goal is to maintain cloud spend at {formatCurrency(MONTHLY_BUDGET)} per month. Below is our current performance against this target.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BudgetCard
            title="Daily Target vs Actual"
            actual={budget?.today_spend || 0}
            target={dailyTarget}
          />
          <BudgetCard
            title="Weekly Target vs Actual (Last 7 Days)"
            actual={budget?.last_7d_spend || 0}
            target={weeklyTarget}
          />
          <BudgetCard
            title="Month-to-Date Progress"
            actual={budget?.mtd_spend || 0}
            target={mtdTarget}
            subtitle={`Day ${dayOfMonth} of ${daysInMonth} • Target: ${formatCurrency(mtdTarget)}`}
          />
          <Card className="relative overflow-hidden">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Projected Monthly Spend</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(projectedMonthly)}</p>
              <p className="text-xs text-muted-foreground mt-1">Based on current daily average</p>
              <p className={`text-sm font-medium mt-2 ${projectedMonthly > MONTHLY_BUDGET ? 'text-red-500' : 'text-green-600'}`}>
                {projectedMonthly > MONTHLY_BUDGET ? (
                  <>{formatCurrency(projectedMonthly - MONTHLY_BUDGET)} over budget</>
                ) : (
                  <>{formatCurrency(MONTHLY_BUDGET - projectedMonthly)} under budget</>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Executive Summary */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span> Executive Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonCard
            title="Today vs Yesterday"
            current={execSummary?.today || 0}
            previous={execSummary?.yesterday || 0}
          />
          <ComparisonCard
            title="This Week vs Last Week"
            current={execSummary?.this_week || 0}
            previous={execSummary?.last_week || 0}
          />
          <ComparisonCard
            title="This Week vs Same Week Last Month"
            current={execSummary?.this_week || 0}
            previous={execSummary?.same_week_last_month || 0}
          />
          <ComparisonCard
            title="MTD vs Same Period Last Month"
            current={execSummary?.mtd || 0}
            previous={execSummary?.same_period_last_month || 0}
          />
        </div>
      </div>

      {/* Daily Snapshot Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Snapshot</CardTitle>
          <CardDescription>Today vs Yesterday spending by provider</CardDescription>
        </CardHeader>
        <CardContent>
          {dailySnapshotWithTotal.length > 0 ? (
            <DataTable
              data={dailySnapshotWithTotal}
              columns={dailySnapshotColumns}
              hoverable
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trends Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
          <CardDescription>Week-over-week and month-over-month comparisons</CardDescription>
        </CardHeader>
        <CardContent>
          {trendsWithTotal.length > 0 ? (
            <DataTable
              data={trendsWithTotal}
              columns={trendsColumns}
              hoverable
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost by Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">🌐</span> Cost by Provider
          </CardTitle>
          <CardDescription>Detailed cost breakdown by cloud provider</CardDescription>
        </CardHeader>
        <CardContent>
          {providerCostData && providerCostData.length > 0 ? (
            <DataTable
              data={providerCostData}
              columns={providerColumns}
              hoverable
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Cost Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cost Trend</CardTitle>
          <CardDescription>Daily cloud spend over the last 14 days</CardDescription>
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

      {/* AWS Account Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">☁️</span> AWS Account Breakdown
        </h2>
        <Card>
          <CardContent className="pt-6">
            {awsAccountsData && awsAccountsData.length > 0 ? (
              <DataTable
                data={awsAccountsData}
                columns={awsAccountColumns}
                hoverable
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Services</CardTitle>
          <CardDescription>Highest cost services across all providers</CardDescription>
        </CardHeader>
        <CardContent>
          {topServicesData && topServicesData.length > 0 ? (
            <DataTable
              data={topServicesData}
              columns={serviceColumns}
              hoverable
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Report Generated: {new Date().toLocaleString()}
      </p>
    </div>
  )
}
