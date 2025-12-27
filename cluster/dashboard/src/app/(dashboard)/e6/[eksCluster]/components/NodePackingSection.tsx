"use client"

import { useMemo, useState } from "react"
import { Cpu } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "e6ds"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useQuery } from "@/hooks/useQuery"

interface NodePackingData {
  node: string
  allocatable_cpu: number
  allocated_cpu: number
  packing_pct: number
}

interface NodePackingAvg {
  avg_packing_pct: number
}

interface NodePackingTimeSeries {
  ts: string
  packing_pct: number
}

interface NodePackingSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

export function NodePackingSection({ eksCluster, dateRange, selectedDate }: NodePackingSectionProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  // Fetch node packing data (current)
  const { data: packingData, loading: loadingPacking } = useQuery<NodePackingData>(
    "e6",
    "getNodePacking",
    [eksCluster, dateRange],
    { database: "kubernetes" }
  )

  // Fetch average packing for the day
  const { data: avgData, loading: loadingAvg } = useQuery<NodePackingAvg>(
    "e6",
    "getNodePackingAvg",
    [eksCluster, dateRange],
    { database: "kubernetes" }
  )

  // Fetch time series for selected node
  const { data: timeSeriesData, loading: loadingTimeSeries } = useQuery<NodePackingTimeSeries>(
    "e6",
    "getNodePackingTimeSeries",
    [eksCluster, selectedNode || '', dateRange],
    { database: "kubernetes", enabled: !!selectedNode }
  )

  const avgPacking = avgData?.[0]?.avg_packing_pct || 0
  const currentAvg = packingData?.length
    ? Math.round(packingData.reduce((sum, n) => sum + n.packing_pct, 0) / packingData.length)
    : 0

  const chartData = useMemo(() => {
    if (!timeSeriesData) return []
    return timeSeriesData.map(d => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.packing_pct,
    }))
  }, [timeSeriesData])

  // Color based on packing percentage
  const getPackingColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500"
    if (pct >= 60) return "bg-yellow-500"
    if (pct >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  const getPackingTextColor = (pct: number) => {
    if (pct >= 80) return "text-green-600"
    if (pct >= 60) return "text-yellow-600"
    if (pct >= 40) return "text-orange-600"
    return "text-red-600"
  }

  if (loadingPacking || loadingAvg) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Node Packing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-5 w-5" />
            Node Packing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary row */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <div>
              <span className="text-muted-foreground">Today Avg: </span>
              <span className={`font-bold ${getPackingTextColor(avgPacking)}`}>
                {avgPacking}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Now: </span>
              <span className={`font-bold ${getPackingTextColor(currentAvg)}`}>
                {currentAvg}%
              </span>
            </div>
          </div>

          {/* Node grid */}
          <div className="text-xs text-muted-foreground mb-2">Current Node Utilization</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {packingData?.map((node) => (
              <div
                key={node.node}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedNode(node.node)}
              >
                <div
                  className={`h-12 rounded flex items-center justify-center text-white font-bold text-sm ${getPackingColor(node.packing_pct)}`}
                >
                  {Math.round(node.packing_pct)}%
                </div>
                <div className="text-xs text-center text-muted-foreground mt-1 truncate">
                  {node.node.split('-').pop()}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Click node for time-series
          </p>
        </CardContent>
      </Card>

      {/* Node Time Series Modal */}
      <Dialog open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              {selectedNode} - Packing % - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            {loadingTimeSeries ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            ) : (
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
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#333' }}
                    formatter={(value) => [`${value}%`, 'Packing']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: '#16a34a' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
