"use client"

import { useMemo } from "react"
import { ComponentSnapshot, TimeSnapshot } from "./types"

interface OverviewViewProps {
  snapshot: TimeSnapshot
}

export function OverviewView({ snapshot }: OverviewViewProps) {
  // Flatten all components
  const allComponents = useMemo(() => {
    const components: ComponentSnapshot[] = [...snapshot.workspaceComponents]
    Object.values(snapshot.clusters).forEach((clusterComponents) => {
      components.push(...clusterComponents)
    })
    return components
  }, [snapshot])

  // Histogram data
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
      const cpuCount = allComponents.filter((c) => {
        const pct = c.cpuRequested > 0 ? (c.cpuAllocated / c.cpuRequested) * 100 : 0
        return pct >= range.min && pct < range.max
      }).length
      const memCount = allComponents.filter((c) => {
        const pct = c.memRequestedGb > 0 ? (c.memAllocatedGb / c.memRequestedGb) * 100 : 0
        return pct >= range.min && pct < range.max
      }).length
      return { ...range, cpuCount, memCount }
    })
  }, [allComponents])

  const maxCount = Math.max(...histogramData.flatMap((d) => [d.cpuCount, d.memCount]), 1)

  return (
    <div className="space-y-6">
      {/* Histogram */}
      <div>
        <div className="text-sm font-medium mb-3">Utilization Histogram</div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-2">CPU Utilization</div>
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
            <div className="text-xs text-muted-foreground mb-2">Memory Utilization</div>
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
      </div>
    </div>
  )
}
