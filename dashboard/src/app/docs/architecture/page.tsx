"use client"

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

// ============================================
// CUSTOM NODE COMPONENTS
// ============================================

function SourceNode({ data }: { data: { label: string; subtitle?: string } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-purple-500 shadow-sm px-4 py-3 min-w-[180px]">
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-purple-500" />
        <span className="text-xs text-zinc-500">External Source</span>
      </div>
      <div className="font-medium text-sm text-zinc-900">{data.label}</div>
      {data.subtitle && (
        <div className="text-xs text-zinc-400 mt-0.5">{data.subtitle}</div>
      )}
    </div>
  )
}

function ExporterNode({ data }: { data: { label: string; interval?: string } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-sm px-4 py-3 min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-zinc-500">Exporter</span>
        {data.interval && (
          <span className="text-xs text-emerald-600 ml-auto">{data.interval}</span>
        )}
      </div>
      <div className="font-medium text-sm text-zinc-900">{data.label}</div>
    </div>
  )
}

function DatabaseNode({ data }: { data: { label: string; databases?: string[] } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-md px-5 py-4 min-w-[200px]">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-emerald-500" />
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-zinc-500">Database</span>
      </div>
      <div className="font-semibold text-base text-zinc-900">{data.label}</div>
      {data.databases && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.databases.map((db) => (
            <span key={db} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">
              {db}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ConsumerNode({ data }: { data: { label: string; url?: string } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-blue-500 shadow-sm px-4 py-3 min-w-[160px]">
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <span className="text-xs text-zinc-500">Consumer</span>
      </div>
      <div className="font-medium text-sm text-zinc-900">{data.label}</div>
      {data.url && (
        <div className="text-xs text-blue-500 mt-0.5">{data.url}</div>
      )}
    </div>
  )
}

function ClusterNode({ data }: { data: { label: string; components?: string[] } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-orange-500 shadow-sm px-4 py-3 w-[220px]">
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
        <span className="text-xs text-zinc-500">EKS Cluster</span>
      </div>
      <div className="font-medium text-sm text-zinc-900 mb-2">{data.label}</div>
      <div className="border-t border-zinc-100 pt-2">
        <div className="text-xs text-zinc-400 mb-1.5">monitoring-agent</div>
        {data.components && (
          <div className="flex flex-wrap gap-1">
            {data.components.map((comp) => (
              <span key={comp} className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                {comp}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// ANIMATED EDGE WITH DOTS
// ============================================

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

  const animationDuration = data?.speed === "fast" ? "1.5s" : data?.speed === "slow" ? "4s" : "2.5s"
  const strokeColor = (data?.color as string) || "#a1a1aa"

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        markerEnd={markerEnd}
      />
      <circle r="4" fill={strokeColor}>
        <animateMotion dur={animationDuration} repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="4" fill={strokeColor}>
        <animateMotion dur={animationDuration} repeatCount="indefinite" path={edgePath} begin={`-${parseFloat(animationDuration) / 2}s`} />
      </circle>
    </>
  )
}

// ============================================
// NODE AND EDGE TYPES
// ============================================

const nodeTypes = {
  source: SourceNode,
  exporter: ExporterNode,
  database: DatabaseNode,
  consumer: ConsumerNode,
  cluster: ClusterNode,
}

const edgeTypes = {
  animated: AnimatedEdge,
}

// ============================================
// ARCHITECTURE DIAGRAM DATA
// ============================================

const initialNodes: Node[] = [
  // EKS Clusters (top row) - with proper gaps (220px width + 30px gap = 250px spacing)
  {
    id: "eks-customer-1",
    type: "cluster",
    position: { x: 0, y: 0 },
    data: {
      label: "customer-1",
      components: ["Alloy", "OpenCost", "kube-state-metrics", "node-exporter"]
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
  {
    id: "eks-customer-2",
    type: "cluster",
    position: { x: 250, y: 0 },
    data: {
      label: "customer-2",
      components: ["Alloy", "OpenCost", "kube-state-metrics", "node-exporter"]
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
  {
    id: "eks-more",
    type: "cluster",
    position: { x: 500, y: 0 },
    data: {
      label: "+ more clusters",
      components: ["Alloy", "OpenCost", "kube-state-metrics", "node-exporter"]
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },

  // External Sources (left column)
  {
    id: "aws",
    type: "source",
    position: { x: 0, y: 240 },
    data: { label: "AWS CloudWatch", subtitle: "Multiple accounts" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "vantage",
    type: "source",
    position: { x: 0, y: 340 },
    data: { label: "Vantage API", subtitle: "Multi-cloud costs" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "poc-grafana",
    type: "source",
    position: { x: 0, y: 440 },
    data: { label: "POC Grafana", subtitle: "Mimir metrics" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },

  // Exporters (center-left column)
  {
    id: "alloy-cloudwatch",
    type: "exporter",
    position: { x: 280, y: 240 },
    data: { label: "alloy-cloudwatch", interval: "5m" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "vantage-exporter",
    type: "exporter",
    position: { x: 280, y: 340 },
    data: { label: "vantage-exporter", interval: "24h" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "e6metrics-exporter",
    type: "exporter",
    position: { x: 280, y: 440 },
    data: { label: "e6metrics-exporter", interval: "5m" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },

  // Database (center)
  {
    id: "greptimedb",
    type: "database",
    position: { x: 540, y: 320 },
    data: {
      label: "GreptimeDB",
      databases: ["kubernetes", "aws", "vantage", "e6"]
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },

  // Consumers (right column) - more gap from GreptimeDB
  {
    id: "dashboard",
    type: "consumer",
    position: { x: 880, y: 290 },
    data: { label: "Dashboard", url: "cloudcosts.in" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "grafana",
    type: "consumer",
    position: { x: 880, y: 390 },
    data: { label: "Grafana", url: "grafana.cloudcosts.in" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
]

const initialEdges: Edge[] = [
  // External sources to exporters
  {
    id: "aws-to-exporter",
    source: "aws",
    target: "alloy-cloudwatch",
    type: "animated",
    data: { color: "#a855f7", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7", width: 20, height: 20 },
  },
  {
    id: "vantage-to-exporter",
    source: "vantage",
    target: "vantage-exporter",
    type: "animated",
    data: { color: "#a855f7", speed: "slow" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7", width: 20, height: 20 },
  },
  {
    id: "poc-to-exporter",
    source: "poc-grafana",
    target: "e6metrics-exporter",
    type: "animated",
    data: { color: "#a855f7", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7", width: 20, height: 20 },
  },

  // Exporters to GreptimeDB
  {
    id: "cloudwatch-to-db",
    source: "alloy-cloudwatch",
    target: "greptimedb",
    type: "animated",
    data: { color: "#10b981", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },
  {
    id: "vantage-to-db",
    source: "vantage-exporter",
    target: "greptimedb",
    type: "animated",
    data: { color: "#10b981", speed: "slow" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },
  {
    id: "e6metrics-to-db",
    source: "e6metrics-exporter",
    target: "greptimedb",
    type: "animated",
    data: { color: "#10b981", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },

  // GreptimeDB to consumers
  {
    id: "db-to-dashboard",
    source: "greptimedb",
    target: "dashboard",
    type: "animated",
    data: { color: "#3b82f6", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6", width: 20, height: 20 },
  },
  {
    id: "db-to-grafana",
    source: "greptimedb",
    target: "grafana",
    type: "animated",
    data: { color: "#3b82f6", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6", width: 20, height: 20 },
  },

  // EKS clusters to GreptimeDB
  {
    id: "eks-1-to-db",
    source: "eks-customer-1",
    target: "greptimedb",
    targetHandle: "top",
    type: "animated",
    data: { color: "#f97316", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316", width: 20, height: 20 },
  },
  {
    id: "eks-2-to-db",
    source: "eks-customer-2",
    target: "greptimedb",
    targetHandle: "top",
    type: "animated",
    data: { color: "#f97316", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316", width: 20, height: 20 },
  },
  {
    id: "eks-more-to-db",
    source: "eks-more",
    target: "greptimedb",
    targetHandle: "top",
    type: "animated",
    data: { color: "#f97316", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316", width: 20, height: 20 },
  },
]

// ============================================
// MAIN DIAGRAM COMPONENT
// ============================================

function ArchitectureDiagram() {
  return (
    <div className="h-[650px] w-full overflow-hidden">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d4d4d8" className="opacity-50" />
      </ReactFlow>
    </div>
  )
}

// ============================================
// LEGEND COMPONENT
// ============================================

function Legend() {
  const items = [
    { color: "bg-purple-500", label: "External Source" },
    { color: "bg-emerald-500", label: "Exporter" },
    { color: "bg-primary", label: "Database" },
    { color: "bg-blue-500", label: "Consumer" },
    { color: "bg-orange-500", label: "EKS Cluster" },
  ]

  return (
    <div className="flex flex-wrap gap-6 mt-6 justify-center">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ArchitecturePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Architecture</h1>
        <p className="text-muted-foreground">
          Technical documentation for the CloudCosts monitoring infrastructure
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">System Overview</h2>
        <p className="text-muted-foreground mb-6">
          Data flows from external sources and EKS clusters through exporters into GreptimeDB,
          which serves as the central time-series database for all cost and metrics data.
        </p>
        <ReactFlowProvider>
          <ArchitectureDiagram />
        </ReactFlowProvider>
        <Legend />
      </div>
    </div>
  )
}
