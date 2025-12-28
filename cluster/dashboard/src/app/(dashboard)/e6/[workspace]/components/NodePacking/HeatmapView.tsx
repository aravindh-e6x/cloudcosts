"use client"

import { useMemo, useState } from "react"
import { NodeSnapshot, getHeatColor } from "./types"

interface HeatmapViewProps {
  nodes: NodeSnapshot[]
}

export function HeatmapView({ nodes }: HeatmapViewProps) {
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const aPct = (a.cpuAllocated / a.cpuCapacity) * 100
      const bPct = (b.cpuAllocated / b.cpuCapacity) * 100
      return bPct - aPct
    })
  }, [nodes])

  const [hoveredNode, setHoveredNode] = useState<NodeSnapshot | null>(null)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">CPU (each cell = 1 node, sorted by utilization)</div>
          <div className="flex flex-wrap gap-0.5">
            {sortedNodes.map((n) => {
              const cpuPct = (n.cpuAllocated / n.cpuCapacity) * 100
              return (
                <div
                  key={n.node}
                  className={`w-3 h-3 rounded-sm ${getHeatColor(cpuPct)} cursor-pointer hover:ring-2 hover:ring-primary transition-all`}
                  onMouseEnter={() => setHoveredNode(n)}
                  onMouseLeave={() => setHoveredNode(null)}
                />
              )
            })}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Memory</div>
          <div className="flex flex-wrap gap-0.5">
            {sortedNodes.map((n) => {
              const memPct = (n.memAllocatedGb / n.memCapacityGb) * 100
              return (
                <div
                  key={n.node}
                  className={`w-3 h-3 rounded-sm ${getHeatColor(memPct)} cursor-pointer hover:ring-2 hover:ring-primary transition-all`}
                  onMouseEnter={() => setHoveredNode(n)}
                  onMouseLeave={() => setHoveredNode(null)}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>&gt;80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-yellow-500" />
          <span>60-80%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span>40-60%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span>&lt;40%</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="border rounded-lg p-3 bg-background shadow-lg">
          <div className="font-mono text-sm font-medium">{hoveredNode.node}</div>
          <div className="text-xs text-muted-foreground">{hoveredNode.instanceType}</div>
          <div className="flex gap-4 mt-2 text-sm">
            <span>
              CPU: {hoveredNode.cpuAllocated.toFixed(1)}/{hoveredNode.cpuCapacity} (
              {((hoveredNode.cpuAllocated / hoveredNode.cpuCapacity) * 100).toFixed(0)}%)
            </span>
            <span>
              MEM: {hoveredNode.memAllocatedGb.toFixed(0)}/{hoveredNode.memCapacityGb}GB (
              {((hoveredNode.memAllocatedGb / hoveredNode.memCapacityGb) * 100).toFixed(0)}%)
            </span>
            <span>{hoveredNode.podCount} pods</span>
          </div>
        </div>
      )}
    </div>
  )
}
