"use client"

import { useMemo, useState } from "react"
import { Target, Cpu, MemoryStick, Info } from "lucide-react"
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

// Mock data for right-sizing by component
const MOCK_RIGHT_SIZING = [
  { component: "gateway", cpu_requested: 2, cpu_actual: 1.4, memory_requested: 4 * 1024 * 1024 * 1024, memory_actual: 2.8 * 1024 * 1024 * 1024 },
  { component: "executor", cpu_requested: 16, cpu_actual: 9.6, memory_requested: 32 * 1024 * 1024 * 1024, memory_actual: 19.2 * 1024 * 1024 * 1024 },
  { component: "planner", cpu_requested: 2, cpu_actual: 1.0, memory_requested: 4 * 1024 * 1024 * 1024, memory_actual: 1.8 * 1024 * 1024 * 1024 },
  { component: "queue", cpu_requested: 1, cpu_actual: 0.3, memory_requested: 2 * 1024 * 1024 * 1024, memory_actual: 0.8 * 1024 * 1024 * 1024 },
  { component: "schema", cpu_requested: 1, cpu_actual: 0.5, memory_requested: 2 * 1024 * 1024 * 1024, memory_actual: 1.2 * 1024 * 1024 * 1024 },
  { component: "storage", cpu_requested: 2, cpu_actual: 1.2, memory_requested: 4 * 1024 * 1024 * 1024, memory_actual: 2.4 * 1024 * 1024 * 1024 },
]

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
  | { type: 'overall-cpu' }
  | { type: 'overall-memory' }
  | { type: 'component-cpu'; component: string }
  | { type: 'component-memory'; component: string }
  | null

export function RightSizingSection({ eksCluster, dateRange, selectedDate }: RightSizingSectionProps) {
  const [modalState, setModalState] = useState<ModalType>(null)

  const rightSizingData = useMemo(() => {
    return MOCK_RIGHT_SIZING.map(r => ({
      ...r,
      cpu_util_pct: (r.cpu_actual / r.cpu_requested) * 100,
      memory_util_pct: (r.memory_actual / r.memory_requested) * 100,
    }))
  }, [])

  // Calculate totals
  const totals = useMemo(() => {
    const totalCpuRequested = rightSizingData.reduce((sum, d) => sum + d.cpu_requested, 0)
    const totalCpuActual = rightSizingData.reduce((sum, d) => sum + d.cpu_actual, 0)
    const totalMemRequested = rightSizingData.reduce((sum, d) => sum + d.memory_requested, 0)
    const totalMemActual = rightSizingData.reduce((sum, d) => sum + d.memory_actual, 0)
    return {
      cpuRequested: totalCpuRequested,
      cpuActual: totalCpuActual,
      cpuUtilPct: totalCpuRequested > 0 ? Math.round(totalCpuActual / totalCpuRequested * 100) : 0,
      memRequested: totalMemRequested,
      memActual: totalMemActual,
      memUtilPct: totalMemRequested > 0 ? Math.round(totalMemActual / totalMemRequested * 100) : 0,
    }
  }, [rightSizingData])

  // Generate chart data based on modal state
  const chartData = useMemo(() => {
    if (!modalState) return []

    if (modalState.type === 'overall-cpu') {
      return generateTimeSeriesData(totals.cpuRequested, totals.cpuActual, 'cpu')
    } else if (modalState.type === 'overall-memory') {
      return generateTimeSeriesData(totals.memRequested, totals.memActual, 'memory')
    } else if (modalState.type === 'component-cpu') {
      const component = rightSizingData.find(r => r.component === modalState.component)
      if (component) {
        return generateTimeSeriesData(component.cpu_requested, component.cpu_actual, 'cpu')
      }
    } else if (modalState.type === 'component-memory') {
      const component = rightSizingData.find(r => r.component === modalState.component)
      if (component) {
        return generateTimeSeriesData(component.memory_requested, component.memory_actual, 'memory')
      }
    }
    return []
  }, [modalState, totals, rightSizingData])

  // Get modal title
  const getModalTitle = () => {
    if (!modalState) return ''
    if (modalState.type === 'overall-cpu') return 'Overall CPU - Requested vs Actual'
    if (modalState.type === 'overall-memory') return 'Overall Memory - Requested vs Actual'
    if (modalState.type === 'component-cpu') return `${modalState.component.charAt(0).toUpperCase() + modalState.component.slice(1)} CPU - Requested vs Actual`
    if (modalState.type === 'component-memory') return `${modalState.component.charAt(0).toUpperCase() + modalState.component.slice(1)} Memory - Requested vs Actual`
    return ''
  }

  // Get chart unit
  const getChartUnit = () => {
    if (!modalState) return ''
    return modalState.type.includes('memory') ? 'GB' : 'cores'
  }

  // Color based on utilization percentage
  const getUtilColor = () => {
    return "bg-primary"
  }

  const getUtilTextColor = () => {
    return "text-foreground"
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
            Right-Sizing
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
        <CardContent>
          {/* Overall Summary */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* CPU Summary - Clickable */}
            <div
              className="cursor-pointer hover:bg-muted/50 p-3 -m-3  transition-colors"
              onClick={() => setModalState({ type: 'overall-cpu' })}
            >
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU</span>
                <span className="text-xs text-muted-foreground">(click for trend)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested</span>
                  <span>{Math.round(totals.cpuRequested)} cores</span>
                </div>
                <ProgressBar pct={100} color="bg-muted-foreground/30" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual</span>
                  <span>{totals.cpuActual.toFixed(1)} cores</span>
                </div>
                <ProgressBar pct={totals.cpuUtilPct} color={getUtilColor()} />
                <div className="text-right">
                  <span className={`font-bold ${getUtilTextColor()}`}>
                    {totals.cpuUtilPct}% utilized
                  </span>
                </div>
              </div>
            </div>

            {/* Memory Summary - Clickable */}
            <div
              className="cursor-pointer hover:bg-muted/50 p-3 -m-3  transition-colors"
              onClick={() => setModalState({ type: 'overall-memory' })}
            >
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memory</span>
                <span className="text-xs text-muted-foreground">(click for trend)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested</span>
                  <span>{Math.round(totals.memRequested / 1024 / 1024 / 1024)} GB</span>
                </div>
                <ProgressBar pct={100} color="bg-muted-foreground/30" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual</span>
                  <span>{(totals.memActual / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                </div>
                <ProgressBar pct={totals.memUtilPct} color={getUtilColor()} />
                <div className="text-right">
                  <span className={`font-bold ${getUtilTextColor()}`}>
                    {totals.memUtilPct}% utilized
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* By Component */}
          <div className="text-xs text-muted-foreground mb-2">BY COMPONENT (click for trend)</div>
          <div className="space-y-2">
            {rightSizingData.map((row) => (
              <div key={row.component} className="grid grid-cols-3 gap-4 items-center text-sm">
                <span className="font-medium capitalize">{row.component}</span>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1  transition-colors"
                  onClick={() => setModalState({ type: 'component-cpu', component: row.component })}
                >
                  <div className="w-24 bg-muted  h-2">
                    <div
                      className={`h-2  ${getUtilColor()}`}
                      style={{ width: `${Math.min(row.cpu_util_pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs ${getUtilTextColor()}`}>
                    {Math.round(row.cpu_util_pct)}%
                  </span>
                </div>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 -m-1  transition-colors"
                  onClick={() => setModalState({ type: 'component-memory', component: row.component })}
                >
                  <div className="w-24 bg-muted  h-2">
                    <div
                      className={`h-2  ${getUtilColor()}`}
                      style={{ width: `${Math.min(row.memory_util_pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs ${getUtilTextColor()}`}>
                    {Math.round(row.memory_util_pct)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
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
