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
} from "e6ds"
import {
  InfoPopover,
  TableSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
} from "@/components"
import { Users, TrendingUp, ArrowRight } from "lucide-react"
import { useDate } from "@/components/providers"
import { useQuery, formatCurrency } from "@/hooks/useQuery"

export default function ServiceCustomersPage() {
  const params = useParams()
  const provider = (params.provider as string).toUpperCase()
  const accountId = decodeURIComponent(params.account as string)
  const service = decodeURIComponent(params.service as string)
  const { timeRange } = useDate()

  // Vantage data is 1 day delayed
  const vantageDate = useMemo(() => {
    const selected = timeRange?.from || new Date()
    const yesterday = new Date(selected)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }, [timeRange])

  const { data: customersData, loading: customersLoading, error: customersError, refetch: refetchCustomers } =
    useQuery("vantage", "getCustomersByService", [provider.toLowerCase(), accountId, service, vantageDate], { refetchInterval: 300000 })

  const customersWithTotals = useMemo(() => {
    if (!customersData?.length) return { customers: [], totals: null }
    const totals = {
      customer: "TOTAL",
      today: sumBy(customersData, r => Number(r.today) || 0),
      last_7d: sumBy(customersData, r => Number(r.last_7d) || 0),
      last_30d: sumBy(customersData, r => Number(r.last_30d) || 0),
    }
    return { customers: customersData, totals }
  }, [customersData])


  // Convert customer tag value to E6 database name format
  const getE6DatabaseName = (customer: string) => {
    // Convert customer names like "CondeNast" -> "condenast", "Fresh Works" -> "freshworks"
    return customer.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')
  }

  return (
    <div className="space-y-8">
      <DateBanner />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{service} Customers</h1>
        <p className="text-muted-foreground mt-1">
          {provider} / <Badge variant="outline">{accountId}</Badge>
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {customersLoading ? (
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
        ) : customersWithTotals.totals ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(customersWithTotals.totals.today)}</p>
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
                    <p className="text-2xl font-bold">{formatCurrency(customersWithTotals.totals.last_7d)}</p>
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
                    <p className="text-2xl font-bold">{formatCurrency(customersWithTotals.totals.last_30d)}</p>
                    <p className="text-sm text-muted-foreground">Last 30 Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Customers</CardTitle>
            <InfoPopover
              title="Customers"
              description="Click on a customer to view their E6 usage dashboard with detailed metrics."
            />
          </div>
          <CardDescription>Click a customer to view E6 usage dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          {customersLoading ? (
            <TableSkeleton rows={5} />
          ) : customersError ? (
            <QueryError message={customersError} onRetry={refetchCustomers} />
          ) : customersWithTotals.customers.length > 0 ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-2">Customer</div>
                <div className="text-right">Today</div>
                <div className="text-right">Last 7D</div>
                <div className="text-right">Last 30D</div>
              </div>
              {/* Customer rows */}
              {customersWithTotals.customers.map((row: Record<string, unknown>) => {
                const customerName = String(row.customer || row.tag_value || "Unknown")
                const e6DbName = getE6DatabaseName(customerName)

                return (
                  <Link
                    key={customerName}
                    href={`/e6/${e6DbName}`}
                    className="grid grid-cols-5 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors items-center group"
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{customerName}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          View E6 Dashboard
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-medium">{formatCurrency(Number(row.today))}</div>
                    <div className="text-right">{formatCurrency(Number(row.last_7d))}</div>
                    <div className="text-right font-medium">{formatCurrency(Number(row.last_30d))}</div>
                  </Link>
                )
              })}
              {/* Totals row */}
              {customersWithTotals.totals && (
                <div className="grid grid-cols-5 gap-4 px-4 py-3 border-t font-bold bg-muted/30">
                  <div className="col-span-2">TOTAL</div>
                  <div className="text-right">{formatCurrency(customersWithTotals.totals.today)}</div>
                  <div className="text-right">{formatCurrency(customersWithTotals.totals.last_7d)}</div>
                  <div className="text-right">{formatCurrency(customersWithTotals.totals.last_30d)}</div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="No customers found for this service" size="sm" />
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium">E6 Usage Dashboard</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click on any customer to view their detailed E6 usage metrics, including cluster performance,
                query statistics, container resources, and more.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
