"use client"

import { useMemo, useState } from "react"
import { Server, Layers } from "lucide-react"
import { ComponentSnapshot, TimeSnapshot, getPackingColor, getPackingBgColor } from "./types"

interface ComponentCardsProps {
  snapshot: TimeSnapshot
}

function ComponentCard({ component }: { component: ComponentSnapshot }) {
  const cpuPct = component.cpuRequested > 0
    ? (component.cpuAllocated / component.cpuRequested) * 100
    : 0
  const memPct = component.memRequestedGb > 0
    ? (component.memAllocatedGb / component.memRequestedGb) * 100
    : 0
  const avgPct = (cpuPct + memPct) / 2

  return (
    <div className={`border rounded-lg p-3 ${getPackingBgColor(avgPct)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium capitalize">{component.name}</span>
        <span className="text-xs text-muted-foreground">{component.replicas} replicas</span>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">CPU</span>
          <span>
            {component.cpuAllocated.toFixed(1)}/{component.cpuRequested}
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
            {component.memAllocatedGb.toFixed(1)}/{component.memRequestedGb}GB
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
}

export function ComponentCards({ snapshot }: ComponentCardsProps) {
  const clusterNames = Object.keys(snapshot.clusters).sort()

  // Calculate workspace totals
  const workspaceTotals = useMemo(() => {
    const cpuAlloc = snapshot.workspaceComponents.reduce((sum, c) => sum + c.cpuAllocated, 0)
    const cpuReq = snapshot.workspaceComponents.reduce((sum, c) => sum + c.cpuRequested, 0)
    const memAlloc = snapshot.workspaceComponents.reduce((sum, c) => sum + c.memAllocatedGb, 0)
    const memReq = snapshot.workspaceComponents.reduce((sum, c) => sum + c.memRequestedGb, 0)
    return {
      cpuAllocated: cpuAlloc,
      cpuRequested: cpuReq,
      memAllocatedGb: memAlloc,
      memRequestedGb: memReq,
      cpuPct: cpuReq > 0 ? (cpuAlloc / cpuReq) * 100 : 0,
      memPct: memReq > 0 ? (memAlloc / memReq) * 100 : 0,
    }
  }, [snapshot.workspaceComponents])

  return (
    <div className="space-y-6">
      {/* Workspace Components */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Workspace Components</span>
            <span className="text-xs text-muted-foreground">(shared)</span>
          </div>
          <div className="text-xs text-muted-foreground">
            CPU: {workspaceTotals.cpuAllocated.toFixed(1)}/{workspaceTotals.cpuRequested} cores ({workspaceTotals.cpuPct.toFixed(0)}%)
            <span className="mx-2">|</span>
            MEM: {workspaceTotals.memAllocatedGb.toFixed(0)}/{workspaceTotals.memRequestedGb}GB ({workspaceTotals.memPct.toFixed(0)}%)
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {snapshot.workspaceComponents.map((component) => (
            <ComponentCard key={component.name} component={component} />
          ))}
        </div>
      </div>

      {/* Per-Cluster Components */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">E6 Clusters</span>
          <span className="text-xs text-muted-foreground">({clusterNames.length} clusters)</span>
        </div>

        <div className="space-y-4">
          {clusterNames.map((clusterName) => {
            const components = snapshot.clusters[clusterName]
            const cpuAlloc = components.reduce((sum, c) => sum + c.cpuAllocated, 0)
            const cpuReq = components.reduce((sum, c) => sum + c.cpuRequested, 0)
            const memAlloc = components.reduce((sum, c) => sum + c.memAllocatedGb, 0)
            const memReq = components.reduce((sum, c) => sum + c.memRequestedGb, 0)
            const cpuPct = cpuReq > 0 ? (cpuAlloc / cpuReq) * 100 : 0
            const memPct = memReq > 0 ? (memAlloc / memReq) * 100 : 0

            return (
              <div key={clusterName} className="border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium font-mono">{clusterName}</span>
                  <div className="text-xs text-muted-foreground">
                    CPU: {cpuAlloc.toFixed(1)}/{cpuReq} ({cpuPct.toFixed(0)}%)
                    <span className="mx-2">|</span>
                    MEM: {memAlloc.toFixed(0)}/{memReq}GB ({memPct.toFixed(0)}%)
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {components.map((component) => (
                    <ComponentCard key={component.name} component={component} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
