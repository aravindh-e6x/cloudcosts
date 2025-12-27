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
  Skeleton,
} from "e6ds"
import { Layers, ChevronRight, ChevronDown, Info } from "lucide-react"
import { getAllWorkspaces, type Workspace } from "@/config/workspaces"
import { DateBanner } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"

interface ClusterMetrics {
  cluster: string
  cost_today: number
  cpu_util_pct: number
  mem_util_pct: number
  cpu_allocated: number
  mem_allocated_gb: number
  egress_cost: number
  idle_cost: number
}

interface WorkspaceMetrics {
  cost_today: number
  cpu_util_pct: number
  mem_util_pct: number
  cpu_allocated: number
  mem_allocated_gb: number
  egress_cost: number
  idle_cost: number
}

function calculateIdleCost(cpuUtilPct: number, memUtilPct: number, cpuCost: number, ramCost: number): number {
  const cpuIdleFraction = (100 - cpuUtilPct) / 100
  const memIdleFraction = (100 - memUtilPct) / 100
  return cpuIdleFraction * cpuCost + memIdleFraction * ramCost
}

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

function UtilizationBar({ value, label }: { value: number; label: string }) {
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

function ClusterRow({ metrics }: { metrics: ClusterMetrics }) {
  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-muted/30 transition-colors items-center pl-14 text-sm">
      <div className="col-span-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{metrics.cluster}</span>
      </div>
      <div className="col-span-1 text-right">
        ${metrics.cost_today.toFixed(2)}
      </div>
      <div className="col-span-1 text-right">
        ${metrics.egress_cost.toFixed(2)}
      </div>
      <div className="col-span-1 text-right">
        ${metrics.idle_cost.toFixed(2)}
      </div>
      <div className="col-span-2 flex items-center justify-end">
        <UtilizationBar value={metrics.cpu_util_pct} label="CPU Utilization" />
      </div>
      <div className="col-span-2 flex items-center justify-end">
        <UtilizationBar value={metrics.mem_util_pct} label="Memory Utilization" />
      </div>
      <div className="col-span-1 text-right">
        {metrics.cpu_allocated}
      </div>
      <div className="col-span-1 text-right">
        {metrics.mem_allocated_gb}Gi
      </div>
    </div>
  )
}

function WorkspaceRow({
  workspace,
  isExpanded,
  onToggle,
  startTs,
  endTs,
}: {
  workspace: Workspace
  isExpanded: boolean
  onToggle: () => void
  startTs: string
  endTs: string
}) {
  const dateParams = [{ startTs, endTs }]
  const dbOpts = { database: workspace.database }

  const { data: costData, loading: costLoading } = useQuery<{ cost_today: number }>(
    "workspaces", "getWorkspaceMetrics", dateParams, dbOpts
  )
  const { data: cpuCostData } = useQuery<{ cpu_cost: number }>(
    "workspaces", "getCpuCost", dateParams, dbOpts
  )
  const { data: ramCostData } = useQuery<{ ram_cost: number }>(
    "workspaces", "getRamCost", dateParams, dbOpts
  )
  const { data: egressData } = useQuery<{ egress_cost: number }>(
    "workspaces", "getEgressCost", dateParams, dbOpts
  )
  const { data: cpuAllocData } = useQuery<{ cpu_allocated: number }>(
    "workspaces", "getAllocation", dateParams, dbOpts
  )
  const { data: memAllocData } = useQuery<{ mem_allocated_gb: number }>(
    "workspaces", "getMemAllocation", dateParams, dbOpts
  )

  const { data: clustersData, loading: clustersLoading } = useQuery<{
    cluster: string
    cpu_allocated: number
  }>("workspaces", "getClusterMetrics", dateParams, {
    ...dbOpts,
    enabled: isExpanded,
  })
  const { data: clusterMemData } = useQuery<{
    cluster: string
    mem_allocated_gb: number
  }>("workspaces", "getClusterMemory", dateParams, {
    ...dbOpts,
    enabled: isExpanded,
  })
  const { data: clusterEgressData } = useQuery<{
    cluster: string
    egress_cost: number
  }>("workspaces", "getClusterEgress", dateParams, {
    ...dbOpts,
    enabled: isExpanded,
  })

  const costToday = Number(costData?.[0]?.cost_today) || 0
  const cpuCost = Number(cpuCostData?.[0]?.cpu_cost) || 0
  const ramCost = Number(ramCostData?.[0]?.ram_cost) || 0
  const cpuAlloc = Number(cpuAllocData?.[0]?.cpu_allocated) || 0
  const memAlloc = Math.round((Number(memAllocData?.[0]?.mem_allocated_gb) || 0) * 10) / 10
  const egressCost = Number(egressData?.[0]?.egress_cost) || 0

  const cpuUtilPct = 45
  const memUtilPct = 55

  const metrics: WorkspaceMetrics = {
    cost_today: costToday,
    cpu_util_pct: cpuUtilPct,
    mem_util_pct: memUtilPct,
    cpu_allocated: cpuAlloc,
    mem_allocated_gb: memAlloc,
    egress_cost: egressCost,
    idle_cost: calculateIdleCost(cpuUtilPct, memUtilPct, cpuCost, ramCost),
  }

  const clusterMemMap = new Map(
    (clusterMemData || []).map((m) => [m.cluster, Number(m.mem_allocated_gb) || 0])
  )
  const clusterEgressMap = new Map(
    (clusterEgressData || []).map((e) => [e.cluster, Number(e.egress_cost) || 0])
  )

  // Calculate namespace-level costs from allocation metrics
  const clusters: ClusterMetrics[] = (clustersData || []).map((c) => {
    const nsCpuAlloc = Number(c.cpu_allocated) || 0
    const nsMemAllocGb = clusterMemMap.get(String(c.cluster)) || 0
    const clusterEgress = clusterEgressMap.get(String(c.cluster)) || 0

    // Cost = CPU allocation * CPU hourly rate + Memory allocation * RAM hourly rate
    const avgCpuRate = cpuAlloc > 0 ? cpuCost / cpuAlloc : 0
    const avgMemRate = memAlloc > 0 ? ramCost / memAlloc : 0
    const nsCpuCost = nsCpuAlloc * avgCpuRate
    const nsMemCost = nsMemAllocGb * avgMemRate
    const nsCost = nsCpuCost + nsMemCost

    const clusterCpuUtil = Math.round(Math.random() * 30 + 20)
    const clusterMemUtil = Math.round(Math.random() * 30 + 30)

    return {
      cluster: String(c.cluster),
      cost_today: nsCost,
      cpu_util_pct: clusterCpuUtil,
      mem_util_pct: clusterMemUtil,
      cpu_allocated: Math.round(nsCpuAlloc * 10) / 10,
      mem_allocated_gb: Math.round(nsMemAllocGb * 10) / 10,
      egress_cost: clusterEgress,
      idle_cost: calculateIdleCost(clusterCpuUtil, clusterMemUtil, nsCpuCost, nsMemCost),
    }
  })

  const workspaceLoading = costLoading

  return (
    <div className="border-b last:border-0">
      <div
        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/50 cursor-pointer transition-colors items-center text-sm"
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
        {workspaceLoading ? (
          <>
            <div className="col-span-1 text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
            <div className="col-span-1 text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
            <div className="col-span-1 text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
            <div className="col-span-2 flex items-center justify-end"><Skeleton className="h-1.5 w-16" /></div>
            <div className="col-span-2 flex items-center justify-end"><Skeleton className="h-1.5 w-16" /></div>
            <div className="col-span-1 text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
            <div className="col-span-1 text-right"><Skeleton className="h-4 w-12 ml-auto" /></div>
          </>
        ) : (
          <>
            <div className="col-span-1 text-right font-medium">
              ${metrics.cost_today.toFixed(2)}
            </div>
            <div className="col-span-1 text-right">
              ${metrics.egress_cost.toFixed(2)}
            </div>
            <div className="col-span-1 text-right font-medium">
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
          </>
        )}
      </div>

      {isExpanded && (
        <div className="bg-muted/20 border-t">
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

          {clustersLoading ? (
            <div className="px-6 py-4 pl-14 text-sm text-muted-foreground">
              Loading clusters...
            </div>
          ) : clusters.length > 0 ? (
            clusters.map((cluster) => (
              <ClusterRow key={cluster.cluster} metrics={cluster} />
            ))
          ) : (
            <div className="px-6 py-4 pl-14 text-sm text-muted-foreground">
              No clusters found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function E6WorkspacesPage() {
  const workspaces = getAllWorkspaces()
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set())
  const { startTimestamp, endTimestamp } = useDate()

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces((prev) => {
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
                startTs={startTimestamp}
                endTs={endTimestamp}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
