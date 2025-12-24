"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  BarChart,
  Skeleton,
  Badge,
} from "laminar-ui"
import {
  TimeRangePicker,
  ComparisonCard,
  ChangeBadge,
  InfoPopover,
  type DateRange,
} from "@/components/shared"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"
import { overviewQueries } from "@/lib/queries"

// ============================================
// TYPE DEFINITIONS
// ============================================

interface DailyCost {
  date: string
  cost: number
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
  const [timeRange, setTimeRange] = useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: today }
  })

  // Format selected date for SQL queries (YYYY-MM-DD)
  const selectedDate = useMemo(() => {
    if (!timeRange?.from) return new Date().toISOString().split('T')[0]
    return timeRange.from.toISOString().split('T')[0]
  }, [timeRange])

  // Compute date labels for display
  const dateLabels = useMemo(() => {
    const selected = timeRange?.from || new Date()
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const fmtFull = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const yesterday = new Date(selected)
    yesterday.setDate(yesterday.getDate() - 1)

    const weekStart = new Date(selected)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of current week (Sunday)

    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(weekStart)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

    const sameWeekLastMonthStart = new Date(selected)
    sameWeekLastMonthStart.setDate(sameWeekLastMonthStart.getDate() - 28)
    const sameWeekLastMonthEnd = new Date(selected)
    sameWeekLastMonthEnd.setDate(sameWeekLastMonthEnd.getDate() - 21)

    const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1)
    const prevMonthStart = new Date(selected.getFullYear(), selected.getMonth() - 1, 1)
    const dayOfMonth = selected.getDate()
    const prevMonthSameDay = new Date(selected.getFullYear(), selected.getMonth() - 1, dayOfMonth)

    const last7dStart = new Date(selected)
    last7dStart.setDate(last7dStart.getDate() - 6)
    const prev7dStart = new Date(selected)
    prev7dStart.setDate(prev7dStart.getDate() - 13)
    const prev7dEnd = new Date(selected)
    prev7dEnd.setDate(prev7dEnd.getDate() - 7)

    return {
      today: fmt(selected),
      yesterday: fmt(yesterday),
      thisWeek: `${fmt(weekStart)} - ${fmt(selected)}`,
      lastWeek: `${fmt(lastWeekStart)} - ${fmt(lastWeekEnd)}`,
      sameWeekLastMonth: `${fmt(sameWeekLastMonthStart)} - ${fmt(sameWeekLastMonthEnd)}`,
      mtd: `${fmt(monthStart)} - ${fmt(selected)}`,
      prevMtd: `${fmt(prevMonthStart)} - ${fmt(prevMonthSameDay)}`,
      last7d: `${fmt(last7dStart)} - ${fmt(selected)}`,
      prev7d: `${fmt(prev7dStart)} - ${fmt(prev7dEnd)}`,
    }
  }, [timeRange])

  // Fetch executive summary
  const { data: execSummaryData } = useQuery<ExecutiveSummary>(
    "vantage",
    overviewQueries.executiveSummary(selectedDate),
    { refetchInterval: 300000 }
  )

  // Fetch cost by provider full
  const { data: providerCostData } = useQuery<ProviderCost>(
    "vantage",
    overviewQueries.costByProviderFull(selectedDate),
    { refetchInterval: 300000 }
  )

  // Fetch top services
  const { data: topServicesData } = useQuery<ServiceCost>(
    "vantage",
    overviewQueries.topServicesFull(selectedDate),
    { refetchInterval: 300000 }
  )

  // Fetch daily cost trend
  const { data: dailyCostTrend } = useQuery<DailyCost>(
    "vantage",
    overviewQueries.dailyCostTrendByDate(selectedDate),
    { refetchInterval: 300000 }
  )

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const execSummary = execSummaryData?.[0]

  // Provider cost data with totals row
  const providerCostWithTotals = useMemo(() => {
    if (!providerCostData || providerCostData.length === 0) return []

    const totals: ProviderCost = {
      provider: "TOTAL",
      cost: 0,
      today: 0,
      yesterday: 0,
      last_7d: 0,
      prev_7d: 0,
      mtd: 0,
      prev_mtd: 0,
    }

    providerCostData.forEach(row => {
      totals.cost += Number(row.cost) || 0
      totals.today += Number(row.today) || 0
      totals.yesterday += Number(row.yesterday) || 0
      totals.last_7d += Number(row.last_7d) || 0
      totals.prev_7d += Number(row.prev_7d) || 0
      totals.mtd += Number(row.mtd) || 0
      totals.prev_mtd += Number(row.prev_mtd) || 0
    })

    return [...providerCostData, totals]
  }, [providerCostData])

  // Daily cost chart data
  const dailyCostChartData = useMemo(() => {
    if (!dailyCostTrend) return []
    return dailyCostTrend.map(item => ({
      date: formatDate(item.date),
      cost: item.cost,
    }))
  }, [dailyCostTrend])

  // ============================================
  // COLUMN DEFINITIONS
  // ============================================

  const providerColumns = [
    { key: "provider", header: "Provider", sortable: true, render: (value: unknown, row: ProviderCost) => (
      row.provider === "TOTAL"
        ? <span className="font-bold">{String(value)}</span>
        : <Badge variant="outline">{String(value).toUpperCase()}</Badge>
    )},
    { key: "today", header: `Today (${dateLabels.today})`, sortable: true, render: (value: unknown, row: ProviderCost) => (
      <span className={row.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(value))}</span>
    )},
    { key: "yesterday", header: `Yesterday (${dateLabels.yesterday})`, sortable: true, render: (value: unknown, row: ProviderCost) => (
      <span className={row.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(value))}</span>
    )},
    { key: "day_change", header: "DoD", render: (_: unknown, row: ProviderCost) => (
      <ChangeCell current={row.today} previous={row.yesterday} />
    )},
    { key: "last_7d", header: `Last 7D (${dateLabels.last7d})`, sortable: true, render: (value: unknown, row: ProviderCost) => (
      <span className={row.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(value))}</span>
    )},
    { key: "mtd", header: `MTD (${dateLabels.mtd})`, sortable: true, render: (value: unknown, row: ProviderCost) => (
      <span className={row.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(value))}</span>
    )},
    { key: "prev_mtd", header: `Prev MTD (${dateLabels.prevMtd})`, sortable: true, render: (value: unknown, row: ProviderCost) => (
      <span className={row.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(value))}</span>
    )},
    { key: "mom", header: "MoM", render: (_: unknown, row: ProviderCost) => (
      <ChangeCell current={row.mtd} previous={row.prev_mtd} />
    )},
  ]

  const serviceColumns = [
    { key: "service", header: "Service", sortable: true },
    { key: "today", header: `Today (${dateLabels.today})`, sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "yesterday", header: `Yesterday (${dateLabels.yesterday})`, sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "day_change", header: "DoD", render: (_: unknown, row: ServiceCost) => (
      <ChangeCell current={row.today} previous={row.yesterday} />
    )},
    { key: "last_7d", header: `Last 7D (${dateLabels.last7d})`, sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "mtd", header: `MTD (${dateLabels.mtd})`, sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "prev_mtd", header: `Prev MTD (${dateLabels.prevMtd})`, sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
    { key: "mom", header: "MoM", render: (_: unknown, row: ServiceCost) => (
      <ChangeCell current={row.mtd} previous={row.prev_mtd} />
    )},
  ]

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
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonCard
            title="Today vs Yesterday"
            current={execSummary?.today || 0}
            previous={execSummary?.yesterday || 0}
            currentLabel={dateLabels.today}
            previousLabel={dateLabels.yesterday}
            description="Compares total cloud spend for the selected date against the previous day."
            sql={overviewQueries.todayVsYesterdaySql(selectedDate)}
          />
          <ComparisonCard
            title="This Week vs Last Week"
            current={execSummary?.this_week || 0}
            previous={execSummary?.last_week || 0}
            currentLabel={dateLabels.thisWeek}
            previousLabel={dateLabels.lastWeek}
            description="Compares week-to-date spend (from start of current week) against the full previous week."
            sql={overviewQueries.thisWeekVsLastWeekSql(selectedDate)}
          />
          <ComparisonCard
            title="This Week vs Same Week Last Month"
            current={execSummary?.this_week || 0}
            previous={execSummary?.same_week_last_month || 0}
            currentLabel={dateLabels.thisWeek}
            previousLabel={dateLabels.sameWeekLastMonth}
            description="Compares week-to-date spend against the same week (approximately 4 weeks ago) from last month."
            sql={overviewQueries.thisWeekVsSameWeekLastMonthSql(selectedDate)}
          />
          <ComparisonCard
            title="MTD vs Same Period Last Month"
            current={execSummary?.mtd || 0}
            previous={execSummary?.same_period_last_month || 0}
            currentLabel={dateLabels.mtd}
            previousLabel={dateLabels.prevMtd}
            description="Compares month-to-date spend against the same number of days in the previous month."
            sql={overviewQueries.mtdVsSamePeriodLastMonthSql(selectedDate)}
          />
        </div>
      </div>

      {/* Costs by Cloud Provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Costs by Cloud Provider</CardTitle>
            <InfoPopover
              title="Costs by Cloud Provider"
              description="Breakdown of cloud costs by provider (AWS, GCP, Azure, etc.). Shows today's cost, yesterday's cost, day-over-day change, last 7 days total, month-to-date, previous month-to-date, and month-over-month change."
              sql={overviewQueries.costByProviderFull(selectedDate)}
            />
          </div>
          <CardDescription>Cost breakdown by cloud provider with daily, weekly, and monthly comparisons</CardDescription>
        </CardHeader>
        <CardContent>
          {providerCostWithTotals && providerCostWithTotals.length > 0 ? (
            <DataTable
              data={providerCostWithTotals}
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
          <div className="flex items-center gap-2">
            <CardTitle>Daily Cost Trend</CardTitle>
            <InfoPopover
              title="Daily Cost Trend"
              description="Bar chart showing daily total cloud spend over the last 30 days ending on the selected date. Helps visualize spending patterns and identify anomalies."
              sql={overviewQueries.dailyCostTrendByDate(selectedDate)}
            />
          </div>
          <CardDescription>Daily cloud spend over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyCostChartData.length > 0 ? (
            <BarChart
              data={dailyCostChartData}
              xAxisKey="date"
              bars={[
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

      {/* Top Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Top 10 Services</CardTitle>
            <InfoPopover
              title="Top 10 Services"
              description="Shows the 10 highest cost services across all cloud providers. Includes daily, weekly, and monthly cost breakdowns with period-over-period comparisons."
              sql={overviewQueries.topServicesFull(selectedDate)}
            />
          </div>
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
