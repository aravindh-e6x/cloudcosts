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
import { Building2, ChevronRight, TrendingUp } from "lucide-react"
import { useDate } from "@/components/providers"
import { useQuery, formatCurrency, formatDate } from "@/hooks/useQuery"

export default function ProviderAccountsPage() {
  const params = useParams()
  const provider = (params.provider as string).toUpperCase()
  const { timeRange } = useDate()

  // Vantage data is 1 day delayed
  const vantageDate = useMemo(() => {
    const selected = timeRange?.from || new Date()
    const yesterday = new Date(selected)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }, [timeRange])

  const { data: accountsData, loading: accountsLoading, error: accountsError, refetch: refetchAccounts } =
    useQuery("vantage", "getAccountsByProvider", [provider.toLowerCase(), vantageDate], { refetchInterval: 300000 })

  const { data: trendData, loading: trendLoading, error: trendError, refetch: refetchTrend } =
    useQuery("vantage", "getProviderCostTrend", [provider.toLowerCase(), vantageDate], { refetchInterval: 300000 })

  const accountsWithTotals = useMemo(() => {
    if (!accountsData?.length) return { accounts: [], totals: null }
    const totals = {
      account_name: "TOTAL",
      today: sumBy(accountsData, r => Number(r.today) || 0),
      last_7d: sumBy(accountsData, r => Number(r.last_7d) || 0),
      last_30d: sumBy(accountsData, r => Number(r.last_30d) || 0),
    }
    return { accounts: accountsData, totals }
  }, [accountsData])

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
        <h1 className="text-3xl font-bold">{provider} Accounts</h1>
        <p className="text-muted-foreground mt-1">Cost breakdown by account</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {accountsLoading ? (
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
        ) : accountsWithTotals.totals ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(accountsWithTotals.totals.today)}</p>
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
                    <p className="text-2xl font-bold">{formatCurrency(accountsWithTotals.totals.last_7d)}</p>
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
                    <p className="text-2xl font-bold">{formatCurrency(accountsWithTotals.totals.last_30d)}</p>
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>Accounts</CardTitle>
            <InfoPopover
              title="Accounts"
              description="Click on an account to see service-level cost breakdown."
            />
          </div>
          <CardDescription>Click an account to drill down into services</CardDescription>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <TableSkeleton rows={5} />
          ) : accountsError ? (
            <QueryError message={accountsError} onRetry={refetchAccounts} />
          ) : accountsWithTotals.accounts.length > 0 ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-2">Account</div>
                <div className="text-right">Today</div>
                <div className="text-right">Last 7D</div>
                <div className="text-right">Last 30D</div>
              </div>
              {/* Account rows */}
              {accountsWithTotals.accounts.map((row: Record<string, unknown>) => (
                <Link
                  key={String(row.account_id)}
                  href={`/costs/${provider.toLowerCase()}/${encodeURIComponent(String(row.account_id))}`}
                  className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors items-center group"
                >
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{String(row.account_id).slice(-8)}</Badge>
                      <span className="text-sm text-muted-foreground truncate">
                        {String(row.account_name) || "Unnamed"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-medium">{formatCurrency(Number(row.today))}</div>
                  <div className="text-right">{formatCurrency(Number(row.last_7d))}</div>
                  <div className="text-right font-medium">{formatCurrency(Number(row.last_30d))}</div>
                </Link>
              ))}
              {/* Totals row */}
              {accountsWithTotals.totals && (
                <div className="grid grid-cols-5 gap-4 px-4 py-3 border-t font-bold bg-muted/30">
                  <div className="col-span-2">TOTAL</div>
                  <div className="text-right">{formatCurrency(accountsWithTotals.totals.today)}</div>
                  <div className="text-right">{formatCurrency(accountsWithTotals.totals.last_7d)}</div>
                  <div className="text-right">{formatCurrency(accountsWithTotals.totals.last_30d)}</div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="No accounts found" size="sm" />
          )}
        </CardContent>
      </Card>

      {/* Daily Cost Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{provider} Daily Cost Trend</CardTitle>
            <InfoPopover
              title="Cost Trend"
              description={`Daily spending for ${provider} over the last 30 days.`}
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
