"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
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
} from "e6ds"
import {
  InfoPopover,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
} from "@/components"
import { Server, ChevronRight, TrendingUp } from "lucide-react"
import { useDate } from "@/components/providers"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"

export default function AccountServicesPage() {
  const params = useParams()
  const provider = (params.provider as string).toUpperCase()
  const accountId = decodeURIComponent(params.account as string)
  const { timeRange } = useDate()

  // Vantage data is 1 day delayed
  const vantageDate = useMemo(() => {
    const selected = timeRange?.from || new Date()
    const yesterday = new Date(selected)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }, [timeRange])

  const { data: servicesData, loading: servicesLoading, error: servicesError, refetch: refetchServices } =
    useQuery("vantage", "getServicesByProviderAccount", [provider.toLowerCase(), accountId, vantageDate], { refetchInterval: 300000 })

  const { data: trendData, loading: trendLoading, error: trendError, refetch: refetchTrend } =
    useQuery("vantage", "getAccountCostTrend", [provider.toLowerCase(), accountId, vantageDate], { refetchInterval: 300000 })

  const servicesWithTotals = useMemo(() => {
    if (!servicesData?.length) return { services: [], totals: null }
    const totals = {
      service: "TOTAL",
      today: sumBy(servicesData, r => Number(r.today) || 0),
      last_7d: sumBy(servicesData, r => Number(r.last_7d) || 0),
      last_30d: sumBy(servicesData, r => Number(r.last_30d) || 0),
    }
    return { services: servicesData, totals }
  }, [servicesData])

  const trendChartData = useMemo(() => {
    return (trendData || []).map((item: Record<string, unknown>) => ({
      date: formatDate(item.date as string),
      cost: Number(item.cost) || 0,
    }))
  }, [trendData])


  return (
    <div className="space-y-8">
      <DateBanner />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{provider} Account Services</h1>
        <p className="text-muted-foreground mt-1">
          <Badge variant="outline">{accountId}</Badge>
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {servicesLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : servicesWithTotals.totals ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(servicesWithTotals.totals.today)}</p>
                    <p className="text-sm text-muted-foreground">Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(servicesWithTotals.totals.last_7d)}</p>
                    <p className="text-sm text-muted-foreground">Last 7 Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(servicesWithTotals.totals.last_30d)}</p>
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <CardTitle>Services</CardTitle>
            <InfoPopover
              title="Services"
              description="Click on a service to see customer-level cost breakdown."
            />
          </div>
          <CardDescription>Click a service to drill down into customers</CardDescription>
        </CardHeader>
        <CardContent>
          {servicesLoading ? (
            <TableSkeleton rows={5} />
          ) : servicesError ? (
            <QueryError message={servicesError} onRetry={refetchServices} />
          ) : servicesWithTotals.services.length > 0 ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-2">Service</div>
                <div className="text-right">Today</div>
                <div className="text-right">Last 7D</div>
                <div className="text-right">Last 30D</div>
              </div>
              {/* Service rows */}
              {servicesWithTotals.services.map((row: Record<string, unknown>) => (
                <Link
                  key={String(row.service)}
                  href={`/costs/${provider.toLowerCase()}/${encodeURIComponent(accountId)}/${encodeURIComponent(String(row.service))}`}
                  className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors items-center group"
                >
                  <div className="col-span-2">
                    <span className="font-medium">{String(row.service)}</span>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(Number(row.today))}</div>
                  <div className="text-right">{formatCurrency(Number(row.last_7d))}</div>
                  <div className="text-right font-medium">{formatCurrency(Number(row.last_30d))}</div>
                </Link>
              ))}
              {/* Totals row */}
              {servicesWithTotals.totals && (
                <div className="grid grid-cols-5 gap-4 px-4 py-3 border-t font-bold bg-muted/30">
                  <div className="col-span-2">TOTAL</div>
                  <div className="text-right">{formatCurrency(servicesWithTotals.totals.today)}</div>
                  <div className="text-right">{formatCurrency(servicesWithTotals.totals.last_7d)}</div>
                  <div className="text-right">{formatCurrency(servicesWithTotals.totals.last_30d)}</div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="No services found" size="sm" />
          )}
        </CardContent>
      </Card>

      {/* Daily Cost Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Account Daily Cost Trend</CardTitle>
            <InfoPopover
              title="Cost Trend"
              description="Daily spending for this account over the last 30 days."
            />
          </div>
          <CardDescription>Daily spend over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <ChartSkeleton height={300} />
          ) : trendError ? (
            <QueryError message={trendError} onRetry={refetchTrend} />
          ) : trendChartData.length > 0 ? (
            <BarChart
              data={trendChartData}
              xAxisKey="date"
              bars={[{ dataKey: "cost", name: "Cost", color: "var(--chart-2)" }]}
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
