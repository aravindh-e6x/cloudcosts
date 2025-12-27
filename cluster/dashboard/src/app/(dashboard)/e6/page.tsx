"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "e6ds"
import { Layers, ChevronRight, ChevronDown, Info } from "lucide-react"
import { getAllWorkspaces, type Workspace } from "@/config/workspaces"
import { DateBanner } from "@/components"

// Mock data - will be replaced with real queries
const MOCK_WORKSPACE_METRICS: Record<string, {
  cost_today: number
  cpu_util_pct: number
  mem_util_pct: number
  cpu_allocated: number
  mem_allocated_gb: number
  egress_cost: number
  idle_cost: number
}> = {
  "k3d-cloudcosts": {
    cost_today: 12.45,
    cpu_util_pct: 42,
    mem_util_pct: 58,
    cpu_allocated: 16,
    mem_allocated_gb: 32,
    egress_cost: 1.23,
    idle_cost: 5.47,
  },
}

const MOCK_CLUSTER_METRICS: Record<string, Array<{
  cluster: string
  cost_today: number
  cpu_util_pct: number
  mem_util_pct: number
  cpu_allocated: number
  mem_allocated_gb: number
  egress_cost: number
  idle_cost: number
}>> = {
  "k3d-cloudcosts": [
    { cluster: "production", cost_today: 5.20, cpu_util_pct: 65, mem_util_pct: 72, cpu_allocated: 8, mem_allocated_gb: 16, egress_cost: 0.45, idle_cost: 1.82 },
    { cluster: "analytics", cost_today: 4.10, cpu_util_pct: 38, mem_util_pct: 45, cpu_allocated: 4, mem_allocated_gb: 8, egress_cost: 0.52, idle_cost: 2.34 },
    { cluster: "staging", cost_today: 2.15, cpu_util_pct: 22, mem_util_pct: 35, cpu_allocated: 2, mem_allocated_gb: 4, egress_cost: 0.18, idle_cost: 1.55 },
    { cluster: "monitoring", cost_today: 1.00, cpu_util_pct: 15, mem_util_pct: 28, cpu_allocated: 2, mem_allocated_gb: 4, egress_cost: 0.08, idle_cost: 0.76 },
  ],
}

// Column header with tooltip
function ColumnHeader({
  label,
  description,
  className = "",
}: {
  label: string
  description: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-1 justify-end ${className}`}>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 cursor-help opacity-60 hover:opacity-100" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

// Utilization bar with tooltip showing percentage
function UtilizationBar({
  value,
  label,
}: {
  value: number
  label: string
}) {
  const barColor = value >= 80 ? "bg-red-500" : value >= 60 ? "bg-yellow-500" : "bg-green-500"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-16 h-1.5 bg-muted overflow-hidden cursor-pointer">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-sm font-medium">{label}: {value}%</p>
      </TooltipContent>
    </Tooltip>
  )
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
    <TooltipProvider>
      <div className="space-y-6">
        <DateBanner />

        <div>
          <h1 className="text-3xl font-bold">E6 Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} configured
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs text-muted-foreground font-medium bg-muted/30">
              <div className="col-span-3">WORKSPACE</div>
              <ColumnHeader
                label="COST TODAY"
                description="Total compute cost for all nodes in this workspace for the selected date"
                className="col-span-1"
              />
              <ColumnHeader
                label="EGRESS COST"
                description="Network egress costs including internet, cross-region, and cross-zone traffic"
                className="col-span-1"
              />
              <ColumnHeader
                label="IDLE COST"
                description="Wasted cost due to underutilization. Calculated as (1 - utilization%) × total cost"
                className="col-span-1"
              />
              <ColumnHeader
                label="AVG CPU UTIL"
                description="Average CPU utilization across all nodes as a percentage of allocated CPU"
                className="col-span-2"
              />
              <ColumnHeader
                label="AVG MEM UTIL"
                description="Average memory utilization across all nodes as a percentage of allocated memory"
                className="col-span-2"
              />
              <ColumnHeader
                label="CPU ALLOC"
                description="Total CPU cores allocated across all nodes in this workspace at this instant"
                className="col-span-1"
              />
              <ColumnHeader
                label="MEM ALLOC"
                description="Total memory allocated across all nodes in this workspace at this instant"
                className="col-span-1"
              />
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
    </TooltipProvider>
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
    egress_cost: 0,
    idle_cost: 0,
  }
  const clusters = MOCK_CLUSTER_METRICS[workspace.id] || []

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
          </div>
        </div>
        <div className="col-span-1 text-right font-medium">
          ${metrics.cost_today.toFixed(2)}
        </div>
        <div className="col-span-1 text-right">
          ${metrics.egress_cost.toFixed(2)}
        </div>
        <div className="col-span-1 text-right  font-medium">
          ${metrics.idle_cost.toFixed(2)}
        </div>
        <div className="col-span-2 flex items-center justify-end">
          <UtilizationBar value={metrics.cpu_util_pct} label="CPU Utilization" />
        </div>
        <div className="col-span-2 flex items-center justify-end">
          <UtilizationBar value={metrics.mem_util_pct} label="Memory Utilization" />
        </div>
        <div className="col-span-1 text-right">
          {metrics.cpu_allocated} Cores
        </div>
        <div className="col-span-1 text-right">
          {metrics.mem_allocated_gb}Gi
        </div>
      </div>

      {/* Expanded clusters */}
      {isExpanded && clusters.length > 0 && (
        <div className="bg-muted/20 border-t">
          {/* cluster Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs text-muted-foreground font-medium pl-14">
            <div className="col-span-3">CLUSTER</div>
            <ColumnHeader
              label="COST TODAY"
              description="Total compute cost for this E6 cluster for the selected date"
              className="col-span-1"
            />
            <ColumnHeader
              label="EGRESS COST"
              description="Network egress costs for this cluster"
              className="col-span-1"
            />
            <ColumnHeader
              label="IDLE COST"
              description="Wasted cost due to underutilization in this cluster"
              className="col-span-1"
            />
            <ColumnHeader
              label="AVG CPU UTIL"
              description="Average CPU utilization for pods in this cluster"
              className="col-span-2"
            />
            <ColumnHeader
              label="AVG MEM UTIL"
              description="Average memory utilization for pods in this cluster"
              className="col-span-2"
            />
            <ColumnHeader
              label="CPU ALLOC"
              description="Total CPU cores allocated to this cluster at this instant"
              className="col-span-1"
            />
            <ColumnHeader
              label="MEM ALLOC"
              description="Total memory allocated to this cluster at this instant"
              className="col-span-1"
            />
          </div>

          {/* cluster Rows */}
          {clusters.map((ns) => (
            <div
              key={ns.cluster}
              className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-muted/30 transition-colors items-center pl-14 text-sm"
            >
              <div className="col-span-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{ns.cluster}</span>
              </div>
              <div className="col-span-1 text-right">
                ${ns.cost_today.toFixed(2)}
              </div>
              <div className="col-span-1 text-right ">
                ${ns.egress_cost.toFixed(2)}
              </div>
              <div className="col-span-1 text-right ">
                ${ns.idle_cost.toFixed(2)}
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <UtilizationBar value={ns.cpu_util_pct} label="CPU Utilization" />
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <UtilizationBar value={ns.mem_util_pct} label="Memory Utilization" />
              </div>
              <div className="col-span-1 text-right ">
                {ns.cpu_allocated}
              </div>
              <div className="col-span-1 text-right ">
                {ns.mem_allocated_gb}Gi
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No clusters message */}
      {isExpanded && clusters.length === 0 && (
        <div className="bg-muted/20 border-t px-6 py-4 pl-14 text-sm text-muted-foreground">
          No clusters found
        </div>
      )}
    </div>
  )
}
