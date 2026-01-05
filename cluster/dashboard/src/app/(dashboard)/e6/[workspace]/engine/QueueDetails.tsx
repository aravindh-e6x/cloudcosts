"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "e6ds"
import { Layers, Play, Clock, CheckCircle, XCircle, GitBranch } from "lucide-react"
import { QueueMetrics } from "../components/EngineHealth/types"

interface QueueDetailsProps {
  metrics: QueueMetrics
}

export function QueueDetails({ metrics }: QueueDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={<Layers className="h-4 w-4" />}
          label="Active Requests"
          value={metrics.activeRequests}
          description="In-flight requests"
        />
        <MetricCard
          icon={<Play className="h-4 w-4" />}
          label="Active Tasks"
          value={metrics.activeTasks}
          description="Total tasks"
        />
        <MetricCard
          icon={<GitBranch className="h-4 w-4" />}
          label="Active Splits"
          value={metrics.activeSplits}
          description="Data splits"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Queue Wait"
          value={`${metrics.avgQueueWaitMs} ms`}
          description="Wait time"
          highlight={metrics.avgQueueWaitMs > 500}
        />
      </div>

      {/* Task State Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Task States</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Current State</h4>
              <div className="space-y-2">
                <StatRow label="Running" value={metrics.tasksRunning} color="text-blue-600" />
                <StatRow label="New (Pending)" value={metrics.tasksNew} color="text-yellow-600" />
                <StatRow label="Max Queue Depth" value={metrics.maxQueueDepth} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Throughput</h4>
              <div className="space-y-2">
                <StatRow label="Requests Succeeded" value={metrics.requestsSucceeded} color="text-green-600" />
                <StatRow label="Requests Failed" value={metrics.requestsFailed} color="text-red-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pod Instances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pod Instances ({metrics.instances.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Pod</th>
                  <th className="pb-2 font-medium">Node</th>
                  <th className="pb-2 font-medium">Instance Type</th>
                  <th className="pb-2 font-medium text-right">CPU (Used/Req)</th>
                  <th className="pb-2 font-medium text-right">Memory (Used/Req)</th>
                  <th className="pb-2 font-medium text-right">Cost/hr</th>
                </tr>
              </thead>
              <tbody>
                {metrics.instances.map((inst) => {
                  const cpuPct = (inst.cpuUsed / inst.cpuRequested) * 100
                  const memPct = (inst.memoryUsedGb / inst.memoryRequestedGb) * 100
                  return (
                    <tr key={inst.pod} className="border-b last:border-0">
                      <td className="py-2 font-mono text-xs">{inst.pod}</td>
                      <td className="py-2 font-mono text-xs">{inst.node}</td>
                      <td className="py-2 text-xs text-muted-foreground">{inst.nodeInstanceType}</td>
                      <td className="py-2 text-right">
                        <span className={cpuPct > 80 ? "text-orange-600" : ""}>
                          {inst.cpuUsed.toFixed(1)}/{inst.cpuRequested}
                        </span>
                        <span className="text-muted-foreground ml-1">({cpuPct.toFixed(0)}%)</span>
                      </td>
                      <td className="py-2 text-right">
                        <span className={memPct > 80 ? "text-orange-600" : ""}>
                          {inst.memoryUsedGb.toFixed(1)}/{inst.memoryRequestedGb}
                        </span>
                        <span className="text-muted-foreground ml-1">GB ({memPct.toFixed(0)}%)</span>
                      </td>
                      <td className="py-2 text-right font-mono">${inst.costPerHour.toFixed(3)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td className="pt-2" colSpan={3}>Total</td>
                  <td className="pt-2 text-right">
                    {metrics.totalCpuUsed.toFixed(1)}/{metrics.totalCpuRequested} cores
                  </td>
                  <td className="pt-2 text-right">
                    {metrics.totalMemoryUsedGb.toFixed(1)}/{metrics.totalMemoryRequestedGb} GB
                  </td>
                  <td className="pt-2 text-right font-mono">${metrics.totalCostPerHour.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Prometheus Metrics Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prometheus Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <p className="text-muted-foreground"># Gauges</p>
              <p>io_e6x_e6queue_currentactiverequests</p>
              <p>io_e6x_e6queue_currentactivetasks</p>
              <p>io_e6x_e6queue_currentactivesplits</p>
              <p>io_e6x_e6queue_currentnumtasks</p>
              <p>io_e6x_e6queue_currentactivetasksrunning</p>
              <p>io_e6x_e6queue_currentactivetasksnew</p>
              <p>io_e6x_e6queue_maxcompletede6requests</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground"># Counters</p>
              <p>io_e6x_e6queue_nume6requestssucceeded</p>
              <p>io_e6x_e6queue_nume6requestsfailed</p>
              <p>io_e6x_e6queue_numcompletede6requests</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  description,
  highlight = false,
  highlightColor = "text-orange-600",
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  description: string
  highlight?: boolean
  highlightColor?: string
}) {
  return (
    <Card className={highlight ? "border-orange-200 bg-orange-50/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${highlight ? highlightColor : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono font-medium ${color || ""}`}>{value}</span>
    </div>
  )
}
