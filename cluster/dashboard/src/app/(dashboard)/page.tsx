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
  InfoPopover,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
} from "@/components"
import { useDate } from "@/components/providers"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"

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

  const { data: providerCostData, loading: providerLoading, error: providerError, refetch: refetchProvider } = useQuery("vantage", "getCostByProvider", [selectedDate], { refetchInterval: 300000 })
  const { data: topServicesData, loading: servicesLoading, error: servicesError, refetch: refetchServices } = useQuery("vantage", "getTopServices", [selectedDate, 10], { refetchInterval: 300000 })
  const { data: dailyCostTrend, loading: trendLoading, error: trendError, refetch: refetchTrend } = useQuery("vantage", "getDailyCostTrend", [selectedDate], { refetchInterval: 300000 })

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
    { key: "provider", header: "Provider", render: (v: unknown, r: Record<string, unknown>) => (
      r.provider === "TOTAL" ? <span className="font-bold">{String(v)}</span> : <Badge variant="outline">{String(v).toUpperCase()}</Badge>
    )},
    { key: "today", header: `Today (${dateLabels.today})`, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "yesterday", header: `Yesterday (${dateLabels.yesterday})`, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "last_7d", header: `Last 7D (${dateLabels.last7d})`, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "mtd", header: `MTD (${dateLabels.mtd})`, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
    { key: "prev_mtd", header: `Prev MTD (${dateLabels.prevMtd})`, render: (v: unknown, r: Record<string, unknown>) => (
      <span className={r.provider === "TOTAL" ? "font-bold" : ""}>{formatCurrency(Number(v))}</span>
    )},
  ]

  const serviceColumns = [
    { key: "service", header: "Service" },
    { key: "today", header: `Today (${dateLabels.today})`, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "yesterday", header: `Yesterday (${dateLabels.yesterday})`, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "last_7d", header: `Last 7D (${dateLabels.last7d})`, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "mtd", header: `MTD (${dateLabels.mtd})`, render: (v: unknown) => formatCurrency(Number(v)) },
    { key: "prev_mtd", header: `Prev MTD (${dateLabels.prevMtd})`, render: (v: unknown) => formatCurrency(Number(v)) },
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
            <EmptyState title="No data available" size="sm" />
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
            <EmptyState title="No data available" size="sm" />
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
            <EmptyState title="No data available" size="sm" />
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
