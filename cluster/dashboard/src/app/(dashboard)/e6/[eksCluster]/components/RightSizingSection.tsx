"use client"

import { useMemo, useState } from "react"
import { Target, Cpu, MemoryStick, Info, Server, Layers } from "lucide-react"
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
  Legend,
} from "recharts"

interface RightSizingSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate?: string
}

// Workspace-level components (shared across all E6 clusters)
const WORKSPACE_COMPONENTS = [
  { component: "gateway", cpu_requested: 2, cpu_actual: 1.4, memory_requested: 4 * 1024 * 1024 * 1024, memory_actual: 2.8 * 1024 * 1024 * 1024 },
  { component: "storage", cpu_requested: 2, cpu_actual: 1.2, memory_requested: 4 * 1024 * 1024 * 1024, memory_actual: 2.4 * 1024 * 1024 * 1024 },
  { component: "schema", cpu_requested: 1, cpu_actual: 0.5, memory_requested: 2 * 1024 * 1024 * 1024, memory_actual: 1.2 * 1024 * 1024 * 1024 },
]

// Cluster-level components (per E6 cluster)
const CLUSTER_COMPONENTS_BY_E6: Record<string, typeof WORKSPACE_COMPONENTS> = {
  "prod-analytics": [
    { component: "executor", cpu_requested: 8, cpu_actual: 5.2, memory_requested: 16 * 1024 * 1024 * 1024, memory_actual: 10.4 * 1024 * 1024 * 1024 },
    { component: "planner", cpu_requested: 1, cpu_actual: 0.6, memory_requested: 2 * 1024 * 1024 * 1024, memory_actual: 1.1 * 1024 * 1024 * 1024 },
    { component: "queue", cpu_requested: 0.5, cpu_actual: 0.2, memory_requested: 1 * 1024 * 1024 * 1024, memory_actual: 0.4 * 1024 * 1024 * 1024 },
  ],
  "prod-reporting": [
    { component: "executor", cpu_requested: 4, cpu_actual: 2.8, memory_requested: 8 * 1024 * 1024 * 1024, memory_actual: 5.6 * 1024 * 1024 * 1024 },
    { component: "planner", cpu_requested: 0.5, cpu_actual: 0.3, memory_requested: 1 * 1024 * 1024 * 1024, memory_actual: 0.5 * 1024 * 1024 * 1024 },
    { component: "queue", cpu_requested: 0.25, cpu_actual: 0.1, memory_requested: 0.5 * 1024 * 1024 * 1024, memory_actual: 0.2 * 1024 * 1024 * 1024 },
  ],
  "dev-testing": [
    { component: "executor", cpu_requested: 4, cpu_actual: 1.6, memory_requested: 8 * 1024 * 1024 * 1024, memory_actual: 3.2 * 1024 * 1024 * 1024 },
    { component: "planner", cpu_requested: 0.5, cpu_actual: 0.1, memory_requested: 1 * 1024 * 1024 * 1024, memory_actual: 0.2 * 1024 * 1024 * 1024 },
    { component: "queue", cpu_requested: 0.25, cpu_actual: 0, memory_requested: 0.5 * 1024 * 1024 * 1024, memory_actual: 0.2 * 1024 * 1024 * 1024 },
  ],
}

const E6_CLUSTERS = ["prod-analytics", "prod-reporting", "dev-testing"]

// Generate mock time series for requested vs actual
const generateTimeSeriesData = (requested: number, actual: number, type: 'cpu' | 'memory') => {
  const data = []
  for (let i = 0; i < 24; i++) {
    const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.3 + 0.7
    const noise = 0.9 + Math.random() * 0.2
    const actualValue = actual * hourFactor * noise
    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      requested: type === 'memory' ? requested / (1024 * 1024 * 1024) : requested,
      actual: type === 'memory' ? actualValue / (1024 * 1024 * 1024) : actualValue,
    })
  }
  return data
}

type ModalType =
  | { type: 'workspace-cpu'; component: string }
  | { type: 'workspace-memory'; component: string }
  | { type: 'cluster-cpu'; e6Cluster: string; component: string }
  | { type: 'cluster-memory'; e6Cluster: string; component: string }
  | null

export function RightSizingSection({ eksCluster, dateRange, selectedDate }: RightSizingSectionProps) {
  const [modalState, setModalState] = useState<ModalType>(null)

  const workspaceData = useMemo(() => {
    return WORKSPACE_COMPONENTS.map(r => ({
      ...r,
      cpu_util_pct: (r.cpu_actual / r.cpu_requested) * 100,
      memory_util_pct: (r.memory_actual / r.memory_requested) * 100,
    }))
  }, [])

  const clusterData = useMemo(() => {
    const result: Record<string, typeof workspaceData> = {}
    for (const cluster of E6_CLUSTERS) {
      const components = CLUSTER_COMPONENTS_BY_E6[cluster] || []
      result[cluster] = components.map(r => ({
        ...r,
        cpu_util_pct: r.cpu_requested > 0 ? (r.cpu_actual / r.cpu_requested) * 100 : 0,
        memory_util_pct: r.memory_requested > 0 ? (r.memory_actual / r.memory_requested) * 100 : 0,
      }))
    }
    return result
  }, [workspaceData])

  // Generate chart data based on modal state
  const chartData = useMemo(() => {
    if (!modalState) return []

    if (modalState.type === 'workspace-cpu' || modalState.type === 'workspace-memory') {
      const component = workspaceData.find(r => r.component === modalState.component)
      if (component) {
        const isMemory = modalState.type === 'workspace-memory'
        return generateTimeSeriesData(
          isMemory ? component.memory_requested : component.cpu_requested,
          isMemory ? component.memory_actual : component.cpu_actual,
          isMemory ? 'memory' : 'cpu'
        )
      }
    } else if (modalState.type === 'cluster-cpu' || modalState.type === 'cluster-memory') {
      const components = clusterData[modalState.e6Cluster]
      const component = components?.find(r => r.component === modalState.component)
      if (component) {
        const isMemory = modalState.type === 'cluster-memory'
        return generateTimeSeriesData(
          isMemory ? component.memory_requested : component.cpu_requested,
          isMemory ? component.memory_actual : component.cpu_actual,
          isMemory ? 'memory' : 'cpu'
        )
      }
    }
    return []
  }, [modalState, workspaceData, clusterData])

  // Get modal title
  const getModalTitle = () => {
    if (!modalState) return ''
    const componentName = 'component' in modalState ? modalState.component : ''
    const isMemory = modalState.type.includes('memory')
    const prefix = modalState.type.startsWith('cluster') && 'e6Cluster' in modalState
      ? `${modalState.e6Cluster} / `
      : ''
    return `${prefix}${componentName.charAt(0).toUpperCase() + componentName.slice(1)} ${isMemory ? 'Memory' : 'CPU'} - Requested vs Actual`
  }

  // Get chart unit
  const getChartUnit = () => {
    if (!modalState) return ''
    return modalState.type.includes('memory') ? 'GB' : 'cores'
  }

  // Progress bar component
  const ProgressBar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="w-full bg-muted h-2">
      <div
        className={`h-2 ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Resource Sizing
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">Compares requested resources vs actual usage to identify over-provisioned workloads</p>
                <p className="text-xs text-muted-foreground mt-1">Metrics: kube_pod_container_resource_requests, container_cpu_usage_seconds_total, container_memory_working_set_bytes</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workspace Components Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">WORKSPACE COMPONENTS</span>
              <span className="text-xs text-muted-foreground">(shared across all clusters)</span>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 text-xs text-muted-foreground font-medium px-1">
                <div>COMPONENT</div>
                <div className="col-span-2 text-center">CPU UTILIZATION</div>
                <div className="col-span-2 text-center">MEMORY UTILIZATION</div>
              </div>
              {workspaceData.map((row) => (
                <div key={row.component} className="grid grid-cols-5 gap-4 items-center text-sm">
                  <span className="font-medium capitalize">{row.component}</span>
                  <div
                    className="col-span-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                    onClick={() => setModalState({ type: 'workspace-cpu', component: row.component })}
                  >
                    <div className="flex-1 bg-muted h-2">
                      <div
                        className="h-2 bg-primary"
                        style={{ width: `${Math.min(row.cpu_util_pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs w-10 text-right">
                      {Math.round(row.cpu_util_pct)}%
                    </span>
                  </div>
                  <div
                    className="col-span-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                    onClick={() => setModalState({ type: 'workspace-memory', component: row.component })}
                  >
                    <div className="flex-1 bg-muted h-2">
                      <div
                        className="h-2 bg-primary"
                        style={{ width: `${Math.min(row.memory_util_pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs w-10 text-right">
                      {Math.round(row.memory_util_pct)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster Components Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">CLUSTER COMPONENTS</span>
              <span className="text-xs text-muted-foreground">(per E6 cluster)</span>
            </div>

            {E6_CLUSTERS.map((e6Cluster) => (
              <div key={e6Cluster} className="mb-4 last:mb-0">
                <div className="text-sm font-medium mb-2 text-muted-foreground">{e6Cluster}</div>
                <div className="space-y-1 pl-4 border-l-2 border-muted">
                  {clusterData[e6Cluster]?.map((row) => (
                    <div key={row.component} className="grid grid-cols-5 gap-4 items-center text-sm">
                      <span className="capitalize text-muted-foreground">{row.component}</span>
                      <div
                        className="col-span-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                        onClick={() => setModalState({ type: 'cluster-cpu', e6Cluster, component: row.component })}
                      >
                        <div className="flex-1 bg-muted h-2">
                          <div
                            className="h-2 bg-primary"
                            style={{ width: `${Math.min(row.cpu_util_pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs w-10 text-right">
                          {Math.round(row.cpu_util_pct)}%
                        </span>
                      </div>
                      <div
                        className="col-span-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                        onClick={() => setModalState({ type: 'cluster-memory', e6Cluster, component: row.component })}
                      >
                        <div className="flex-1 bg-muted h-2">
                          <div
                            className="h-2 bg-primary"
                            style={{ width: `${Math.min(row.memory_util_pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs w-10 text-right">
                          {Math.round(row.memory_util_pct)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Click any bar to view time-series trend
          </p>
        </CardContent>
      </Card>

      {/* Time Series Modal */}
      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalState?.type.includes('cpu') ? (
                <Cpu className="h-5 w-5" />
              ) : (
                <MemoryStick className="h-5 w-5" />
              )}
              {getModalTitle()} {selectedDate && `- ${selectedDate}`}
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
                  tickFormatter={(v) => `${v.toFixed(1)}`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name) => [
                    `${(value as number).toFixed(2)} ${getChartUnit()}`,
                    name === 'requested' ? 'Requested' : 'Actual'
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requested"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Requested"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Actual"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
