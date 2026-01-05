"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "e6ds"
import { Users, Play, Clock, CheckCircle, XCircle, Timer, AlertTriangle } from "lucide-react"
import { GatewayMetrics } from "../components/EngineHealth/types"

interface GatewayDetailsProps {
  metrics: GatewayMetrics
}

export function GatewayDetails({ metrics }: GatewayDetailsProps) {
  const querySuccessRate = useMemo(() => {
    const total = metrics.queriesSucceeded + metrics.queriesFailed
    return total > 0 ? (metrics.queriesSucceeded / total) * 100 : 100
  }, [metrics])

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Active Connections"
          value={metrics.activeConnections}
          description="Current client connections"
        />
        <MetricCard
          icon={<Play className="h-4 w-4" />}
          label="Queries Running"
          value={metrics.queriesRunning}
          description="Currently executing"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Queries Queued"
          value={metrics.queriesQueued}
          description="Waiting to execute"
          highlight={metrics.queriesQueued > 5}
        />
        <MetricCard
          icon={<CheckCircle className="h-4 w-4" />}
          label="Success Rate"
          value={`${querySuccessRate.toFixed(1)}%`}
          description={`${metrics.queriesSucceeded} succeeded`}
          highlight={querySuccessRate < 99}
          highlightColor="text-yellow-600"
        />
      </div>

      {/* Query Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Query Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Counters */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Throughput</h4>
              <div className="space-y-2">
                <StatRow label="Queries Completed" value={metrics.queriesCompleted} />
                <StatRow label="Queries Succeeded" value={metrics.queriesSucceeded} color="text-green-600" />
                <StatRow label="Queries Failed" value={metrics.queriesFailed} color="text-red-600" />
                <StatRow label="Queries Timed Out" value={metrics.queriesTimedOut} color="text-orange-600" />
              </div>
            </div>

            {/* Latency */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Latency</h4>
              <div className="space-y-2">
                <StatRow label="Avg Query Latency" value={`${metrics.avgQueryLatencyMs} ms`} />
                <StatRow label="P99 Query Latency" value={`${metrics.p99QueryLatencyMs} ms`} />
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
              <p>io_e6x_e6gateway_currentactiveconnections</p>
              <p>io_e6x_e6gateway_currentqueriesrunningcount</p>
              <p>io_e6x_e6gateway_currentqueriesqueuedcount</p>
              <p>io_e6x_e6gateway_uptime</p>
              <p>io_e6x_e6gateway_numblockedthreads</p>
              <p>io_e6x_e6gateway_numdeadlockedthreads</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground"># Counters</p>
              <p>io_e6x_e6gateway_numsucceededqueries</p>
              <p>io_e6x_e6gateway_totalqueriescompletedcount</p>
              <p>io_e6x_e6gateway_totalqueriesfailedcount</p>
              <p>io_e6x_e6gateway_totalqueriescreatedcount</p>
              <p>io_e6x_e6gateway_queuedqueriescreatedcount</p>
              <p>io_e6x_e6gateway_queuedqueriesresumedcount</p>
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
