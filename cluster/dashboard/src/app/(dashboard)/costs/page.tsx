"use client"

import { useMemo } from "react"
import Link from "next/link"
import { sumBy } from "lodash-es"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
  BarChart,
  ResponsiveContainer,
} from "e6ds"
import {
  InfoPopover,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
} from "@/components"
import { DollarSign, Calendar, CalendarDays, CalendarRange, ChevronRight, Cloud } from "lucide-react"
import { useDate } from "@/components/providers"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"

export default function CostDashboardPage() {
  const { timeRange } = useDate()

  // Vantage data is 1 day delayed, so we use yesterday's date for queries
  const vantageDate = useMemo(() => {
    const selected = timeRange?.from || new Date()
    const yesterday = new Date(selected)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }, [timeRange])

  const dateLabels = useMemo(() => {
    const selected = new Date(vantageDate)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }

    const yesterday = addDays(selected, -1)
    const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1)
    const last7dStart = addDays(selected, -6)

    return {
      today: fmt(selected),
      yesterday: fmt(yesterday),
      last7d: `${fmt(last7dStart)} - ${fmt(selected)}`,
      mtd: `${fmt(monthStart)} - ${fmt(selected)}`,
    }
  }, [vantageDate])

  const { data: execSummaryData, loading: execLoading, error: execError } = useQuery("vantage", "getExecutiveSummary", [vantageDate], { refetchInterval: 300000 })
  const { data: providerCostData, loading: providerLoading, error: providerError, refetch: refetchProvider } = useQuery("vantage", "getCostByProvider", [vantageDate], { refetchInterval: 300000 })
  const { data: dailyCostTrend, loading: trendLoading, error: trendError, refetch: refetchTrend } = useQuery("vantage", "getDailyCostTrend", [vantageDate], { refetchInterval: 300000 })

  const execSummary = execSummaryData?.[0] as Record<string, number> | undefined

  const providerCostWithTotals = useMemo(() => {
    if (!providerCostData?.length) return { providers: [], totals: null }
    const totals = {
      provider: "TOTAL",
      today: sumBy(providerCostData, r => Number(r.today) || 0),
      yesterday: sumBy(providerCostData, r => Number(r.yesterday) || 0),
      last_7d: sumBy(providerCostData, r => Number(r.last_7d) || 0),
      mtd: sumBy(providerCostData, r => Number(r.mtd) || 0),
    }
    return { providers: providerCostData, totals }
  }, [providerCostData])

  const dailyCostChartData = useMemo(() => {
    return (dailyCostTrend || []).map((item: Record<string, unknown>) => ({
      date: formatDate(item.date as string),
      cost: Number(item.cost) || 0,
    }))
  }, [dailyCostTrend])


  return (
    <div className="space-y-8">
      <DateBanner />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Cost Dashboard</h1>
        <p className="text-muted-foreground mt-1">Cloud cost overview by provider</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {execLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : execError ? (
          <Card className="col-span-4">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Failed to load summary stats
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(execSummary?.today || 0)}</p>
                    <p className="text-sm text-muted-foreground">Today ({dateLabels.today})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Calendar className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(execSummary?.yesterday || 0)}</p>
                    <p className="text-sm text-muted-foreground">Yesterday ({dateLabels.yesterday})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(execSummary?.this_week || 0)}</p>
                    <p className="text-sm text-muted-foreground">Last 7D ({dateLabels.last7d})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <CalendarRange className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(execSummary?.mtd || 0)}</p>
                    <p className="text-sm text-muted-foreground">MTD ({dateLabels.mtd})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Provider Cost Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            <CardTitle>Costs by Cloud Provider</CardTitle>
            <InfoPopover
              title="Costs by Cloud Provider"
              description="Click on a provider to see account-level cost breakdown. Drill down through accounts, services, and customers."
            />
          </div>
          <CardDescription>Click a provider to drill down into accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {providerLoading ? (
            <TableSkeleton rows={5} />
          ) : providerError ? (
            <QueryError message={providerError} onRetry={refetchProvider} />
          ) : providerCostWithTotals.providers.length > 0 ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-6 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div>Provider</div>
                <div className="text-right">Today</div>
                <div className="text-right">Yesterday</div>
                <div className="text-right">Last 7D</div>
                <div className="text-right">MTD</div>
                <div></div>
              </div>
              {/* Provider rows */}
              {providerCostWithTotals.providers.map((row: Record<string, unknown>) => (
                <Link
                  key={String(row.provider)}
                  href={`/costs/${String(row.provider).toLowerCase()}`}
                  className="grid grid-cols-6 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors items-center group"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{String(row.provider).toUpperCase()}</Badge>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(Number(row.today))}</div>
                  <div className="text-right">{formatCurrency(Number(row.yesterday))}</div>
                  <div className="text-right">{formatCurrency(Number(row.last_7d))}</div>
                  <div className="text-right font-medium">{formatCurrency(Number(row.mtd))}</div>
                  <div className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors inline" />
                  </div>
                </Link>
              ))}
              {/* Totals row */}
              {providerCostWithTotals.totals && (
                <div className="grid grid-cols-6 gap-4 px-4 py-3 border-t font-bold bg-muted/30">
                  <div>TOTAL</div>
                  <div className="text-right">{formatCurrency(providerCostWithTotals.totals.today)}</div>
                  <div className="text-right">{formatCurrency(providerCostWithTotals.totals.yesterday)}</div>
                  <div className="text-right">{formatCurrency(providerCostWithTotals.totals.last_7d)}</div>
                  <div className="text-right">{formatCurrency(providerCostWithTotals.totals.mtd)}</div>
                  <div></div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="No provider data available" size="sm" />
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
              description="Total cloud spend over the last 30 days across all providers."
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
            <EmptyState title="No trend data available" size="sm" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
