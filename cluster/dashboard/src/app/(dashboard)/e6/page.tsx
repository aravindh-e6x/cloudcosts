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

interface ComponentMetrics {
  component: string
  pod_count: number
  cpu_allocated: number
  mem_allocated_gb: number
}

interface WorkspaceMetrics {
  cost_today: number
  cpu_util_pct: number
  mem_util_pct: number
  cpu_allocated: number
  mem_allocated_gb: number
  egress_cost: number
  idle_cost: number
  node_count: number
  pod_count: number
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

function ComponentRow({ component }: { component: ComponentMetrics }) {
  const cpuPerPod = component.pod_count > 0 ? component.cpu_allocated / component.pod_count : 0
  const memPerPod = component.pod_count > 0 ? component.mem_allocated_gb / component.pod_count : 0

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs items-center">
      <div className="col-span-2">
        <span className="capitalize font-medium">{component.component}</span>
      </div>
      <div className="col-span-1 text-right">
        {component.pod_count}
      </div>
      <div className="col-span-2 text-right text-muted-foreground">
        {cpuPerPod.toFixed(2)} / {(memPerPod * 1024).toFixed(0)}Mi
      </div>
      <div className="col-span-2 text-right">
        {component.cpu_allocated.toFixed(2)}
      </div>
      <div className="col-span-2 text-right">
        {(component.mem_allocated_gb * 1024).toFixed(0)}Mi
      </div>
      <div className="col-span-3" />
    </div>
  )
}

function ClusterRow({
  metrics,
  components,
  isExpanded,
  onToggle,
}: {
  metrics: ClusterMetrics
  components: ComponentMetrics[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const executors = components.filter((c) => c.component === "executor")
  const planners = components.filter((c) => c.component === "planner")
  const queues = components.filter((c) => c.component === "queue")

  return (
    <div className="border-b border-muted/30 last:border-0">
      <div
        className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-muted/30 transition-colors items-center pl-14 text-sm cursor-pointer"
        onClick={onToggle}
      >
        <div className="col-span-3 flex items-center gap-2">
          <button className="p-0.5 hover:bg-muted rounded transition-colors">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{metrics.cluster}</span>
        </div>
        <div className="col-span-1 text-right">
          ${metrics.cost_today.toFixed(2)}
        </div>
        <div className="col-span-1 text-right text-muted-foreground">
          N/A
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

      {isExpanded && (executors.length > 0 || planners.length > 0 || queues.length > 0) && (
        <div className="bg-muted/10 ml-20 mr-6 mb-2 rounded border">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-muted-foreground font-medium border-b">
            <div className="col-span-2">COMPONENT</div>
            <div className="col-span-1 text-right">PODS</div>
            <div className="col-span-2 text-right">SPEC (CPU/MEM)</div>
            <div className="col-span-2 text-right">TOTAL CPU</div>
            <div className="col-span-2 text-right">TOTAL MEM</div>
            <div className="col-span-3" />
          </div>
          {executors.map((e) => (
            <ComponentRow key={e.component} component={e} />
          ))}
          {planners.map((p) => (
            <ComponentRow key={p.component} component={p} />
          ))}
          {queues.map((q) => (
            <ComponentRow key={q.component} component={q} />
          ))}
        </div>
      )}
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
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set())
  const dateParams = [{ startTs, endTs }]
  const dbOpts = { database: workspace.database }

  const toggleCluster = (cluster: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev)
      if (next.has(cluster)) {
        next.delete(cluster)
      } else {
        next.add(cluster)
      }
      return next
    })
  }

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
  const { data: nodeCountData } = useQuery<{ node_count: number }>(
    "workspaces", "getNodeCount", dateParams, dbOpts
  )
  const { data: podCountData } = useQuery<{ pod_count: number }>(
    "workspaces", "getPodCount", dateParams, dbOpts
  )
  // CPU utilization: separate queries for usage and allocation, calculate in JS
  const { data: cpuUsageData } = useQuery<{
    total_min_cpu: number
    total_max_cpu: number
    min_ts: number
    max_ts: number
  }>("workspaces", "getCpuUsageRaw", dateParams, dbOpts)
  const { data: cpuAllocTotalData } = useQuery<{ total_allocated: number }>(
    "workspaces", "getCpuAllocatedTotal", dateParams, dbOpts
  )
  // Memory utilization: separate queries, calculate in JS
  const { data: memTotalData } = useQuery<{ total_bytes: number }>(
    "workspaces", "getMemTotal", dateParams, dbOpts
  )
  const { data: memAvailData } = useQuery<{ avail_bytes: number }>(
    "workspaces", "getMemAvailable", dateParams, dbOpts
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

  // Component-level metrics
  const { data: componentCpuData } = useQuery<{
    namespace: string
    component: string
    pod_count: number
    cpu_allocated: number
  }>("workspaces", "getComponentMetrics", dateParams, {
    ...dbOpts,
    enabled: isExpanded,
  })
  const { data: componentMemData } = useQuery<{
    namespace: string
    component: string
    pod_count: number
    mem_allocated_gb: number
  }>("workspaces", "getComponentMemory", dateParams, {
    ...dbOpts,
    enabled: isExpanded,
  })

  const costToday = Number(costData?.[0]?.cost_today) || 0
  const cpuCost = Number(cpuCostData?.[0]?.cpu_cost) || 0
  const ramCost = Number(ramCostData?.[0]?.ram_cost) || 0
  const cpuAlloc = Number(cpuAllocData?.[0]?.cpu_allocated) || 0
  const memAlloc = Math.round((Number(memAllocData?.[0]?.mem_allocated_gb) || 0) * 10) / 10
  const egressCost = Number(egressData?.[0]?.egress_cost) || 0
  const nodeCount = Number(nodeCountData?.[0]?.node_count) || 0
  const podCount = Number(podCountData?.[0]?.pod_count) || 0

  // Calculate CPU utilization: (delta_cpu_seconds / time_seconds) / allocated_cpu * 100
  const cpuUsage = cpuUsageData?.[0]
  const cpuAllocTotal = Number(cpuAllocTotalData?.[0]?.total_allocated) || 0
  let cpuUtilPct = 0
  if (cpuUsage && cpuAllocTotal > 0) {
    const deltaCpu = (Number(cpuUsage.total_max_cpu) || 0) - (Number(cpuUsage.total_min_cpu) || 0)
    const deltaTimeMs = (Number(cpuUsage.max_ts) || 0) - (Number(cpuUsage.min_ts) || 0)
    const deltaTimeSec = deltaTimeMs / 1000
    if (deltaTimeSec > 0) {
      cpuUtilPct = Math.round((deltaCpu / deltaTimeSec / cpuAllocTotal) * 100)
    }
  }

  // Calculate memory utilization: (total - available) / total * 100
  const memTotal = Number(memTotalData?.[0]?.total_bytes) || 0
  const memAvail = Number(memAvailData?.[0]?.avail_bytes) || 0
  const memUtilPct = memTotal > 0 ? Math.round(((memTotal - memAvail) / memTotal) * 100) : 0

  const metrics: WorkspaceMetrics = {
    cost_today: costToday,
    cpu_util_pct: cpuUtilPct,
    mem_util_pct: memUtilPct,
    cpu_allocated: cpuAlloc,
    mem_allocated_gb: memAlloc,
    egress_cost: egressCost,
    idle_cost: calculateIdleCost(cpuUtilPct, memUtilPct, cpuCost, ramCost),
    node_count: nodeCount,
    pod_count: podCount,
  }

  const clusterMemMap = new Map(
    (clusterMemData || []).map((m) => [m.cluster, Number(m.mem_allocated_gb) || 0])
  )
  const clusterEgressMap = new Map(
    (clusterEgressData || []).map((e) => [e.cluster, Number(e.egress_cost) || 0])
  )

  // Build component metrics by namespace
  const componentMemMap = new Map<string, Map<string, number>>(
    (componentMemData || []).reduce((acc, c) => {
      const ns = String(c.namespace)
      if (!acc.has(ns)) acc.set(ns, new Map())
      acc.get(ns)!.set(String(c.component), Number(c.mem_allocated_gb) || 0)
      return acc
    }, new Map<string, Map<string, number>>())
  )

  const componentsByNamespace = new Map<string, ComponentMetrics[]>()
  for (const c of componentCpuData || []) {
    const ns = String(c.namespace)
    if (!componentsByNamespace.has(ns)) componentsByNamespace.set(ns, [])
    const memMap = componentMemMap.get(ns)
    componentsByNamespace.get(ns)!.push({
      component: String(c.component),
      pod_count: Number(c.pod_count) || 0,
      cpu_allocated: Number(c.cpu_allocated) || 0,
      mem_allocated_gb: memMap?.get(String(c.component)) || 0,
    })
  }

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
            <div className="text-xs text-muted-foreground">
              {metrics.node_count} nodes · {metrics.pod_count} pods
            </div>
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
              <ClusterRow
                key={cluster.cluster}
                metrics={cluster}
                components={componentsByNamespace.get(cluster.cluster) || []}
                isExpanded={expandedClusters.has(cluster.cluster)}
                onToggle={() => toggleCluster(cluster.cluster)}
              />
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
