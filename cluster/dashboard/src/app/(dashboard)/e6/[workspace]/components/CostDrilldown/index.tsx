"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { DollarSign, ChevronRight, ChevronDown, Cpu, HardDrive, Server, Box, Layers, Component, ChevronsUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "e6ds"
import { generateCostDrilldownData } from "./mockData"
import { useTimeline } from "../TimelineContext"
import { NodeMetrics, E6ClusterMetrics, PodMetrics, E6ComponentMetrics } from "./types"

// Context for expand all state
const ExpandAllContext = createContext<boolean>(false)
const useExpandAll = () => useContext(ExpandAllContext)

// Indentation helper
function Indent({ level }: { level: number }) {
  return <div style={{ width: level * 24 }} className="flex-shrink-0" />
}

// Progress bar component
function UtilBar({ used, total, width = 80 }: { used: number; total: number; width?: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 bg-gray-200 rounded" style={{ width }}>
        <div
          className="h-2 bg-green-500 rounded"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-10">{pct.toFixed(0)}%</span>
    </div>
  )
}

// Level 4: Individual Pod details (CPU used, Memory used)
function PodDetail({ pod, level }: { pod: PodMetrics; level: number }) {
  const expandAll = useExpandAll()
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expandAll || expanded

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center py-1.5 px-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Indent level={level} />
        {isExpanded ? <ChevronDown className="h-3 w-3 mr-2" /> : <ChevronRight className="h-3 w-3 mr-2" />}
        <Box className="h-3 w-3 mr-2 text-blue-500" />
        <span className="font-mono text-xs">{pod.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">({pod.component})</span>
      </div>
      {isExpanded && (
        <div className="bg-slate-50">
          {/* How much CPU is used */}
          <div className="flex items-center py-1 px-2">
            <Indent level={level + 1} />
            <Cpu className="h-3 w-3 mr-2 text-orange-500" />
            <span className="text-xs text-muted-foreground w-24">CPU used:</span>
            <span className="text-xs font-medium w-20">{pod.cpuUsed} / {pod.cpuRequested} cores</span>
            <UtilBar used={pod.cpuUsed} total={pod.cpuRequested} width={60} />
          </div>
          {/* How much Memory is used */}
          <div className="flex items-center py-1 px-2">
            <Indent level={level + 1} />
            <HardDrive className="h-3 w-3 mr-2 text-purple-500" />
            <span className="text-xs text-muted-foreground w-24">Memory used:</span>
            <span className="text-xs font-medium w-20">{pod.memUsedGb} / {pod.memRequestedGb} GB</span>
            <UtilBar used={pod.memUsedGb} total={pod.memRequestedGb} width={60} />
          </div>
        </div>
      )}
    </div>
  )
}

// Level 3: Pods in a node (how many pods, then each pod)
function NodePods({ pods, level }: { pods: PodMetrics[]; level: number }) {
  const expandAll = useExpandAll()
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expandAll || expanded

  return (
    <div className="border-b border-gray-100">
      <div
        className="flex items-center py-1.5 px-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Indent level={level} />
        {isExpanded ? <ChevronDown className="h-3 w-3 mr-2" /> : <ChevronRight className="h-3 w-3 mr-2" />}
        <Box className="h-3 w-3 mr-2 text-blue-500" />
        <span className="text-xs">How many pods?</span>
        <span className="ml-2 text-sm font-bold">{pods.length} pods</span>
      </div>
      {isExpanded && (
        <div className="bg-gray-50">
          {pods.map((pod) => (
            <PodDetail key={pod.name} pod={pod} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// Level 2: Individual Node details (pods, CPU allocated, Memory allocated)
function NodeDetail({ node, level }: { node: NodeMetrics; level: number }) {
  const expandAll = useExpandAll()
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expandAll || expanded

  return (
    <div className="border-b border-gray-200 last:border-0">
      <div
        className="flex items-center py-2 px-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Indent level={level} />
        {isExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
        <Server className="h-4 w-4 mr-2 text-slate-600" />
        <span className="font-mono text-sm">{node.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">({node.instanceType})</span>
        <span className="ml-auto text-sm font-bold">${node.costPerDay.toFixed(2)}/day</span>
      </div>
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {/* How many pods in this node */}
          <NodePods pods={node.pods} level={level + 1} />

          {/* How much CPU is allocated */}
          <div className="flex items-center py-1.5 px-2 border-b border-gray-100">
            <Indent level={level + 1} />
            <Cpu className="h-3 w-3 mr-2 text-orange-500" />
            <span className="text-xs text-muted-foreground w-32">CPU allocated:</span>
            <span className="text-xs font-medium w-24">{node.cpuAllocated} / {node.cpuCapacity} cores</span>
            <UtilBar used={node.cpuAllocated} total={node.cpuCapacity} />
          </div>

          {/* How much Memory is allocated */}
          <div className="flex items-center py-1.5 px-2">
            <Indent level={level + 1} />
            <HardDrive className="h-3 w-3 mr-2 text-purple-500" />
            <span className="text-xs text-muted-foreground w-32">Memory allocated:</span>
            <span className="text-xs font-medium w-24">{node.memAllocatedGb} / {node.memCapacityGb} GB</span>
            <UtilBar used={node.memAllocatedGb} total={node.memCapacityGb} />
          </div>
        </div>
      )}
    </div>
  )
}

// Level 1: How many nodes (with cost split per node)
function NodesSection({ nodes, totalCost, level }: { nodes: NodeMetrics[]; totalCost: number; level: number }) {
  const expandAll = useExpandAll()
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expandAll || expanded

  return (
    <div className="border-b border-gray-200">
      <div
        className="flex items-center py-2 px-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Indent level={level} />
        {isExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
        <Server className="h-4 w-4 mr-2 text-slate-600" />
        <span className="text-sm">How many nodes are resulting in this cost?</span>
        <span className="ml-2 text-lg font-bold">{nodes.length} nodes</span>
      </div>
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {/* Cost split per node header */}
          <div className="flex items-center py-1.5 px-2 bg-gray-100 border-b border-gray-200">
            <Indent level={level + 1} />
            <span className="text-xs font-medium text-muted-foreground">Cost split per node:</span>
          </div>
          {nodes.map((node) => (
            <NodeDetail key={node.name} node={node} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// E6 Component Detail (pods, CPU, Memory)
function E6ComponentDetail({ component, level }: { component: E6ComponentMetrics; level: number }) {
  const expandAll = useExpandAll()
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expandAll || expanded

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center py-1.5 px-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Indent level={level} />
        {isExpanded ? <ChevronDown className="h-3 w-3 mr-2" /> : <ChevronRight className="h-3 w-3 mr-2" />}
        <Component className="h-3 w-3 mr-2 text-green-600" />
        <span className="text-sm font-medium">{component.component}</span>
      </div>
      {isExpanded && (
        <div className="bg-slate-50">
          {/* How many pods */}
          <div className="flex items-center py-1 px-2 border-b border-gray-100">
            <Indent level={level + 1} />
            <Box className="h-3 w-3 mr-2 text-blue-500" />
            <span className="text-xs text-muted-foreground w-24">Pods:</span>
            <span className="text-xs font-bold">{component.podCount}</span>
          </div>
          {/* CPU */}
          <div className="flex items-center py-1 px-2 border-b border-gray-100">
            <Indent level={level + 1} />
            <Cpu className="h-3 w-3 mr-2 text-orange-500" />
            <span className="text-xs text-muted-foreground w-24">CPU:</span>
            <span className="text-xs font-medium w-20">{component.cpuUsed} / {component.cpuRequested} cores</span>
            <UtilBar used={component.cpuUsed} total={component.cpuRequested} width={60} />
          </div>
          {/* Memory */}
          <div className="flex items-center py-1 px-2">
            <Indent level={level + 1} />
            <HardDrive className="h-3 w-3 mr-2 text-purple-500" />
            <span className="text-xs text-muted-foreground w-24">Memory:</span>
            <span className="text-xs font-medium w-20">{component.memUsedGb} / {component.memRequestedGb} GB</span>
            <UtilBar used={component.memUsedGb} total={component.memRequestedGb} width={60} />
          </div>
        </div>
      )}
    </div>
  )
}

// E6 Cluster Detail (components breakdown)
function E6ClusterDetail({ cluster, level }: { cluster: E6ClusterMetrics; level: number }) {
  const expandAll = useExpandAll()
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expandAll || expanded

  return (
    <div className="border-b border-gray-200 last:border-0">
      <div
        className="flex items-center py-2 px-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Indent level={level} />
        {isExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
        <Layers className="h-4 w-4 mr-2 text-indigo-600" />
        <span className="font-mono text-sm font-medium">{cluster.name}</span>
        <span className="ml-auto text-sm font-bold">${cluster.costPerDay.toFixed(2)}/day</span>
      </div>
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {/* For each component */}
          <div className="flex items-center py-1.5 px-2 bg-gray-100 border-b border-gray-200">
            <Indent level={level + 1} />
            <span className="text-xs font-medium text-muted-foreground">Components:</span>
          </div>
          {cluster.components.map((comp) => (
            <E6ComponentDetail key={comp.component} component={comp} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

// E6 Clusters Section
function E6ClustersSection({ clusters, level }: { clusters: E6ClusterMetrics[]; level: number }) {
  const expandAll = useExpandAll()
  const [expanded, setExpanded] = useState(false)
  const isExpanded = expandAll || expanded
  const totalClusterCost = clusters.reduce((sum, c) => sum + c.costPerDay, 0)

  return (
    <div className="border-b border-gray-200">
      <div
        className="flex items-center py-2 px-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Indent level={level} />
        {isExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
        <Layers className="h-4 w-4 mr-2 text-indigo-600" />
        <span className="text-sm">What is the cost per E6 cluster?</span>
        <span className="ml-2 text-lg font-bold">{clusters.length} clusters</span>
        <span className="ml-2 text-sm text-muted-foreground">(${totalClusterCost.toFixed(2)}/day)</span>
      </div>
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {clusters.map((cluster) => (
            <E6ClusterDetail key={cluster.name} cluster={cluster} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CostDrilldown() {
  const { currentTimestamp } = useTimeline()
  const [expandAll, setExpandAll] = useState(false)

  const data = useMemo(() => {
    if (!currentTimestamp) return null
    return generateCostDrilldownData(currentTimestamp)
  }, [currentTimestamp])

  if (!currentTimestamp || !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Cost Drilldown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ExpandAllContext.Provider value={expandAll}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5" />
              Cost Drilldown
            </CardTitle>
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {expandAll ? "Collapse All" : "Expand All"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {/* Level 0: What is my cost? */}
            <div className="flex items-center py-3 px-4 bg-slate-100 border-b border-gray-200">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              <span className="text-base font-medium">What is my cost?</span>
              <span className="ml-3 text-2xl font-bold">${data.totalCostPerDay.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground ml-1">/day</span>
            </div>

            {/* Level 1: How many nodes */}
            <NodesSection nodes={data.nodes} totalCost={data.totalCostPerDay} level={0} />

            {/* Level 1: Cost per E6 cluster */}
            <E6ClustersSection clusters={data.e6Clusters} level={0} />
          </div>
        </CardContent>
      </Card>
    </ExpandAllContext.Provider>
  )
}

export * from "./types"
