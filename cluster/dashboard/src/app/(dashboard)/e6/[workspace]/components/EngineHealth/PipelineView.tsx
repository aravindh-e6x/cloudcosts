"use client"

import { EngineSnapshot, ComponentInstance, ComponentMetrics } from "./types"
import { COMPONENT_COLORS } from "./constants"

// Pod card showing full spec
function PodCard({ instance, component }: { instance: ComponentInstance; component: string }) {
  const color = COMPONENT_COLORS[component] || "#64748b"
  const cpuPct = instance.cpuRequested > 0 ? (instance.cpuUsed / instance.cpuRequested) * 100 : 0
  const memPct = instance.memoryRequestedGb > 0 ? (instance.memoryUsedGb / instance.memoryRequestedGb) * 100 : 0

  const getCpuColor = (pct: number) => pct > 85 ? "bg-red-500" : pct > 70 ? "bg-orange-400" : "bg-green-500"
  const getMemColor = (pct: number) => pct > 85 ? "bg-red-500" : pct > 70 ? "bg-orange-400" : "bg-blue-500"

  return (
    <div className="border rounded-lg p-2 bg-white" style={{ borderColor: color, borderLeftWidth: 3 }}>
      {/* Row 1: Pod name */}
      <div className="font-semibold text-xs truncate" style={{ color }}>
        {instance.pod}
      </div>

      {/* Row 2: Node info */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
        <span className="truncate">{instance.node}</span>
        <span className="bg-muted px-1 rounded text-[9px] font-mono shrink-0">
          {instance.nodeInstanceType}
        </span>
        <span className="text-[9px] shrink-0">
          ({instance.nodeCpuCapacity}C/{instance.nodeMemoryCapacityGb}G)
        </span>
      </div>

      {/* Row 3: CPU */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[9px] text-muted-foreground w-7">CPU</span>
        <div className="flex-1 h-2.5 bg-muted rounded overflow-hidden">
          <div
            className={`h-full transition-all ${getCpuColor(cpuPct)}`}
            style={{ width: `${Math.min(100, cpuPct)}%` }}
          />
        </div>
        <span className="text-[9px] font-mono w-20 text-right">
          <span className="font-semibold">{instance.cpuUsed.toFixed(1)}</span>
          <span className="text-muted-foreground">/{instance.cpuRequested}</span>
        </span>
      </div>

      {/* Row 4: Memory */}
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[9px] text-muted-foreground w-7">MEM</span>
        <div className="flex-1 h-2.5 bg-muted rounded overflow-hidden">
          <div
            className={`h-full transition-all ${getMemColor(memPct)}`}
            style={{ width: `${Math.min(100, memPct)}%` }}
          />
        </div>
        <span className="text-[9px] font-mono w-20 text-right">
          <span className="font-semibold">{instance.memoryUsedGb.toFixed(1)}</span>
          <span className="text-muted-foreground">/{instance.memoryRequestedGb}G</span>
        </span>
      </div>
    </div>
  )
}

// Component section with expected config and actual pods
function ComponentSection({
  name,
  metrics,
  color,
}: {
  name: string
  metrics: ComponentMetrics
  color: string
}) {
  const { instances, expectedConfig } = metrics
  const actualCount = instances.length

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="px-2 py-1.5 text-xs font-semibold text-white flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <span>{name}</span>
        <span className="text-[10px] font-normal">{actualCount} pods</span>
      </div>

      {/* Expected Config - single line */}
      <div className="px-2 py-1.5 bg-muted/50 border-b text-[10px] flex items-center gap-2">
        <span className="text-muted-foreground">Expected:</span>
        <span className="font-medium">{expectedConfig.podCount} pods</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-mono font-medium">{expectedConfig.instanceType}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium">{expectedConfig.cpuPerPod} CPU</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium">{expectedConfig.memoryPerPodGb}GB</span>
      </div>

      {/* 2x2 Grid of pods */}
      <div className="p-2 bg-muted/30 grid grid-cols-2 gap-2">
        {instances.map((inst) => (
          <PodCard key={inst.pod} instance={inst} component={name.toLowerCase()} />
        ))}
      </div>
    </div>
  )
}

// Single cluster view
function ClusterPipelineGrid({ snapshot, clusterName }: { snapshot: EngineSnapshot; clusterName: string }) {
  const { gateway, queue, executor, schema, storage } = snapshot
  const color = COMPONENT_COLORS.gateway

  // Calculate totals
  const totalPods = gateway.instances.length + queue.instances.length +
    executor.instances.length + schema.instances.length + storage.instances.length
  const expectedPods = gateway.expectedConfig.podCount + queue.expectedConfig.podCount +
    executor.expectedConfig.podCount + schema.expectedConfig.podCount + storage.expectedConfig.podCount

  const totalCpuUsed = gateway.totalCpuUsed + queue.totalCpuUsed +
    executor.totalCpuUsed + schema.totalCpuUsed + storage.totalCpuUsed
  const totalCpuReq = gateway.totalCpuRequested + queue.totalCpuRequested +
    executor.totalCpuRequested + schema.totalCpuRequested + storage.totalCpuRequested
  const totalMemUsed = gateway.totalMemoryUsedGb + queue.totalMemoryUsedGb +
    executor.totalMemoryUsedGb + schema.totalMemoryUsedGb + storage.totalMemoryUsedGb
  const totalMemReq = gateway.totalMemoryRequestedGb + queue.totalMemoryRequestedGb +
    executor.totalMemoryRequestedGb + schema.totalMemoryRequestedGb + storage.totalMemoryRequestedGb

  const cpuUtilPct = totalCpuReq > 0 ? (totalCpuUsed / totalCpuReq) * 100 : 0
  const memUtilPct = totalMemReq > 0 ? (totalMemUsed / totalMemReq) * 100 : 0

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Cluster Header */}
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ backgroundColor: `${color}15` }}>
        <div>
          <span className="font-semibold">{clusterName}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {totalPods}/{expectedPods} pods
            {totalPods !== expectedPods && (
              <span className={totalPods > expectedPods ? "text-yellow-600 ml-1" : "text-red-600 ml-1"}>
                ({totalPods > expectedPods ? "+" : ""}{totalPods - expectedPods})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>
            CPU: <span className="font-medium">{totalCpuUsed.toFixed(0)}/{totalCpuReq}</span>
            <span className="text-muted-foreground ml-1">({cpuUtilPct.toFixed(0)}%)</span>
          </span>
          <span>
            MEM: <span className="font-medium">{totalMemUsed.toFixed(0)}/{totalMemReq}G</span>
            <span className="text-muted-foreground ml-1">({memUtilPct.toFixed(0)}%)</span>
          </span>
        </div>
      </div>

      {/* Components Grid */}
      <div className="p-3 grid grid-cols-5 gap-3">
        <ComponentSection name="Gateway" metrics={gateway} color={color} />
        <ComponentSection name="Queue" metrics={queue} color={color} />
        <ComponentSection name="Executor" metrics={executor} color={color} />
        <ComponentSection name="Schema" metrics={schema} color={color} />
        <ComponentSection name="Storage" metrics={storage} color={color} />
      </div>
    </div>
  )
}

interface PipelineViewProps {
  clusterSnapshots: Map<string, EngineSnapshot>
}

export function PipelineView({ clusterSnapshots }: PipelineViewProps) {
  const clusters = Array.from(clusterSnapshots.entries())

  if (clusters.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No cluster data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <span className="font-medium">Expected</span> config shown in header. <span className="font-medium">Actual</span> pods shown below with node placement and resource usage.
      </div>

      <div className="space-y-4">
        {clusters.map(([clusterName, snapshot]) => (
          <ClusterPipelineGrid key={clusterName} snapshot={snapshot} clusterName={clusterName} />
        ))}
      </div>
    </div>
  )
}
