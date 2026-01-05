"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "e6ds"
import { Cpu, MemoryStick, Database, HardDrive, Zap, AlertTriangle } from "lucide-react"
import { ExecutorMetrics } from "../components/EngineHealth/types"

interface ExecutorDetailsProps {
  metrics: ExecutorMetrics
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  } else if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${bytes} B`
}

export function ExecutorDetails({ metrics }: ExecutorDetailsProps) {
  const cacheHitRate = useMemo(() => {
    const totalHits = metrics.diskCacheHitBytes + metrics.heapCacheHitBytes
    const totalMisses = metrics.diskCacheMissBytes + metrics.heapCacheMissBytes
    const total = totalHits + totalMisses
    return total > 0 ? (totalHits / total) * 100 : 0
  }, [metrics])

  const memoryUtilization = useMemo(() => {
    return metrics.memoryAllocatedBytes > 0
      ? (metrics.memoryUsedBytes / metrics.memoryAllocatedBytes) * 100
      : 0
  }, [metrics])

  return (
    <div className="space-y-6">
      {/* Task Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={<Cpu className="h-4 w-4" />}
          label="Active Tasks"
          value={metrics.activeTasks}
          description="Total active"
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Running Tasks"
          value={metrics.runningTasks}
          description="Currently executing"
        />
        <MetricCard
          icon={<MemoryStick className="h-4 w-4" />}
          label="Memory Usage"
          value={`${memoryUtilization.toFixed(0)}%`}
          description={formatBytes(metrics.memoryUsedBytes)}
          highlight={memoryUtilization > 85}
        />
        <MetricCard
          icon={<Database className="h-4 w-4" />}
          label="Cache Hit Rate"
          value={`${cacheHitRate.toFixed(1)}%`}
          description="Disk + Heap"
          highlight={cacheHitRate < 70}
          highlightColor="text-yellow-600"
        />
      </div>

      {/* Memory Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Memory Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Allocation</h4>
              <div className="space-y-2">
                <StatRow label="Allocated" value={formatBytes(metrics.memoryAllocatedBytes)} />
                <StatRow label="Used" value={formatBytes(metrics.memoryUsedBytes)} />
                <StatRow label="Occupied" value={formatBytes(metrics.memoryOccupiedBytes)} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Spill to Disk</h4>
              <div className="space-y-2">
                <StatRow
                  label="Bytes Written"
                  value={formatBytes(metrics.spillBytesWritten)}
                  color={metrics.spillBytesWritten > 100 * 1024 * 1024 ? "text-orange-600" : ""}
                />
                <StatRow label="Bytes Read" value={formatBytes(metrics.spillBytesRead)} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Health</h4>
              <div className="space-y-2">
                <StatRow
                  label="OOM Kills"
                  value={metrics.oomKills}
                  color={metrics.oomKills > 0 ? "text-red-600" : "text-green-600"}
                />
                <StatRow
                  label="Tasks Killed"
                  value={metrics.tasksKilled}
                  color={metrics.tasksKilled > 0 ? "text-orange-600" : ""}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data I/O */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data I/O</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Read Statistics</h4>
              <div className="space-y-2">
                <StatRow label="Total Bytes Read" value={formatBytes(metrics.bytesReadTotal)} />
                <StatRow label="From S3" value={formatBytes(metrics.bytesReadS3)} />
                <StatRow label="From Cache" value={formatBytes(metrics.bytesReadCache)} />
                <StatRow label="Rows Read" value={metrics.rowsRead.toLocaleString()} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Cache Performance</h4>
              <div className="space-y-2">
                <StatRow label="Disk Cache Hits" value={formatBytes(metrics.diskCacheHitBytes)} />
                <StatRow label="Disk Cache Misses" value={formatBytes(metrics.diskCacheMissBytes)} />
                <StatRow label="Heap Cache Hits" value={formatBytes(metrics.heapCacheHitBytes)} />
                <StatRow label="Heap Cache Misses" value={formatBytes(metrics.heapCacheMissBytes)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Task Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <StatRow label="Avg Task Duration" value={`${metrics.avgTaskDurationMs} ms`} />
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
          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <p className="text-muted-foreground"># Task Metrics</p>
              <p>io_e6x_e6engine_currentactivetasks</p>
              <p>io_e6x_e6engine_currentactivetasksrunning</p>
              <p>io_e6x_e6engine_tasksrun</p>
              <p>io_e6x_e6engine_taskcumulativetimenanos</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground"># Memory Metrics</p>
              <p>io_e6x_e6engine_currentexecutorallocatedmemorybytes</p>
              <p>io_e6x_e6engine_currentexecutorusedmemorybytes</p>
              <p>io_e6x_e6engine_numspilledbyteswritten</p>
              <p>io_e6x_e6engine_numspilledbytesread</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground"># Cache Metrics</p>
              <p>io_e6x_e6engine_diskcachegethitbytes</p>
              <p>io_e6x_e6engine_diskcachegetmissbytes</p>
              <p>io_e6x_e6engine_heapcachegethitbytes</p>
              <p>io_e6x_e6engine_filesreadfroms3bytes</p>
              <p>io_e6x_e6engine_filesreadfromcachebytes</p>
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
