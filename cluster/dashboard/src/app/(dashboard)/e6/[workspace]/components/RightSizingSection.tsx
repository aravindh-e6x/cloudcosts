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
  Legend,
} from "recharts"
import { useQuery } from "@/hooks/useQuery"
import { format } from "date-fns"

interface RightSizingSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate?: string
}

interface RightSizingData {
  component: string
  namespace: string
  cpu_requested: number
  cpu_actual: number
  memory_requested: number
  memory_actual: number
}

interface TimeSeriesPoint {
  ts: string
  requested: number
  actual: number
}

type ModalType =
  | { type: "workspace-cpu"; component: string }
  | { type: "workspace-memory"; component: string }
  | { type: "cluster-cpu"; namespace: string; component: string }
  | { type: "cluster-memory"; namespace: string; component: string }
  | null

// Workspace-level components (shared)
const WORKSPACE_COMPONENTS = ["gateway", "storage", "schema"]

export function RightSizingSection({ eksCluster, dateRange, selectedDate }: RightSizingSectionProps) {
  const [modalState, setModalState] = useState<ModalType>(null)

  // Fetch right-sizing data
  const { data: rightSizingData, loading } = useQuery<RightSizingData>(
    "workspace",
    "getRightSizing",
    [dateRange]
  )

  // Fetch time series for selected component
  const { data: timeSeriesData } = useQuery<TimeSeriesPoint>(
    "workspace",
    "getRightSizingTimeSeries",
    [
      modalState && "component" in modalState ? modalState.component : null,
      modalState?.type.startsWith("cluster") && "namespace" in modalState ? modalState.namespace : null,
      modalState?.type.includes("memory") ? "memory" : "cpu",
      dateRange,
    ],
    { enabled: !!modalState }
  )

  // Separate workspace vs cluster components
  const { workspaceData, clusterData, namespaces } = useMemo(() => {
    if (!rightSizingData?.length) {
      return { workspaceData: [], clusterData: {}, namespaces: [] }
    }

    const workspace: Array<RightSizingData & { cpu_util_pct: number; memory_util_pct: number }> = []
    const cluster: Record<string, Array<RightSizingData & { cpu_util_pct: number; memory_util_pct: number }>> = {}
    const nsSet = new Set<string>()

    rightSizingData.forEach((row) => {
      const cpuRequested = row.cpu_requested || 0
      const cpuActual = row.cpu_actual || 0
      const memRequested = row.memory_requested || 0
      const memActual = row.memory_actual || 0
      const withPct = {
        ...row,
        cpu_requested: cpuRequested,
        cpu_actual: cpuActual,
        memory_requested: memRequested,
        memory_actual: memActual,
        cpu_util_pct: cpuRequested > 0 ? (cpuActual / cpuRequested) * 100 : 0,
        memory_util_pct: memRequested > 0 ? (memActual / memRequested) * 100 : 0,
      }

      if (WORKSPACE_COMPONENTS.includes(row.component)) {
        // Only add once (pick first namespace occurrence)
        if (!workspace.find((w) => w.component === row.component)) {
          workspace.push(withPct)
        }
      } else {
        // Cluster-level components (executor, planner, queue)
        nsSet.add(row.namespace)
        if (!cluster[row.namespace]) {
          cluster[row.namespace] = []
        }
        cluster[row.namespace].push(withPct)
      }
    })

    return {
      workspaceData: workspace,
      clusterData: cluster,
      namespaces: Array.from(nsSet).sort(),
    }
  }, [rightSizingData])

  // Format time series data for chart
  const chartData = useMemo(() => {
    if (!timeSeriesData?.length) return []
    const isMemory = modalState?.type.includes("memory")
    return timeSeriesData.map((d) => ({
      time: format(new Date(d.ts), "HH:mm"),
      requested: isMemory ? d.requested / (1024 * 1024 * 1024) : d.requested,
      actual: isMemory ? d.actual / (1024 * 1024 * 1024) : d.actual,
    }))
  }, [timeSeriesData, modalState])

  // Get modal title
  const getModalTitle = () => {
    if (!modalState) return ""
    const componentName = "component" in modalState ? modalState.component : ""
    const isMemory = modalState.type.includes("memory")
    const prefix =
      modalState.type.startsWith("cluster") && "namespace" in modalState
        ? `${modalState.namespace} / `
        : ""
    return `${prefix}${componentName.charAt(0).toUpperCase() + componentName.slice(1)} ${isMemory ? "Memory" : "CPU"} - Requested vs Actual`
  }

  // Get chart unit
  const getChartUnit = () => {
    if (!modalState) return ""
    return modalState.type.includes("memory") ? "GB" : "cores"
  }

  // Color coding for utilization (high = good = green)
  const getUtilizationColor = (pct: number) => {
    if (pct >= 70) return "bg-green-500"
    if (pct >= 40) return "bg-orange-400"
    return "bg-red-500"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Resource Sizing
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
            <Target className="h-5 w-5" />
            Resource Sizing
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">Compares requested resources vs actual usage to identify over-provisioned workloads</p>
                <p className="text-xs text-muted-foreground mt-1">Metrics: container_cpu_allocation, container_memory_allocation_bytes</p>
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
            {workspaceData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No workspace components found</div>
            ) : (
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
                      onClick={() => setModalState({ type: "workspace-cpu", component: row.component })}
                    >
                      <div className="flex-1 bg-muted h-2">
                        <div
                          className={`h-2 ${getUtilizationColor(row.cpu_util_pct)}`}
                          style={{ width: `${Math.min(row.cpu_util_pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right">{Math.round(row.cpu_util_pct)}%</span>
                    </div>
                    <div
                      className="col-span-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                      onClick={() => setModalState({ type: "workspace-memory", component: row.component })}
                    >
                      <div className="flex-1 bg-muted h-2">
                        <div
                          className={`h-2 ${getUtilizationColor(row.memory_util_pct)}`}
                          style={{ width: `${Math.min(row.memory_util_pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right">{Math.round(row.memory_util_pct)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cluster Components Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">CLUSTER COMPONENTS</span>
              <span className="text-xs text-muted-foreground">(per E6 cluster)</span>
            </div>

            {namespaces.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No cluster components found</div>
            ) : (
              namespaces.map((namespace) => (
                <div key={namespace} className="mb-4 last:mb-0">
                  <div className="text-sm font-medium mb-2 text-muted-foreground">{namespace}</div>
                  <div className="space-y-1 pl-4 border-l-2 border-muted">
                    {clusterData[namespace]?.map((row) => (
                      <div key={row.component} className="grid grid-cols-5 gap-4 items-center text-sm">
                        <span className="capitalize text-muted-foreground">{row.component}</span>
                        <div
                          className="col-span-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                          onClick={() => setModalState({ type: "cluster-cpu", namespace, component: row.component })}
                        >
                          <div className="flex-1 bg-muted h-2">
                            <div
                              className={`h-2 ${getUtilizationColor(row.cpu_util_pct)}`}
                              style={{ width: `${Math.min(row.cpu_util_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs w-10 text-right">{Math.round(row.cpu_util_pct)}%</span>
                        </div>
                        <div
                          className="col-span-2 flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1 transition-colors"
                          onClick={() => setModalState({ type: "cluster-memory", namespace, component: row.component })}
                        >
                          <div className="flex-1 bg-muted h-2">
                            <div
                              className={`h-2 ${getUtilizationColor(row.memory_util_pct)}`}
                              style={{ width: `${Math.min(row.memory_util_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs w-10 text-right">{Math.round(row.memory_util_pct)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground">Click any bar to view time-series trend</p>
        </CardContent>
      </Card>

      {/* Time Series Modal */}
      <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalState?.type.includes("cpu") ? <Cpu className="h-5 w-5" /> : <MemoryStick className="h-5 w-5" />}
              {getModalTitle()} {selectedDate && `- ${selectedDate}`}
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
                  <YAxis tick={{ fontSize: 12, fill: "#666" }} tickLine={false} axisLine={{ stroke: "#ccc" }} tickFormatter={(v) => `${v.toFixed(1)}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "8px" }}
                    formatter={(value, name) => [`${(value as number).toFixed(2)} ${getChartUnit()}`, name === "requested" ? "Requested" : "Actual"]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="requested" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Requested" />
                  <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} dot={false} name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
