"use client"

import { useMemo, useState } from "react"
import { Server, Cpu, MemoryStick, Info } from "lucide-react"
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

interface NodePackingSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

interface NodeData {
  node: string
  instance_type: string
  allocatable_cpu: number
  allocated_cpu: number
  allocatable_memory: number
  allocated_memory: number
  pod_count: number
  hourly_cost: number
}

interface TimeSeriesPoint {
  ts: string
  packing_pct: number
}

type ModalState = { node: string; metric: "cpu" | "memory" } | null

export function NodePackingSection({ eksCluster, dateRange, selectedDate }: NodePackingSectionProps) {
  const [modalState, setModalState] = useState<ModalState>(null)

  // Fetch node packing data
  const { data: nodesData, loading } = useQuery<NodeData>(
    "workspace",
    "getNodePackingDetailed",
    [dateRange]
  )

  // Fetch time series for selected node
  const { data: timeSeriesData } = useQuery<TimeSeriesPoint>(
    "workspace",
    "getNodePackingTimeSeries",
    [modalState?.node, modalState?.metric, dateRange],
    { enabled: !!modalState }
  )

  const nodesWithPct = useMemo(() => {
    if (!nodesData?.length) return []
    return nodesData.map((n) => ({
      ...n,
      cpu_pct: (n.allocatable_cpu || 0) > 0 ? ((n.allocated_cpu || 0) / n.allocatable_cpu) * 100 : 0,
      memory_pct: (n.allocatable_memory || 0) > 0 ? ((n.allocated_memory || 0) / n.allocatable_memory) * 100 : 0,
    })).sort((a, b) => b.cpu_pct - a.cpu_pct)
  }, [nodesData])

  const totals = useMemo(() => {
    if (!nodesWithPct.length) {
      return {
        nodeCount: 0,
        podCount: 0,
        cpuAllocatable: 0,
        cpuAllocated: 0,
        memoryAllocatable: 0,
        memoryAllocated: 0,
        hourlyCost: 0,
        avgCpuPct: 0,
        avgMemPct: 0,
      }
    }
    const cpuAllocatable = nodesWithPct.reduce((sum, n) => sum + (n.allocatable_cpu || 0), 0)
    const cpuAllocated = nodesWithPct.reduce((sum, n) => sum + (n.allocated_cpu || 0), 0)
    const memoryAllocatable = nodesWithPct.reduce((sum, n) => sum + (n.allocatable_memory || 0), 0)
    const memoryAllocated = nodesWithPct.reduce((sum, n) => sum + (n.allocated_memory || 0), 0)
    return {
      nodeCount: nodesWithPct.length,
      podCount: nodesWithPct.reduce((sum, n) => sum + (n.pod_count || 0), 0),
      cpuAllocatable,
      cpuAllocated,
      memoryAllocatable,
      memoryAllocated,
      hourlyCost: nodesWithPct.reduce((sum, n) => sum + (n.hourly_cost || 0), 0),
      avgCpuPct: cpuAllocatable > 0 ? (cpuAllocated / cpuAllocatable) * 100 : 0,
      avgMemPct: memoryAllocatable > 0 ? (memoryAllocated / memoryAllocatable) * 100 : 0,
    }
  }, [nodesWithPct])

  // Format time series data for chart
  const chartData = useMemo(() => {
    if (!timeSeriesData?.length) return []
    return timeSeriesData.map((d) => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.packing_pct || 0,
    }))
  }, [timeSeriesData])

  const formatMemory = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(0)}Gi`
  }

  // Color coding for packing efficiency (high = good = green)
  const getPackingColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500"
    if (pct >= 50) return "bg-orange-400"
    return "bg-red-500"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-5 w-5" />
            Node Packing
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
            <Server className="h-5 w-5" />
            Node Packing
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">CPU and memory allocation vs allocatable capacity per node</p>
                <p className="text-xs text-muted-foreground mt-1">Metrics: kube_node_status_allocatable, container_cpu_allocation, container_memory_allocation_bytes</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{totals.nodeCount}</span> nodes
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground">{totals.cpuAllocated.toFixed(1)}/{totals.cpuAllocatable.toFixed(0)}</span>
                <span className="ml-2">{totals.avgCpuPct.toFixed(1)}%</span> cpu
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground">{formatMemory(totals.memoryAllocated)}/{formatMemory(totals.memoryAllocatable)}</span>
                <span className="ml-2">{totals.avgMemPct.toFixed(1)}%</span> memory
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-2 py-1 bg-muted font-medium">
                ${totals.hourlyCost.toFixed(2)}/hour ${(totals.hourlyCost * 24 * 30).toFixed(0)}/month
              </span>
            </div>
          </div>
          <div className="text-muted-foreground text-xs mb-3">
            {totals.podCount} pods
          </div>

          {nodesWithPct.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No node data available for the selected time range
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {nodesWithPct.map((node) => (
                <div
                  key={node.node}
                  className="flex items-center gap-2 text-xs p-1"
                >
                  <div className="w-56 text-muted-foreground truncate">
                    {node.node}
                  </div>
                  <div className="flex-1 flex gap-1">
                    <div
                      className="flex items-center gap-1 flex-1 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                      onClick={() => setModalState({ node: node.node, metric: "cpu" })}
                    >
                      <span className="w-8 text-muted-foreground">cpu</span>
                      <div className="flex-1 h-4 bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${getPackingColor(node.cpu_pct)}`}
                          style={{ width: `${Math.min(node.cpu_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 flex-1 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                      onClick={() => setModalState({ node: node.node, metric: "memory" })}
                    >
                      <span className="w-12 text-muted-foreground">memory</span>
                      <div className="flex-1 h-4 bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${getPackingColor(node.memory_pct)}`}
                          style={{ width: `${Math.min(node.memory_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-20 text-right flex gap-2 justify-end text-muted-foreground">
                    <span>{Math.round(node.cpu_pct)}%</span>
                    <span>{Math.round(node.memory_pct)}%</span>
                  </div>
                  <div className="w-16 text-muted-foreground">
                    ({node.pod_count} pods)
                  </div>
                  <div className="w-36 text-muted-foreground text-right">
                    {node.instance_type || 'unknown'}/${(node.hourly_cost || 0).toFixed(3)}
                  </div>
                  <div className="w-24 text-muted-foreground">
                    On-Demand
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            Click CPU or Memory bar for time-series
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalState?.metric === "cpu" ? (
                <Cpu className="h-5 w-5" />
              ) : (
                <MemoryStick className="h-5 w-5" />
              )}
              <span className="font-mono text-sm">
                {modalState?.node} - {modalState?.metric === "cpu" ? "CPU" : "Memory"} % - {selectedDate}
              </span>
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
                  <YAxis tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                    formatter={(value) => [`${(value as number).toFixed(1)}%`, modalState?.metric === "cpu" ? "CPU" : "Memory"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} name={modalState?.metric === "cpu" ? "CPU" : "Memory"} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
