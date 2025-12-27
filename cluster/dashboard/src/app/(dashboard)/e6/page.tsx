"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "e6ds"
import { Layers, ChevronRight, ChevronDown } from "lucide-react"
import { getAllWorkspaces, type Workspace } from "@/config/workspaces"
import { DateBanner } from "@/components"

// Mock data - will be replaced with real queries
const MOCK_WORKSPACE_METRICS: Record<string, {
  cost_today: number
  cpu_util_pct: number
  mem_util_pct: number
  cpu_allocated: number
  mem_allocated_gb: number
}> = {
  "k3d-cloudcosts": {
    cost_today: 12.45,
    cpu_util_pct: 42,
    mem_util_pct: 58,
    cpu_allocated: 16,
    mem_allocated_gb: 32,
  },
}

const MOCK_NAMESPACE_METRICS: Record<string, Array<{
  namespace: string
  cost_today: number
  cpu_util_pct: number
  mem_util_pct: number
  cpu_allocated: number
  mem_allocated_gb: number
}>> = {
  "k3d-cloudcosts": [
    { namespace: "production", cost_today: 5.20, cpu_util_pct: 65, mem_util_pct: 72, cpu_allocated: 8, mem_allocated_gb: 16 },
    { namespace: "analytics", cost_today: 4.10, cpu_util_pct: 38, mem_util_pct: 45, cpu_allocated: 4, mem_allocated_gb: 8 },
    { namespace: "staging", cost_today: 2.15, cpu_util_pct: 22, mem_util_pct: 35, cpu_allocated: 2, mem_allocated_gb: 4 },
    { namespace: "monitoring", cost_today: 1.00, cpu_util_pct: 15, mem_util_pct: 28, cpu_allocated: 2, mem_allocated_gb: 4 },
  ],
}

export default function E6WorkspacesPage() {
  const workspaces = getAllWorkspaces()
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set())

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <DateBanner />

      <div>
        <h1 className="text-3xl font-bold">E6 Workspaces</h1>
        <p className="text-muted-foreground mt-1">
          {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} configured
        </p>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5" />
            All Workspaces
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs text-muted-foreground font-medium bg-muted/30">
            <div className="col-span-3">WORKSPACE</div>
            <div className="col-span-2 text-right">COST TODAY</div>
            <div className="col-span-2 text-right">AVG CPU UTIL</div>
            <div className="col-span-2 text-right">AVG MEM UTIL</div>
            <div className="col-span-1 text-right">CPU ALLOC</div>
            <div className="col-span-1 text-right">MEM ALLOC</div>
            <div className="col-span-1 text-right">REGION</div>
          </div>

          {workspaces.map((workspace) => (
            <WorkspaceRow
              key={workspace.id}
              workspace={workspace}
              isExpanded={expandedWorkspaces.has(workspace.id)}
              onToggle={() => toggleWorkspace(workspace.id)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function WorkspaceRow({
  workspace,
  isExpanded,
  onToggle,
}: {
  workspace: Workspace
  isExpanded: boolean
  onToggle: () => void
}) {
  const metrics = MOCK_WORKSPACE_METRICS[workspace.id] || {
    cost_today: 0,
    cpu_util_pct: 0,
    mem_util_pct: 0,
    cpu_allocated: 0,
    mem_allocated_gb: 0,
  }
  const namespaces = MOCK_NAMESPACE_METRICS[workspace.id] || []

  return (
    <div className="border-b last:border-0">
      {/* Workspace Row */}
      <div
        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/50 cursor-pointer transition-colors items-center"
        onClick={onToggle}
      >
        <div className="col-span-3 flex items-center gap-3">
          <button className="p-0.5 hover:bg-muted rounded transition-colors">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div>
            <Link
              href={`/e6/${workspace.id}`}
              className="font-medium hover:text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {workspace.name}
            </Link>
            <p className="text-xs text-muted-foreground font-mono">{workspace.id}</p>
          </div>
        </div>
        <div className="col-span-2 text-right font-medium">
          ${metrics.cost_today.toFixed(2)}
        </div>
        <div className="col-span-2 text-right font-medium">
          {metrics.cpu_util_pct}%
        </div>
        <div className="col-span-2 text-right font-medium">
          {metrics.mem_util_pct}%
        </div>
        <div className="col-span-1 text-right text-muted-foreground">
          {metrics.cpu_allocated}
        </div>
        <div className="col-span-1 text-right text-muted-foreground">
          {metrics.mem_allocated_gb}Gi
        </div>
        <div className="col-span-1 text-right text-muted-foreground">
          {workspace.region || "-"}
        </div>
      </div>

      {/* Expanded Namespaces */}
      {isExpanded && namespaces.length > 0 && (
        <div className="bg-muted/20 border-t">
          {/* Namespace Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs text-muted-foreground font-medium pl-14">
            <div className="col-span-3">NAMESPACE</div>
            <div className="col-span-2 text-right">COST TODAY</div>
            <div className="col-span-2 text-right">AVG CPU UTIL</div>
            <div className="col-span-2 text-right">AVG MEM UTIL</div>
            <div className="col-span-1 text-right">CPU ALLOC</div>
            <div className="col-span-1 text-right">MEM ALLOC</div>
            <div className="col-span-1"></div>
          </div>

          {/* Namespace Rows */}
          {namespaces.map((ns) => (
            <div
              key={ns.namespace}
              className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-muted/30 transition-colors items-center pl-14 text-sm"
            >
              <div className="col-span-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{ns.namespace}</span>
              </div>
              <div className="col-span-2 text-right">
                ${ns.cost_today.toFixed(2)}
              </div>
              <div className="col-span-2 text-right">
                {ns.cpu_util_pct}%
              </div>
              <div className="col-span-2 text-right">
                {ns.mem_util_pct}%
              </div>
              <div className="col-span-1 text-right text-muted-foreground">
                {ns.cpu_allocated}
              </div>
              <div className="col-span-1 text-right text-muted-foreground">
                {ns.mem_allocated_gb}Gi
              </div>
              <div className="col-span-1"></div>
            </div>
          ))}
        </div>
      )}

      {/* No namespaces message */}
      {isExpanded && namespaces.length === 0 && (
        <div className="bg-muted/20 border-t px-6 py-4 pl-14 text-sm text-muted-foreground">
          No namespaces found
        </div>
      )}
    </div>
  )
}
