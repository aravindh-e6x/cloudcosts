"use client"

import { useMemo, useState } from "react"
import { NodeSnapshot, getPackingColor, getPackingBgColor } from "./types"

interface CardsViewProps {
  nodes: NodeSnapshot[]
}

export function CardsView({ nodes }: CardsViewProps) {
  // Virtualization: 3 columns, each row is ~120px tall
  const COLUMNS = 3
  const ROW_HEIGHT = 130
  const CONTAINER_HEIGHT = 400
  const OVERSCAN = 2

  const [scrollTop, setScrollTop] = useState(0)

  // Group nodes into rows of 3
  const rows = useMemo(() => {
    const result: NodeSnapshot[][] = []
    for (let i = 0; i < nodes.length; i += COLUMNS) {
      result.push(nodes.slice(i, i + COLUMNS))
    }
    return result
  }, [nodes])

  const totalHeight = rows.length * ROW_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(
    rows.length,
    Math.ceil((scrollTop + CONTAINER_HEIGHT) / ROW_HEIGHT) + OVERSCAN
  )
  const visibleRows = rows.slice(startIndex, endIndex)
  const offsetY = startIndex * ROW_HEIGHT

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Showing {nodes.length} nodes
      </div>
      <div
        className="overflow-y-auto border rounded-lg"
        style={{ height: CONTAINER_HEIGHT }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleRows.map((row, rowIndex) => (
              <div
                key={startIndex + rowIndex}
                className="grid grid-cols-3 gap-3 p-2"
                style={{ height: ROW_HEIGHT }}
              >
                {row.map((node) => {
                  const cpuPct = (node.cpuAllocated / node.cpuCapacity) * 100
                  const memPct = (node.memAllocatedGb / node.memCapacityGb) * 100
                  const avgPct = (cpuPct + memPct) / 2

                  return (
                    <div
                      key={node.node}
                      className={`border rounded-lg p-3 ${getPackingBgColor(avgPct)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-medium truncate">{node.node}</span>
                        <span className="text-xs text-muted-foreground">{node.podCount} pods</span>
                      </div>

                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">CPU</span>
                          <span>
                            {node.cpuAllocated.toFixed(1)}/{node.cpuCapacity}
                            <span className="text-muted-foreground ml-1">({cpuPct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-white/50 rounded overflow-hidden border">
                          <div
                            className={`h-full ${getPackingColor(cpuPct)} transition-all`}
                            style={{ width: `${Math.min(cpuPct, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">MEM</span>
                          <span>
                            {node.memAllocatedGb.toFixed(0)}/{node.memCapacityGb}GB
                            <span className="text-muted-foreground ml-1">({memPct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-white/50 rounded overflow-hidden border">
                          <div
                            className={`h-full ${getPackingColor(memPct)} transition-all`}
                            style={{ width: `${Math.min(memPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
