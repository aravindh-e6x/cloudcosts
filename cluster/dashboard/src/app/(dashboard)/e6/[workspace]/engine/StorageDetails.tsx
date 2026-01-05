"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "e6ds"
import { HardDrive, Database, Server, Clock, Trash2 } from "lucide-react"
import { StorageMetrics } from "../components/EngineHealth/types"

interface StorageDetailsProps {
  metrics: StorageMetrics
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

export function StorageDetails({ metrics }: StorageDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={<Database className="h-4 w-4" />}
          label="Cache Size"
          value={formatBytes(metrics.cacheSize)}
          description="File metadata cache"
        />
        <MetricCard
          icon={<Server className="h-4 w-4" />}
          label="Thrift Requests"
          value={metrics.thriftInProgress}
          subValue={`${metrics.thriftQueued} queued`}
          description="In progress"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Read Latency"
          value={`${metrics.avgReadLatencyMs} ms`}
          description="Storage read time"
        />
        <MetricCard
          icon={<Trash2 className="h-4 w-4" />}
          label="Cache Evictions"
          value={metrics.cacheEvictions}
          description="Recent evictions"
        />
      </div>

      {/* Request Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Thrift RPC</h4>
              <div className="space-y-2">
                <StatRow label="Queued" value={metrics.thriftQueued} />
                <StatRow label="In Progress" value={metrics.thriftInProgress} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Data Requests</h4>
              <div className="space-y-2">
                <StatRow label="Metadata In Progress" value={metrics.metadataRequestsInProgress} />
                <StatRow label="Partition In Progress" value={metrics.partitionRequestsInProgress} />
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
              <p className="text-muted-foreground"># Cache Metrics</p>
              <p>io_e6x_e6storage_filemetadatacachesize</p>
              <p>io_e6x_e6storage_avgfilemetadatasize</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground"># Request Metrics</p>
              <p>io_e6x_e6storage_numthriftrequestsqueued</p>
              <p>io_e6x_e6storage_numthriftrequestsinprogress</p>
              <p>io_e6x_e6storage_tablemetadatarequestsinprogress</p>
              <p>io_e6x_e6storage_tablepartitionsrequestsinprogress</p>
              <p>io_e6x_e6storage_tablestatisticsrequestsinprogress</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground"># Listing Tasks</p>
              <p>io_e6x_e6storage_numpartfileandmetadatalistingtasksinprogress</p>
              <p>io_e6x_e6storage_numpartfileandmetadatalistingtasksinqueue</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground"># Health</p>
              <p>io_e6x_e6storage_numblockedthreads</p>
              <p>io_e6x_e6storage_numdeadlockedthreads</p>
              <p>io_e6x_e6storage_uptime</p>
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
  subValue,
  description,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  description: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-orange-200 bg-orange-50/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${highlight ? "text-orange-600" : ""}`}>{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
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
