"use client"

import { useMemo, useState } from "react"
import { HardDrive, ArrowDownToLine, ArrowUpFromLine, Info } from "lucide-react"
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

interface IODataTransferSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

// Mock data for IO metrics
const MOCK_IO_DATA = {
  s3_bytes_read: 156.4 * 1024 * 1024 * 1024, // 156.4 GB
  total_bytes_read: 312.8 * 1024 * 1024 * 1024, // 312.8 GB
  rows_read: 4_562_000_000, // 4.56B rows
  network_in: 89.2 * 1024 * 1024 * 1024, // 89.2 GB
  network_out: 42.6 * 1024 * 1024 * 1024, // 42.6 GB
}

// Mock data by E6 cluster
const MOCK_IO_BY_CLUSTER = [
  { e6_cluster: "prod-analytics", s3_gb: 98.2, network_in_gb: 56.4, network_out_gb: 28.1 },
  { e6_cluster: "prod-reporting", s3_gb: 48.7, network_in_gb: 26.8, network_out_gb: 12.3 },
  { e6_cluster: "dev-testing", s3_gb: 9.5, network_in_gb: 6.0, network_out_gb: 2.2 },
]

type MetricType = 's3' | 'total_read' | 'rows' | 'network_in' | 'network_out' | null

const METRIC_LABELS: Record<string, string> = {
  s3: 'S3 Read',
  total_read: 'Total Read',
  rows: 'Rows Read',
  network_in: 'Network In',
  network_out: 'Network Out',
}

const METRIC_UNITS: Record<string, string> = {
  s3: 'GB',
  total_read: 'GB',
  rows: 'M rows',
  network_in: 'GB',
  network_out: 'GB',
}

// Generate mock time series for a metric
const generateIOTimeSeries = (metric: string) => {
  const data = []
  const baseValues: Record<string, number> = {
    s3: 6.5,
    total_read: 13.0,
    rows: 190,
    network_in: 3.7,
    network_out: 1.8,
  }
  const base = baseValues[metric] || 5

  for (let i = 0; i < 24; i++) {
    const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.4 + 0.6
    const noise = 0.85 + Math.random() * 0.3
    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      value: base * hourFactor * noise,
    })
  }
  return data
}

export function IODataTransferSection({ eksCluster, dateRange, selectedDate }: IODataTransferSectionProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null)

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1000) {
      return `${(gb / 1024).toFixed(1)} TB`
    }
    return `${gb.toFixed(1)} GB`
  }

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(2)}B`
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`
    }
    return num.toString()
  }

  const totals = useMemo(() => ({
    s3: formatBytes(MOCK_IO_DATA.s3_bytes_read),
    totalRead: formatBytes(MOCK_IO_DATA.total_bytes_read),
    rows: formatNumber(MOCK_IO_DATA.rows_read),
    networkIn: formatBytes(MOCK_IO_DATA.network_in),
    networkOut: formatBytes(MOCK_IO_DATA.network_out),
  }), [])

  const chartData = useMemo(() => {
    if (!selectedMetric) return []
    return generateIOTimeSeries(selectedMetric)
  }, [selectedMetric])

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-5 w-5" />
            IO & Data Transfer
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">Data read from S3, total bytes processed, and network traffic in/out</p>
                <p className="text-xs text-muted-foreground mt-1">Metrics: workload_metrics (s3_bytes_read, network_bytes_in/out)</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric('s3')}
            >
              <p className="text-2xl font-bold">{totals.s3}</p>
              <p className="text-xs text-muted-foreground">S3 Read</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric('total_read')}
            >
              <p className="text-2xl font-bold">{totals.totalRead}</p>
              <p className="text-xs text-muted-foreground">Total Read</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric('rows')}
            >
              <p className="text-2xl font-bold">{totals.rows}</p>
              <p className="text-xs text-muted-foreground">Rows Read</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric('network_in')}
            >
              <div className="flex items-center justify-center gap-1">
                <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{totals.networkIn}</p>
              </div>
              <p className="text-xs text-muted-foreground">Network In</p>
            </div>
            <div
              className="text-center p-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setSelectedMetric('network_out')}
            >
              <div className="flex items-center justify-center gap-1">
                <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{totals.networkOut}</p>
              </div>
              <p className="text-xs text-muted-foreground">Network Out</p>
            </div>
          </div>

          {/* By E6 Cluster */}
          <div className="text-xs text-muted-foreground mb-3">BY E6 CLUSTER (click metric for trend)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">E6 CLUSTER</th>
                  <th className="text-right py-2 font-medium">S3 READ</th>
                  <th className="text-right py-2 font-medium">NETWORK IN</th>
                  <th className="text-right py-2 font-medium">NETWORK OUT</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_IO_BY_CLUSTER.map((cluster) => (
                  <tr key={cluster.e6_cluster} className="border-b last:border-0">
                    <td className="py-2 font-medium">{cluster.e6_cluster}</td>
                    <td className="py-2 text-right">{cluster.s3_gb.toFixed(1)} GB</td>
                    <td className="py-2 text-right">{cluster.network_in_gb.toFixed(1)} GB</td>
                    <td className="py-2 text-right">{cluster.network_out_gb.toFixed(1)} GB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Time Series Modal */}
      <Dialog open={!!selectedMetric} onOpenChange={(open) => !open && setSelectedMetric(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {selectedMetric && METRIC_LABELS[selectedMetric]} - Hourly - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickLine={false}
                  axisLine={{ stroke: '#ccc' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#666' }}
                  tickLine={false}
                  axisLine={{ stroke: '#ccc' }}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [
                    `${(value as number).toFixed(2)} ${selectedMetric ? METRIC_UNITS[selectedMetric] : ''}`,
                    selectedMetric ? METRIC_LABELS[selectedMetric] : ''
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name={selectedMetric ? METRIC_LABELS[selectedMetric] : ''}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
