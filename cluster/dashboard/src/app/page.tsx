"use client"

import { useMemo } from "react"
import { sumBy } from "lodash-es"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  BarChart,
  Badge,
} from "laminar-ui"
import {
  ComparisonCard,
  ChangeBadge,
  InfoPopover,
  ComparisonCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
} from "@/components/shared"
import { useDate } from "@/components/providers"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"

function ChangeCell({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-muted-foreground">-</span>
  const change = ((current - previous) / previous) * 100
  return <ChangeBadge value={change} />
}

export default function OverviewPage() {
  const { timeRange, selectedDate } = useDate()

  const dateLabels = useMemo(() => {
    const selected = timeRange?.from || new Date()
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

    const yesterday = addDays(selected, -1)
    const weekStart = addDays(selected, -selected.getDay())
    const lastWeekStart = addDays(weekStart, -7)
    const lastWeekEnd = addDays(weekStart, -1)
    const sameWeekLastMonthStart = addDays(selected, -28)
    const sameWeekLastMonthEnd = addDays(selected, -21)
    const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1)
    const prevMonthStart = new Date(selected.getFullYear(), selected.getMonth() - 1, 1)
    const prevMonthSameDay = new Date(selected.getFullYear(), selected.getMonth() - 1, selected.getDate())
    const last7dStart = addDays(selected, -6)
    const prev7dStart = addDays(selected, -13)
    const prev7dEnd = addDays(selected, -7)

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

  const { data: execSummaryData, loading: execLoading, error: execError, refetch: refetchExec } = useQuery("vantage", "getExecutiveSummary", [selectedDate], { refetchInterval: 300000 })
  const { data: providerCostData, loading: providerLoading, error: providerError, refetch: refetchProvider } = useQuery("vantage", "getCostByProvider", [selectedDate], { refetchInterval: 300000 })
  const { data: topServicesData, loading: servicesLoading, error: servicesError, refetch: refetchServices } = useQuery("vantage", "getTopServices", [selectedDate, 10], { refetchInterval: 300000 })
  const { data: dailyCostTrend, loading: trendLoading, error: trendError, refetch: refetchTrend } = useQuery("vantage", "getDailyCostTrend", [selectedDate], { refetchInterval: 300000 })

  const execSummary = execSummaryData?.[0] as Record<string, number> | undefined

  const providerCostWithTotals = useMemo(() => {
    if (!providerCostData?.length) return []
    const totals = {
      provider: "TOTAL",
      cost: sumBy(providerCostData, r => Number(r.cost) || 0),
      today: sumBy(providerCostData, r => Number(r.today) || 0),
      yesterday: sumBy(providerCostData, r => Number(r.yesterday) || 0),
      last_7d: sumBy(providerCostData, r => Number(r.last_7d) || 0),
      prev_7d: sumBy(providerCostData, r => Number(r.prev_7d) || 0),
      mtd: sumBy(providerCostData, r => Number(r.mtd) || 0),
      prev_mtd: sumBy(providerCostData, r => Number(r.prev_mtd) || 0),
    }
    return [...providerCostData, totals]
  }, [providerCostData])

  const dailyCostChartData = useMemo(() => {
    return (dailyCostTrend || []).map((item: Record<string, unknown>) => ({
      date: formatDate(item.date as string),
      cost: Number(item.cost) || 0,
    }))
  }, [dailyCostTrend])

  const providerColumns = [
    { key: "provider", header: "Provider", sortable: true, render: (v: unknown, r: Record<string, unknown>) => (
      r.provider === "TOTAL" ? <span className="font-bold">{String(v)}</span> : <Badge variant="outline">{String(v).toUpperCase()}</Badge>
    )},
    { key: "today", header: `Today (${dateLabels.today})`, sortable: true, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "yesterday", header: `Yesterday (${dateLabels.yesterday})`, sortable: true, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "day_change", header: "DoD", render: (_: unknown, r: Record<string, unknown>) => (
      <ChangeCell current={Number(r.today)} previous={Number(r.yesterday)} />
    )},
    { key: "last_7d", header: `Last 7D (${dateLabels.last7d})`, sortable: true, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "mtd", header: `MTD (${dateLabels.mtd})`, sortable: true, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "prev_mtd", header: `Prev MTD (${dateLabels.prevMtd})`, sortable: true, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "mom", header: "MoM", render: (_: unknown, r: Record<string, unknown>) => (
      <ChangeCell current={Number(r.mtd)} previous={Number(r.prev_mtd)} />
    )},
  ]

  const serviceColumns = [
    { key: "service", header: "Service", sortable: true },
    { key: "today", header: `Today (${dateLabels.today})`, sortable: true, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "yesterday", header: `Yesterday (${dateLabels.yesterday})`, sortable: true, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "day_change", header: "DoD", render: (_: unknown, r: Record<string, unknown>) => (
      <ChangeCell current={Number(r.today)} previous={Number(r.yesterday)} />
    )},
    { key: "last_7d", header: `Last 7D (${dateLabels.last7d})`, sortable: true, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "mtd", header: `MTD (${dateLabels.mtd})`, sortable: true, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "prev_mtd", header: `Prev MTD (${dateLabels.prevMtd})`, sortable: true, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "mom", header: "MoM", render: (_: unknown, r: Record<string, unknown>) => (
      <ChangeCell current={Number(r.mtd)} previous={Number(r.prev_mtd)} />
    )},
  ]

  return (
    <div className="space-y-8">
      <DateBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cloud Cost Report</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {execLoading ? (
          <>
            <ComparisonCardSkeleton />
            <ComparisonCardSkeleton />
            <ComparisonCardSkeleton />
            <ComparisonCardSkeleton />
          </>
        ) : execError ? (
          <Card className="col-span-4">
            <QueryError message={execError} onRetry={refetchExec} />
          </Card>
        ) : (
          <>
            <ComparisonCard
              title="Today vs Yesterday"
              current={execSummary?.today || 0}
              previous={execSummary?.yesterday || 0}
              currentLabel={dateLabels.today}
              previousLabel={dateLabels.yesterday}
              description="Compares total cloud spend for the selected date against the previous day."
            />
            <ComparisonCard
              title="This Week vs Last Week"
              current={execSummary?.this_week || 0}
              previous={execSummary?.last_week || 0}
              currentLabel={dateLabels.thisWeek}
              previousLabel={dateLabels.lastWeek}
              description="Compares week-to-date spend (from start of current week) against the full previous week."
            />
            <ComparisonCard
              title="This Week vs Same Week Last Month"
              current={execSummary?.this_week || 0}
              previous={execSummary?.same_week_last_month || 0}
              currentLabel={dateLabels.thisWeek}
              previousLabel={dateLabels.sameWeekLastMonth}
              description="Compares week-to-date spend against the same week (approximately 4 weeks ago) from last month."
            />
            <ComparisonCard
              title="MTD vs Same Period Last Month"
              current={execSummary?.mtd || 0}
              previous={execSummary?.same_period_last_month || 0}
              currentLabel={dateLabels.mtd}
              previousLabel={dateLabels.prevMtd}
              description="Compares month-to-date spend against the same number of days in the previous month."
            />
          </>
        )}
      </div>

      {/* Costs by Cloud Provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Costs by Cloud Provider</CardTitle>
            <InfoPopover
              title="Costs by Cloud Provider"
              description="Breakdown of cloud costs by provider (AWS, GCP, Azure, etc.). Shows today's cost, yesterday's cost, day-over-day change, last 7 days total, month-to-date, previous month-to-date, and month-over-month change."
            />
          </div>
          <CardDescription>Cost breakdown by cloud provider with daily, weekly, and monthly comparisons</CardDescription>
        </CardHeader>
        <CardContent>
          {providerLoading ? (
            <TableSkeleton rows={4} />
          ) : providerError ? (
            <QueryError message={providerError} onRetry={refetchProvider} />
          ) : providerCostWithTotals.length > 0 ? (
            <DataTable data={providerCostWithTotals} columns={providerColumns} hoverable />
          ) : (
            <EmptyState />
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
            />
          </div>
          <CardDescription>Daily cloud spend over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <ChartSkeleton height={300} />
          ) : trendError ? (
            <QueryError message={trendError} onRetry={refetchTrend} />
          ) : dailyCostChartData.length > 0 ? (
            <BarChart
              data={dailyCostChartData}
              xAxisKey="date"
              bars={[{ dataKey: "cost", name: "Cost", color: "var(--chart-1)" }]}
              height={300}
              yAxisFormatter={(value) => `$${value}`}
              tooltipFormatter={(value) => formatCurrency(Number(value))}
            />
          ) : (
            <EmptyState />
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
            />
          </div>
          <CardDescription>Highest cost services across all providers</CardDescription>
        </CardHeader>
        <CardContent>
          {servicesLoading ? (
            <TableSkeleton rows={10} />
          ) : servicesError ? (
            <QueryError message={servicesError} onRetry={refetchServices} />
          ) : topServicesData && topServicesData.length > 0 ? (
            <DataTable data={topServicesData} columns={serviceColumns} hoverable />
          ) : (
            <EmptyState />
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
