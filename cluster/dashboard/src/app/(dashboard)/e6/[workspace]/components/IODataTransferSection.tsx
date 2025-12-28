"use client"

import { useMemo, useState } from "react"
import { HardDrive, ArrowDownToLine, ArrowUpFromLine, Info, Globe, Map, Layers } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Skeleton,
} from "e6ds"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { useQuery } from "@/hooks/useQuery"
import { format } from "date-fns"

interface IODataTransferSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

interface EgressCost {
  internet_egress: number
  region_egress: number
  zone_egress: number
}

interface TimeSeriesPoint {
  ts: string
  value: number
}

type MetricType = "internet" | "region" | "zone" | null

export function IODataTransferSection({ eksCluster, dateRange, selectedDate }: IODataTransferSectionProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null)

  // Fetch egress cost breakdown
  const { data: egressData, loading } = useQuery<EgressCost>(
    "workspace",
    "getEgressCost",
    [dateRange]
  )

  // Fetch time series for selected metric
  const { data: timeSeriesData } = useQuery<TimeSeriesPoint>(
    "workspace",
    "getIOTimeSeries",
    [selectedMetric, dateRange],
    { enabled: !!selectedMetric }
  )

  const rawEgress = egressData?.[0] || { internet_egress: 0, region_egress: 0, zone_egress: 0 }
  const egress = {
    internet_egress: rawEgress.internet_egress || 0,
    region_egress: rawEgress.region_egress || 0,
    zone_egress: rawEgress.zone_egress || 0,
  }
  const totalEgress = egress.internet_egress + egress.region_egress + egress.zone_egress

  // Format time series data for chart
  const chartData = useMemo(() => {
    if (!timeSeriesData?.length) return []
    return timeSeriesData.map((d) => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.value || 0,
    }))
  }, [timeSeriesData])

  const getMetricLabel = (metric: MetricType) => {
    switch (metric) {
      case "internet":
        return "Internet Egress"
      case "region":
        return "Cross-Region Egress"
      case "zone":
        return "Cross-Zone Egress"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-5 w-5" />
            IO & Data Transfer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-5 w-5" />
            Network Egress Costs
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">Network egress costs by destination type</p>
                <p className="text-xs text-muted-foreground mt-1">Metrics: kubecost_network_*_egress_cost</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50">
              <p className="text-2xl font-bold">${totalEgress.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Egress Cost</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric("internet")}
            >
              <div className="flex items-center justify-center gap-1">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">${egress.internet_egress.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Internet Egress</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric("region")}
            >
              <div className="flex items-center justify-center gap-1">
                <Map className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">${egress.region_egress.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Cross-Region</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric("zone")}
            >
              <div className="flex items-center justify-center gap-1">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">${egress.zone_egress.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Cross-Zone</p>
            </div>
          </div>

          {/* Egress breakdown bar */}
          {totalEgress > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">COST BREAKDOWN</div>
              <div className="flex h-4 overflow-hidden rounded">
                {egress.internet_egress > 0 && (
                  <div
                    className="bg-red-500"
                    style={{ width: `${(egress.internet_egress / totalEgress) * 100}%` }}
                    title={`Internet: $${egress.internet_egress.toFixed(2)}`}
                  />
                )}
                {egress.region_egress > 0 && (
                  <div
                    className="bg-orange-400"
                    style={{ width: `${(egress.region_egress / totalEgress) * 100}%` }}
                    title={`Region: $${egress.region_egress.toFixed(2)}`}
                  />
                )}
                {egress.zone_egress > 0 && (
                  <div
                    className="bg-green-500"
                    style={{ width: `${(egress.zone_egress / totalEgress) * 100}%` }}
                    title={`Zone: $${egress.zone_egress.toFixed(2)}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  Internet
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-400 rounded" />
                  Cross-Region
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  Cross-Zone
                </div>
              </div>
            </div>
          )}

          {totalEgress === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No egress cost data available for the selected time range
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4">Click any metric for hourly trend</p>
        </CardContent>
      </Card>

      {/* Time Series Modal */}
      <Dialog open={!!selectedMetric} onOpenChange={(open) => !open && setSelectedMetric(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {getMetricLabel(selectedMetric)} - Hourly - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No time series data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="time" tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                    formatter={(value) => [`$${(value as number).toFixed(2)}`, getMetricLabel(selectedMetric)]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} name={getMetricLabel(selectedMetric)} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
