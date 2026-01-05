"use client"

import { useMemo, useState } from "react"
import { EngineSnapshot } from "./types"
import { COMPONENT_COLORS } from "./constants"

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

interface ClusterSummary {
  cluster: string
  podCount: number
  executorCount: number
  cpuRequested: number
  cpuUsed: number
  memRequested: number
  memUsed: number
  queriesRunning: number
  queriesQueued: number
  cacheHitRate: number
  status: "good" | "warn" | "bad"
}

interface OverviewViewProps {
  clusterSnapshots: Map<string, EngineSnapshot>
}

export function OverviewView({ clusterSnapshots }: OverviewViewProps) {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)

  // Build cluster summaries
  const clusterSummaries = useMemo((): ClusterSummary[] => {
    const summaries: ClusterSummary[] = []

    clusterSnapshots.forEach((snapshot, cluster) => {
      const { gateway, queue, executor, schema, storage } = snapshot

      const podCount = gateway.instances.length + queue.instances.length +
        executor.instances.length + schema.instances.length + storage.instances.length

      const cpuRequested = gateway.totalCpuRequested + queue.totalCpuRequested +
        executor.totalCpuRequested + schema.totalCpuRequested + storage.totalCpuRequested
      const cpuUsed = gateway.totalCpuUsed + queue.totalCpuUsed +
        executor.totalCpuUsed + schema.totalCpuUsed + storage.totalCpuUsed

      const memRequested = gateway.totalMemoryRequestedGb + queue.totalMemoryRequestedGb +
        executor.totalMemoryRequestedGb + schema.totalMemoryRequestedGb + storage.totalMemoryRequestedGb
      const memUsed = gateway.totalMemoryUsedGb + queue.totalMemoryUsedGb +
        executor.totalMemoryUsedGb + schema.totalMemoryUsedGb + storage.totalMemoryUsedGb

      const totalCacheHit = executor.diskCacheHitBytes + executor.heapCacheHitBytes
      const totalCacheMiss = executor.diskCacheMissBytes + executor.heapCacheMissBytes
      const cacheHitRate = totalCacheHit + totalCacheMiss > 0
        ? (totalCacheHit / (totalCacheHit + totalCacheMiss)) * 100
        : 0

      const cpuPct = cpuRequested > 0 ? (cpuUsed / cpuRequested) * 100 : 0
      const memPct = memRequested > 0 ? (memUsed / memRequested) * 100 : 0

      // Determine overall status
      let status: "good" | "warn" | "bad" = "good"
      if (gateway.queriesQueued > 10 || cpuPct > 85 || memPct > 85 || gateway.queriesFailed > 5) {
        status = "bad"
      } else if (gateway.queriesQueued > 5 || cpuPct > 70 || memPct > 70) {
        status = "warn"
      }

      summaries.push({
        cluster,
        podCount,
        executorCount: executor.instances.length,
        cpuRequested,
        cpuUsed,
        memRequested,
        memUsed,
        queriesRunning: gateway.queriesRunning,
        queriesQueued: gateway.queriesQueued,
        cacheHitRate,
        status,
      })
    })

    return summaries
  }, [clusterSnapshots])

  // Get selected cluster details
  const selectedSnapshot = selectedCluster ? clusterSnapshots.get(selectedCluster) : null

  const getStatusColor = (status: "good" | "warn" | "bad") => {
    switch (status) {
      case "bad": return { bg: "bg-red-100", text: "text-red-600", border: "border-red-300" }
      case "warn": return { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-300" }
      default: return { bg: "bg-green-100", text: "text-green-600", border: "border-green-300" }
    }
  }

  return (
    <div className="space-y-6">
      {/* Cluster Cards Grid */}
      <div>
        <div className="text-sm font-medium mb-3">Cluster Health</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {clusterSummaries.map((summary) => {
            const colors = getStatusColor(summary.status)
            const cpuPct = summary.cpuRequested > 0 ? (summary.cpuUsed / summary.cpuRequested) * 100 : 0
            const memPct = summary.memRequested > 0 ? (summary.memUsed / summary.memRequested) * 100 : 0

            return (
              <div
                key={summary.cluster}
                onClick={() => setSelectedCluster(selectedCluster === summary.cluster ? null : summary.cluster)}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedCluster === summary.cluster ? "ring-2 ring-primary" : "hover:bg-muted/50"
                } ${colors.bg} ${colors.border}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm truncate">{summary.cluster}</span>
                  <span className="text-xs bg-background/50 px-1.5 py-0.5 rounded">
                    {summary.podCount} pods
                  </span>
                </div>

                {/* Resource bars */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-8">CPU</span>
                    <div className="flex-1 h-2 bg-background/50 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${cpuPct > 85 ? 'bg-red-500' : cpuPct > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, cpuPct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] w-12 text-right">{summary.cpuUsed.toFixed(0)}/{summary.cpuRequested}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-8">MEM</span>
                    <div className="flex-1 h-2 bg-background/50 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${memPct > 85 ? 'bg-red-500' : memPct > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, memPct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] w-12 text-right">{summary.memUsed.toFixed(0)}/{summary.memRequested}G</span>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Executors</span>
                    <span className="font-medium">{summary.executorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Queries</span>
                    <span className="font-medium">
                      {summary.queriesRunning}
                      {summary.queriesQueued > 0 && (
                        <span className="text-orange-500">+{summary.queriesQueued}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Cache Hit</span>
                    <span className="font-medium">{summary.cacheHitRate.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Cluster Details */}
      {selectedSnapshot && selectedCluster && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="text-sm font-medium mb-3">{selectedCluster} - Component Details</div>

          {/* Component breakdown */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { name: "Gateway", data: selectedSnapshot.gateway, color: COMPONENT_COLORS.gateway },
              { name: "Queue", data: selectedSnapshot.queue, color: COMPONENT_COLORS.queue },
              { name: "Executor", data: selectedSnapshot.executor, color: COMPONENT_COLORS.executor },
              { name: "Schema", data: selectedSnapshot.schema, color: COMPONENT_COLORS.schema },
              { name: "Storage", data: selectedSnapshot.storage, color: COMPONENT_COLORS.storage },
            ].map(({ name, data, color }) => {
              const cpuPct = data.totalCpuRequested > 0 ? (data.totalCpuUsed / data.totalCpuRequested) * 100 : 0
              const memPct = data.totalMemoryRequestedGb > 0 ? (data.totalMemoryUsedGb / data.totalMemoryRequestedGb) * 100 : 0

              return (
                <div key={name} className="border rounded p-2 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-xs font-semibold">{name}</span>
                    </div>
                    <span className="text-[10px] bg-muted px-1 rounded">×{data.instances.length}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground w-7">CPU</span>
                      <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full ${cpuPct > 85 ? 'bg-red-500' : cpuPct > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, cpuPct)}%` }}
                        />
                      </div>
                      <span className="text-[9px] w-8 text-right">{cpuPct.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground w-7">MEM</span>
                      <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full ${memPct > 85 ? 'bg-red-500' : memPct > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, memPct)}%` }}
                        />
                      </div>
                      <span className="text-[9px] w-8 text-right">{memPct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Data Flow and Cache */}
          <div className="grid grid-cols-2 gap-6">
            {/* Data Flow */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Data Flow</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-muted-foreground">From S3</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${selectedSnapshot.executor.bytesReadTotal > 0
                          ? (selectedSnapshot.executor.bytesReadS3 / selectedSnapshot.executor.bytesReadTotal) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right font-medium">{formatBytes(selectedSnapshot.executor.bytesReadS3)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-muted-foreground">From Cache</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${selectedSnapshot.executor.bytesReadTotal > 0
                          ? (selectedSnapshot.executor.bytesReadCache / selectedSnapshot.executor.bytesReadTotal) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right font-medium">{formatBytes(selectedSnapshot.executor.bytesReadCache)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-muted-foreground">Spill</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all"
                      style={{
                        width: `${Math.min(100, (selectedSnapshot.executor.spillBytesWritten / (50 * 1024 * 1024)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right font-medium">{formatBytes(selectedSnapshot.executor.spillBytesWritten)}</span>
                </div>
              </div>
            </div>

            {/* Executor instances */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Executor Instances</div>
              <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto">
                {selectedSnapshot.executor.instances.map((inst) => {
                  const cpuPct = inst.cpuRequested > 0 ? (inst.cpuUsed / inst.cpuRequested) * 100 : 0
                  const memPct = inst.memoryRequestedGb > 0 ? (inst.memoryUsedGb / inst.memoryRequestedGb) * 100 : 0

                  return (
                    <div key={inst.pod} className="border rounded px-2 py-1 bg-background text-[10px]">
                      <div className="font-medium truncate">{inst.pod}</div>
                      <div className="flex gap-2 text-muted-foreground">
                        <span>CPU: <span className={cpuPct > 85 ? 'text-red-500' : cpuPct > 70 ? 'text-orange-500' : 'text-green-600'}>{cpuPct.toFixed(0)}%</span></span>
                        <span>MEM: <span className={memPct > 85 ? 'text-red-500' : memPct > 70 ? 'text-orange-500' : 'text-green-600'}>{memPct.toFixed(0)}%</span></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
