"use client"

import { useMemo, useState } from "react"
import { NodeSnapshot } from "./types"

const BUCKETS = [
  { label: ">80%", min: 80, max: 101, color: "bg-green-500", bgColor: "bg-green-100", desc: "Well Packed" },
  { label: "60-80%", min: 60, max: 80, color: "bg-yellow-500", bgColor: "bg-yellow-100", desc: "Moderate" },
  { label: "40-60%", min: 40, max: 60, color: "bg-orange-500", bgColor: "bg-orange-100", desc: "Under-packed" },
  { label: "<40%", min: 0, max: 40, color: "bg-red-500", bgColor: "bg-red-100", desc: "Wasted" },
]

interface DistributionViewProps {
  nodes: NodeSnapshot[]
}

export function DistributionView({ nodes }: DistributionViewProps) {
  const buckets = useMemo(() => {
    return BUCKETS.map((bucket) => {
      const nodesInBucket = nodes.filter((n) => {
        const cpuPct = (n.cpuAllocated / n.cpuCapacity) * 100
        return cpuPct >= bucket.min && cpuPct < bucket.max
      })
      return { ...bucket, count: nodesInBucket.length, nodes: nodesInBucket }
    })
  }, [nodes])

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const selectedNodes = buckets.find((b) => b.label === selectedBucket)?.nodes || []

  return (
    <div className="space-y-4">
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

      {selectedBucket && selectedNodes.length > 0 && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-sm font-medium mb-2">
            Nodes in {selectedBucket} bucket ({selectedNodes.length})
          </div>
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {selectedNodes.map((n) => (
                <div key={n.node} className="flex justify-between bg-background rounded px-2 py-1">
                  <span className="font-mono truncate">{n.node}</span>
                  <span className="text-muted-foreground ml-2">
                    {((n.cpuAllocated / n.cpuCapacity) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
