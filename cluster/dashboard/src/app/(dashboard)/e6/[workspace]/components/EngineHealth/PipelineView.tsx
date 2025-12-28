"use client"

import { useMemo } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Position,
  EdgeProps,
  getBezierPath,
  ReactFlowProvider,
  MarkerType,
  Handle,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { EngineSnapshot, ComponentInstance } from "./types"

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)}M`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)}K`
  }
  return `${bytes}B`
}

// Individual Instance Node - shows one pod with full spec
function InstanceNode({ data }: { data: {
  label: string
  pod: string
  // Node info
  node: string
  nodeCpu: number
  nodeMem: number
  nodeType: string
  // Pod spec
  cpuRequested: number
  memRequested: number
  // Usage
  cpuUsed: number
  memUsed: number
  color: string
} }) {
  const cpuPct = data.cpuRequested > 0 ? (data.cpuUsed / data.cpuRequested) * 100 : 0
  const memPct = data.memRequested > 0 ? (data.memUsed / data.memRequested) * 100 : 0

  return (
    <div
      className="bg-white rounded-lg border-2 shadow-sm px-2 py-1.5 min-w-[140px]"
      style={{ borderColor: data.color }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2"
        style={{ background: data.color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2"
        style={{ background: data.color }}
      />

      {/* Pod name */}
      <div className="text-[9px] font-bold truncate" style={{ color: data.color }}>
        {data.pod}
      </div>

      {/* Node info */}
      <div className="text-[8px] text-muted-foreground mb-1 flex items-center gap-1">
        <span className="truncate">{data.node}</span>
        <span className="text-[7px] bg-muted px-1 rounded">{data.nodeType}</span>
      </div>

      {/* Spec and usage table */}
      <div className="border-t pt-1 mt-1" style={{ borderColor: `${data.color}30` }}>
        {/* CPU row */}
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[7px] text-muted-foreground w-6">CPU</span>
          <div className="flex-1 h-2 bg-muted rounded overflow-hidden relative">
            <div
              className={`h-full transition-all ${cpuPct > 85 ? 'bg-red-500' : cpuPct > 70 ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, cpuPct)}%` }}
            />
          </div>
          <span className="text-[7px] w-16 text-right font-mono">
            {data.cpuUsed.toFixed(1)}/{data.cpuRequested}
          </span>
        </div>

        {/* Memory row */}
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-muted-foreground w-6">MEM</span>
          <div className="flex-1 h-2 bg-muted rounded overflow-hidden relative">
            <div
              className={`h-full transition-all ${memPct > 85 ? 'bg-red-500' : memPct > 70 ? 'bg-orange-400' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, memPct)}%` }}
            />
          </div>
          <span className="text-[7px] w-16 text-right font-mono">
            {data.memUsed.toFixed(0)}/{data.memRequested}G
          </span>
        </div>
      </div>
    </div>
  )
}

// Component Label Node - shows the component type label
function ComponentLabelNode({ data }: { data: { label: string; count: number; color: string } }) {
  return (
    <div className="text-center">
      <div className="text-xs font-bold" style={{ color: data.color }}>{data.label}</div>
      <div className="text-[10px] text-muted-foreground">×{data.count}</div>
    </div>
  )
}

// Data Source Node (S3, Cache)
function DataSourceNode({ data }: { data: { label: string; value: string; color: string } }) {
  return (
    <div className="bg-white rounded-lg border-2 shadow-sm px-2 py-1.5 min-w-[60px]" style={{ borderColor: data.color }}>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" style={{ background: data.color }} />
      <div className="flex items-center gap-1 mb-0.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: data.color }} />
        <span className="text-[9px] text-muted-foreground">{data.label}</span>
      </div>
      <div className="text-[10px] font-bold">{data.value}</div>
    </div>
  )
}

// Output Node (Results)
function OutputNode({ data }: { data: { label: string; ok: number; fail: number; color: string } }) {
  return (
    <div className="bg-white rounded-lg border-2 shadow-sm px-2 py-1.5 min-w-[60px]" style={{ borderColor: data.color }}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" style={{ background: data.color }} />
      <div className="flex items-center gap-1 mb-0.5">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: data.color }} />
        <span className="text-[9px] font-medium">{data.label}</span>
      </div>
      <div className="flex gap-2 text-[9px]">
        <span className="text-green-600">{data.ok} ok</span>
        {data.fail > 0 && <span className="text-red-600">{data.fail} fail</span>}
      </div>
    </div>
  )
}

// Animated Edge with flowing dots
function AnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const animationDuration = data?.speed === "fast" ? "1s" : data?.speed === "slow" ? "3s" : "2s"
  const strokeColor = (data?.color as string) || "#a1a1aa"
  const strokeWidth = (data?.width as number) || 1

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeOpacity={0.2}
      />
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        markerEnd={markerEnd}
        strokeDasharray="4 4"
        style={{
          animation: `flowAnimation ${animationDuration} linear infinite`,
        }}
      />
      <circle r={Math.max(1.5, strokeWidth * 0.8)} fill={strokeColor}>
        <animateMotion dur={animationDuration} repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  )
}

const nodeTypes = {
  instance: InstanceNode,
  componentLabel: ComponentLabelNode,
  dataSource: DataSourceNode,
  output: OutputNode,
}

const edgeTypes = {
  animated: AnimatedEdge,
}

// Layout constants
const NODE_WIDTH = 145
const NODE_HEIGHT = 70
const NODE_VERTICAL_GAP = 8
const COLUMN_GAP = 165
const LABEL_HEIGHT = 30

interface SingleClusterGraphProps {
  snapshot: EngineSnapshot
  clusterName: string
}

function SingleClusterGraph({ snapshot, clusterName }: SingleClusterGraphProps) {
  const { gateway, queue, executor, schema, storage } = snapshot

  // Build nodes and edges
  const { nodes, edges, graphHeight } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Component definitions with their instances
    const components = [
      { id: "gateway", label: "Gateway", instances: gateway.instances, color: "#8b5cf6" },
      { id: "queue", label: "Queue", instances: queue.instances, color: "#f59e0b" },
      { id: "executor", label: "Executor", instances: executor.instances, color: "#10b981" },
      { id: "schema", label: "Schema", instances: schema.instances, color: "#ec4899" },
      { id: "storage", label: "Storage", instances: storage.instances, color: "#06b6d4" },
    ]

    // Find max instances for height calculation
    const maxInstances = Math.max(...components.map(c => c.instances.length))
    const graphHeight = Math.max(200, LABEL_HEIGHT + maxInstances * (NODE_HEIGHT + NODE_VERTICAL_GAP) + 20)

    // Data sources (column 0)
    const sourceX = 10
    const sourceY = graphHeight / 2 - 30
    nodes.push({
      id: "s3",
      type: "dataSource",
      position: { x: sourceX, y: sourceY - 25 },
      data: { label: "S3", value: formatBytes(executor.bytesReadS3), color: "#3b82f6" },
    })
    nodes.push({
      id: "cache",
      type: "dataSource",
      position: { x: sourceX, y: sourceY + 25 },
      data: { label: "Cache", value: formatBytes(executor.bytesReadCache), color: "#22c55e" },
    })

    // Build component columns
    let columnX = 100

    components.forEach((comp, colIdx) => {
      const instanceCount = comp.instances.length
      const columnHeight = instanceCount * (NODE_HEIGHT + NODE_VERTICAL_GAP)
      const startY = (graphHeight - columnHeight) / 2

      // Add label node above instances
      nodes.push({
        id: `${comp.id}-label`,
        type: "componentLabel",
        position: { x: columnX + NODE_WIDTH / 2 - 25, y: startY - LABEL_HEIGHT },
        data: { label: comp.label, count: instanceCount, color: comp.color },
      })

      // Add instance nodes
      comp.instances.forEach((inst, instIdx) => {
        const nodeId = `${comp.id}-${instIdx}`
        nodes.push({
          id: nodeId,
          type: "instance",
          position: { x: columnX, y: startY + instIdx * (NODE_HEIGHT + NODE_VERTICAL_GAP) },
          data: {
            label: comp.label,
            pod: inst.pod,
            // Node info
            node: inst.node,
            nodeCpu: inst.nodeCpuCapacity,
            nodeMem: inst.nodeMemoryCapacityGb,
            nodeType: inst.nodeInstanceType,
            // Pod spec
            cpuRequested: inst.cpuRequested,
            memRequested: inst.memoryRequestedGb,
            // Usage
            cpuUsed: inst.cpuUsed,
            memUsed: inst.memoryUsedGb,
            color: comp.color,
          },
        })

        // Create edges from previous column
        if (colIdx === 0) {
          // First component (Gateway) - connect from data sources
          edges.push({
            id: `s3-to-${nodeId}`,
            source: "s3",
            target: nodeId,
            type: "animated",
            data: { color: "#3b82f6", speed: "normal", width: 1 },
          })
          edges.push({
            id: `cache-to-${nodeId}`,
            source: "cache",
            target: nodeId,
            type: "animated",
            data: { color: "#22c55e", speed: "fast", width: 1 },
          })
        } else {
          // Connect from all instances of previous component
          const prevComp = components[colIdx - 1]
          prevComp.instances.forEach((_, prevIdx) => {
            const sourceId = `${prevComp.id}-${prevIdx}`
            edges.push({
              id: `${sourceId}-to-${nodeId}`,
              source: sourceId,
              target: nodeId,
              type: "animated",
              data: { color: prevComp.color, speed: "fast", width: 0.5 },
            })
          })
        }
      })

      columnX += COLUMN_GAP
    })

    // Output node (results)
    const lastComp = components[components.length - 1]
    const outputY = graphHeight / 2 - 20
    nodes.push({
      id: "output",
      type: "output",
      position: { x: columnX, y: outputY },
      data: {
        label: "Results",
        ok: gateway.queriesSucceeded,
        fail: gateway.queriesFailed,
        color: "#64748b"
      },
    })

    // Connect last component to output
    lastComp.instances.forEach((_, idx) => {
      edges.push({
        id: `${lastComp.id}-${idx}-to-output`,
        source: `${lastComp.id}-${idx}`,
        target: "output",
        type: "animated",
        data: { color: lastComp.color, speed: "fast", width: 0.5 },
      })
    })

    return { nodes, edges, graphHeight }
  }, [gateway, queue, executor, schema, storage])

  // Calculate totals
  const totalPods = gateway.instances.length + queue.instances.length +
    executor.instances.length + schema.instances.length + storage.instances.length
  const totalCpu = gateway.totalCpuRequested + queue.totalCpuRequested +
    executor.totalCpuRequested + schema.totalCpuRequested + storage.totalCpuRequested
  const totalMem = gateway.totalMemoryRequestedGb + queue.totalMemoryRequestedGb +
    executor.totalMemoryRequestedGb + schema.totalMemoryRequestedGb + storage.totalMemoryRequestedGb

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold">{clusterName}</span>
          <span className="text-xs text-muted-foreground ml-2">{totalPods} pods</span>
        </div>
        <div className="text-xs text-muted-foreground flex gap-3">
          <span>CPU: {totalCpu} cores</span>
          <span>Mem: {totalMem}GB</span>
          <span>Queries: {gateway.queriesRunning} running</span>
          {gateway.queriesQueued > 0 && (
            <span className="text-orange-500">+{gateway.queriesQueued} queued</span>
          )}
        </div>
      </div>
      <div style={{ height: Math.min(graphHeight + 20, 400) }} className="w-full">
        <style jsx global>{`
          @keyframes flowAnimation {
            from { stroke-dashoffset: 16; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.05 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#e5e7eb" />
        </ReactFlow>
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
        Each node represents a pod. Data flows left → right through the pipeline.
      </div>

      <div className="space-y-4">
        {clusters.map(([clusterName, snapshot]) => (
          <ReactFlowProvider key={clusterName}>
            <SingleClusterGraph snapshot={snapshot} clusterName={clusterName} />
          </ReactFlowProvider>
        ))}
      </div>
    </div>
  )
}
