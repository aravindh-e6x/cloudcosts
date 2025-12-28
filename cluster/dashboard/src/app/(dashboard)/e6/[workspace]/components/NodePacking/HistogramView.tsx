"use client"

import { useMemo } from "react"
import { NodeSnapshot } from "./types"

interface HistogramViewProps {
  nodes: NodeSnapshot[]
}

export function HistogramView({ nodes }: HistogramViewProps) {
  const histogramData = useMemo(() => {
    const ranges = [
      { label: "90-100%", min: 90, max: 101, color: "bg-green-600" },
      { label: "80-90%", min: 80, max: 90, color: "bg-green-500" },
      { label: "70-80%", min: 70, max: 80, color: "bg-yellow-400" },
      { label: "60-70%", min: 60, max: 70, color: "bg-yellow-500" },
      { label: "50-60%", min: 50, max: 60, color: "bg-orange-400" },
      { label: "40-50%", min: 40, max: 50, color: "bg-orange-500" },
      { label: "<40%", min: 0, max: 40, color: "bg-red-500" },
    ]

    return ranges.map((range) => {
      const cpuCount = nodes.filter((n) => {
        const pct = (n.cpuAllocated / n.cpuCapacity) * 100
        return pct >= range.min && pct < range.max
      }).length
      const memCount = nodes.filter((n) => {
        const pct = (n.memAllocatedGb / n.memCapacityGb) * 100
        return pct >= range.min && pct < range.max
      }).length
      return { ...range, cpuCount, memCount }
    })
  }, [nodes])

  const maxCount = Math.max(...histogramData.flatMap((d) => [d.cpuCount, d.memCount]), 1)

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="text-sm font-medium mb-3">CPU Packing</div>
        <div className="space-y-1">
          {histogramData.map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-muted-foreground">{row.label}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full ${row.color} transition-all`}
                  style={{ width: `${(row.cpuCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right">{row.cpuCount}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-3">Memory Packing</div>
        <div className="space-y-1">
          {histogramData.map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-muted-foreground">{row.label}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full ${row.color} transition-all`}
                  style={{ width: `${(row.memCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right">{row.memCount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
