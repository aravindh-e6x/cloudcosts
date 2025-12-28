"use client"

import { useMemo, useState } from "react"
import { ComponentSnapshot, TimeSnapshot } from "./types"

const BUCKETS = [
  { label: ">80%", min: 80, max: 101, color: "bg-green-500", bgColor: "bg-green-100", desc: "Well Utilized" },
  { label: "60-80%", min: 60, max: 80, color: "bg-yellow-500", bgColor: "bg-yellow-100", desc: "Moderate" },
  { label: "40-60%", min: 40, max: 60, color: "bg-orange-500", bgColor: "bg-orange-100", desc: "Under-utilized" },
  { label: "<40%", min: 0, max: 40, color: "bg-red-500", bgColor: "bg-red-100", desc: "Wasted" },
]

interface OverviewViewProps {
  snapshot: TimeSnapshot
}

export function OverviewView({ snapshot }: OverviewViewProps) {
  // Flatten all components for bucketing
  const allComponents = useMemo(() => {
    const components: ComponentSnapshot[] = [...snapshot.workspaceComponents]
    Object.values(snapshot.clusters).forEach((clusterComponents) => {
      components.push(...clusterComponents)
    })
    return components
  }, [snapshot])

  const buckets = useMemo(() => {
    return BUCKETS.map((bucket) => {
      const componentsInBucket = allComponents.filter((c) => {
        const cpuPct = c.cpuRequested > 0 ? (c.cpuAllocated / c.cpuRequested) * 100 : 0
        return cpuPct >= bucket.min && cpuPct < bucket.max
      })
      return { ...bucket, count: componentsInBucket.length, components: componentsInBucket }
    })
  }, [allComponents])

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const selectedComponents = buckets.find((b) => b.label === selectedBucket)?.components || []

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
      {/* Distribution Buckets */}
      <div>
        <div className="text-sm font-medium mb-3">Component Distribution (by CPU utilization)</div>
        <div className="grid grid-cols-4 gap-3">
          {buckets.map((bucket) => (
            <div
              key={bucket.label}
              onClick={() => setSelectedBucket(selectedBucket === bucket.label ? null : bucket.label)}
              className={`border rounded-lg p-4 text-center cursor-pointer transition-all ${
                selectedBucket === bucket.label ? "ring-2 ring-primary" : "hover:bg-muted/50"
              } ${bucket.bgColor}`}
            >
              <div className={`text-3xl font-bold ${bucket.color.replace("bg-", "text-")}`}>
                {bucket.count}
              </div>
              <div className="text-sm font-medium mt-1">{bucket.label}</div>
              <div className="text-xs text-muted-foreground">{bucket.desc}</div>
            </div>
          ))}
        </div>

        {selectedBucket && selectedComponents.length > 0 && (
          <div className="border rounded-lg p-3 bg-muted/30 mt-3">
            <div className="text-sm font-medium mb-2">
              Components in {selectedBucket} bucket ({selectedComponents.length})
            </div>
            <div className="max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {selectedComponents.map((c) => {
                  const cpuPct = c.cpuRequested > 0 ? (c.cpuAllocated / c.cpuRequested) * 100 : 0
                  return (
                    <div key={`${c.namespace}-${c.name}`} className="flex justify-between bg-background rounded px-2 py-1">
                      <span className="truncate">
                        <span className="text-muted-foreground">{c.namespace}/</span>
                        <span className="font-medium capitalize">{c.name}</span>
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {cpuPct.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

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
