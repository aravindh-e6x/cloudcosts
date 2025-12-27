"use client"

import { useMemo, useState } from "react"
import { Server, Cpu, MemoryStick } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "e6ds"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface NodePackingSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

// Mock data for nodes
const MOCK_NODES = [
  { node: "ip-172-25-2-22.eu-west-1.compute.internal", instance_type: "m5.2xlarge", allocatable_cpu: 8, allocated_cpu: 7.52, allocatable_memory: 32 * 1024 * 1024 * 1024, allocated_memory: 6.4 * 1024 * 1024 * 1024, hourly_cost: 0.384, pod_count: 12 },
  { node: "ip-172-25-1-101.eu-west-1.compute.internal", instance_type: "m5.2xlarge", allocatable_cpu: 8, allocated_cpu: 7.04, allocatable_memory: 32 * 1024 * 1024 * 1024, allocated_memory: 6.4 * 1024 * 1024 * 1024, hourly_cost: 0.384, pod_count: 10 },
  { node: "ip-172-25-2-12.eu-west-1.compute.internal", instance_type: "m5.2xlarge", allocatable_cpu: 8, allocated_cpu: 7.52, allocatable_memory: 32 * 1024 * 1024 * 1024, allocated_memory: 6.4 * 1024 * 1024 * 1024, hourly_cost: 0.384, pod_count: 12 },
  { node: "ip-172-25-4-156.eu-west-1.compute.internal", instance_type: "m5.2xlarge", allocatable_cpu: 8, allocated_cpu: 7.68, allocatable_memory: 32 * 1024 * 1024 * 1024, allocated_memory: 9.6 * 1024 * 1024 * 1024, hourly_cost: 0.384, pod_count: 13 },
  { node: "ip-172-25-0-75.eu-west-1.compute.internal", instance_type: "m5.2xlarge", allocatable_cpu: 8, allocated_cpu: 7.6, allocatable_memory: 32 * 1024 * 1024 * 1024, allocated_memory: 4.5 * 1024 * 1024 * 1024, hourly_cost: 0.384, pod_count: 12 },
  { node: "ip-172-25-2-58.eu-west-1.compute.internal", instance_type: "m5.2xlarge", allocatable_cpu: 8, allocated_cpu: 7.92, allocatable_memory: 32 * 1024 * 1024 * 1024, allocated_memory: 5.4 * 1024 * 1024 * 1024, hourly_cost: 0.384, pod_count: 13 },
  { node: "ip-172-25-3-198.eu-west-1.compute.internal", instance_type: "m5.2xlarge", allocatable_cpu: 8, allocated_cpu: 7.44, allocatable_memory: 32 * 1024 * 1024 * 1024, allocated_memory: 8.0 * 1024 * 1024 * 1024, hourly_cost: 0.384, pod_count: 13 },
]

type ModalState = { node: string; metric: 'cpu' | 'memory' } | null

// Generate mock time series data for a node
const generateNodeTimeSeries = (basePct: number, metric: 'cpu' | 'memory') => {
  const data = []
  for (let i = 0; i < 24; i++) {
    const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.15 + 0.85
    const noise = 0.95 + Math.random() * 0.1
    const value = basePct * hourFactor * noise
    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      value: Math.min(value, 100),
    })
  }
  return data
}

export function NodePackingSection({ eksCluster, dateRange, selectedDate }: NodePackingSectionProps) {
  const [modalState, setModalState] = useState<ModalState>(null)

  const nodesWithPct = useMemo(() => {
    return MOCK_NODES.map(n => ({
      ...n,
      cpu_pct: (n.allocated_cpu / n.allocatable_cpu) * 100,
      memory_pct: (n.allocated_memory / n.allocatable_memory) * 100,
    })).sort((a, b) => b.cpu_pct - a.cpu_pct)
  }, [])

  const totalNodes = nodesWithPct.length
  const totalPods = nodesWithPct.reduce((sum, n) => sum + n.pod_count, 0)
  const totalCpuAllocatable = nodesWithPct.reduce((sum, n) => sum + n.allocatable_cpu, 0)
  const totalCpuAllocated = nodesWithPct.reduce((sum, n) => sum + n.allocated_cpu, 0)
  const totalMemoryAllocatable = nodesWithPct.reduce((sum, n) => sum + n.allocatable_memory, 0)
  const totalMemoryAllocated = nodesWithPct.reduce((sum, n) => sum + n.allocated_memory, 0)
  const totalHourlyCost = nodesWithPct.reduce((sum, n) => sum + n.hourly_cost, 0)

  const avgCpuPct = totalCpuAllocatable > 0 ? (totalCpuAllocated / totalCpuAllocatable) * 100 : 0
  const avgMemPct = totalMemoryAllocatable > 0 ? (totalMemoryAllocated / totalMemoryAllocatable) * 100 : 0

  // Generate chart data based on selected node and metric
  const chartData = useMemo(() => {
    if (!modalState) return []
    const nodeData = nodesWithPct.find(n => n.node === modalState.node)
    if (!nodeData) return []
    const basePct = modalState.metric === 'cpu' ? nodeData.cpu_pct : nodeData.memory_pct
    return generateNodeTimeSeries(basePct, modalState.metric)
  }, [modalState, nodesWithPct])


  const formatMemory = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(0)}Gi`
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-5 w-5" />
            Node Packing
          </CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{totalNodes}</span> nodes
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground">{Math.round(totalCpuAllocated)}m/{Math.round(totalCpuAllocatable)}m</span>
                <span className="ml-2">{avgCpuPct.toFixed(1)}%</span> cpu
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground">{formatMemory(totalMemoryAllocated)}/{formatMemory(totalMemoryAllocatable)}</span>
                <span className="ml-2">{avgMemPct.toFixed(1)}%</span> memory
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-2 py-1 bg-muted rounded font-medium">
                ${totalHourlyCost.toFixed(2)}/hour ${(totalHourlyCost * 24 * 30).toFixed(0)}/month
              </span>
            </div>
          </div>
          <div className="text-muted-foreground text-xs mb-3">
            {totalPods} pods (0 pending {totalPods} running {totalPods} bound)
          </div>

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
                    className="flex items-center gap-1 flex-1 cursor-pointer hover:bg-muted/50 p-1 -m-1  transition-colors"
                    onClick={() => setModalState({ node: node.node, metric: 'cpu' })}
                  >
                    <span className="w-8 text-muted-foreground">cpu</span>
                    <div className="flex-1 h-4 bg-muted overflow-hidden">
                      <div
                        className="h-full transition-all bg-primary"
                        style={{ width: `${Math.min(node.cpu_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 flex-1 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                    onClick={() => setModalState({ node: node.node, metric: 'memory' })}
                  >
                    <span className="w-12 text-muted-foreground">memory</span>
                    <div className="flex-1 h-4 bg-muted overflow-hidden">
                      <div
                        className="h-full transition-all bg-primary"
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
                  {node.instance_type}/${node.hourly_cost.toFixed(3)}
                </div>
                <div className="w-24 text-muted-foreground">
                  On-Demand
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Click CPU or Memory bar for time-series
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalState?.metric === 'cpu' ? (
                <Cpu className="h-5 w-5" />
              ) : (
                <MemoryStick className="h-5 w-5" />
              )}
              <span className="font-mono text-sm">
                {modalState?.node} - {modalState?.metric === 'cpu' ? 'CPU' : 'Memory'} % - {selectedDate}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#666' }} tickLine={false} axisLine={{ stroke: '#ccc' }} />
                <YAxis tick={{ fontSize: 12, fill: '#666' }} tickLine={false} axisLine={{ stroke: '#ccc' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                  formatter={(value) => [`${(value as number).toFixed(1)}%`, modalState?.metric === 'cpu' ? 'CPU' : 'Memory']}
                />
                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} name={modalState?.metric === 'cpu' ? 'CPU' : 'Memory'} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
