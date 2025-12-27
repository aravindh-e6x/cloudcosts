"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "e6ds"
import {
  Server,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
} from "lucide-react"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"
import { QueryError, EmptyState } from "@/components"

interface Workspace {
  eks_cluster: string
  region: string
}

interface E6Cluster {
  e6_cluster: string
}

// Mock data for workspace-level metrics
const MOCK_WORKSPACE_METRICS: Record<string, {
  cost_per_day: number
  packing_pct: number
  cpu_util_pct: number
  memory_util_pct: number
}> = {
  "condenast-prod-eks": {
    cost_per_day: 64.32,
    packing_pct: 94,
    cpu_util_pct: 58,
    memory_util_pct: 42,
  },
  "acme-staging-eks": {
    cost_per_day: 28.50,
    packing_pct: 87,
    cpu_util_pct: 45,
    memory_util_pct: 38,
  },
}

// Mock data for E6 cluster metrics
const MOCK_E6_CLUSTER_METRICS: Record<string, {
  cost_per_day: number
  queries_per_day: number
  success_rate: number
  avg_query_time_ms: number
  active_connections: number
}> = {
  "prod-analytics": {
    cost_per_day: 34.08,
    queries_per_day: 3744,
    success_rate: 96.9,
    avg_query_time_ms: 245,
    active_connections: 42,
  },
  "prod-reporting": {
    cost_per_day: 20.64,
    queries_per_day: 2136,
    success_rate: 98.0,
    avg_query_time_ms: 189,
    active_connections: 28,
  },
  "dev-testing": {
    cost_per_day: 9.60,
    queries_per_day: 0,
    success_rate: 0,
    avg_query_time_ms: 0,
    active_connections: 2,
  },
}

export default function E6ClustersPage() {
  const { timeRange } = useDate()
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set())

  const dateRange = useMemo(() => {
    const from = timeRange?.from || new Date()
    const to = timeRange?.to || new Date()
    const startTs = new Date(from)
    startTs.setHours(0, 0, 0, 0)
    const endTs = new Date(to)
    endTs.setHours(23, 59, 59, 999)
    return {
      startTs: startTs.toISOString(),
      endTs: endTs.toISOString(),
    }
  }, [timeRange])

  const { data: workspacesData, loading, error, refetch } = useQuery<Workspace>(
    "e6",
    "getWorkspaces",
    [dateRange],
    { database: "kubernetes" }
  )

  const workspaces = useMemo(() => {
    if (!workspacesData) return []
    const map = new Map<string, Workspace>()
    for (const w of workspacesData) {
      if (!map.has(w.eks_cluster)) {
        map.set(w.eks_cluster, w)
      }
    }
    return Array.from(map.values())
  }, [workspacesData])

  const toggleWorkspace = (eksCluster: string) => {
    setExpandedWorkspaces(prev => {
      const next = new Set(prev)
      if (next.has(eksCluster)) {
        next.delete(eksCluster)
      } else {
        next.add(eksCluster)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">E6 Workspaces</h1>
          <p className="text-muted-foreground mt-1">Loading workspaces...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-4 border-b last:border-0">
                <Skeleton className="h-6 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">E6 Workspaces</h1>
        </div>
        <QueryError message={error} onRetry={refetch} />
      </div>
    )
  }

  if (!workspaces.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">E6 Workspaces</h1>
        </div>
        <EmptyState
          title="No workspaces found"
          description="No E6 workspaces have data for the selected date range."
        />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">E6 Workspaces</h1>
            <p className="text-muted-foreground mt-1">
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} across all regions
            </p>
          </div>
        </div>

        {/* Workspaces List */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-5 w-5" />
              All Workspaces
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">Click a workspace row to expand and see E6 clusters. Click the workspace name to view details.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b text-xs text-muted-foreground font-medium bg-muted/30">
              <div className="col-span-4">WORKSPACE</div>
              <div className="col-span-2 text-right">COST/DAY</div>
              <div className="col-span-2 text-right">PACKING</div>
              <div className="col-span-1 text-right">CPU UTIL</div>
              <div className="col-span-1 text-right">MEM UTIL</div>
              <div className="col-span-2 text-right">REGION</div>
            </div>

            {/* Workspace Rows */}
            {workspaces.map((workspace) => (
              <WorkspaceRow
                key={workspace.eks_cluster}
                workspace={workspace}
                dateRange={dateRange}
                isExpanded={expandedWorkspaces.has(workspace.eks_cluster)}
                onToggle={() => toggleWorkspace(workspace.eks_cluster)}
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
  dateRange,
  isExpanded,
  onToggle,
}: {
  workspace: Workspace
  dateRange: { startTs: string; endTs: string }
  isExpanded: boolean
  onToggle: () => void
}) {
  const { data: e6ClustersData } = useQuery<E6Cluster>(
    "e6",
    "getE6Clusters",
    [workspace.eks_cluster, dateRange],
    { database: "kubernetes" }
  )

  const e6Clusters = e6ClustersData?.map((c) => c.e6_cluster) || []
  const workspaceName = workspace.eks_cluster.split("-")[0]

  // Get mock metrics for this workspace
  const metrics = MOCK_WORKSPACE_METRICS[workspace.eks_cluster] || {
    cost_per_day: Math.random() * 50 + 20,
    packing_pct: Math.floor(Math.random() * 20) + 75,
    cpu_util_pct: Math.floor(Math.random() * 40) + 30,
    memory_util_pct: Math.floor(Math.random() * 30) + 25,
  }

  return (
    <div className="border-b last:border-0">
      {/* Workspace Row */}
      <div
        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/50 cursor-pointer transition-colors items-center"
        onClick={onToggle}
      >
        <div className="col-span-4 flex items-center gap-3">
          <button className="p-0.5 hover:bg-muted rounded transition-colors">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div>
            <Link
              href={`/e6/${encodeURIComponent(workspace.eks_cluster)}`}
              className="font-medium capitalize hover:text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {workspaceName}
            </Link>
            <p className="text-xs text-muted-foreground font-mono">{workspace.eks_cluster}</p>
          </div>
        </div>
        <div className="col-span-2 text-right font-medium">
          ${metrics.cost_per_day.toFixed(0)}
        </div>
        <div className="col-span-2 text-right">
          {metrics.packing_pct}%
        </div>
        <div className="col-span-1 text-right">
          {metrics.cpu_util_pct}%
        </div>
        <div className="col-span-1 text-right">
          {metrics.memory_util_pct}%
        </div>
        <div className="col-span-2 text-right text-muted-foreground">
          {workspace.region || "us-east-1"}
        </div>
      </div>

      {/* Expanded E6 Clusters */}
      {isExpanded && e6Clusters.length > 0 && (
        <div className="bg-muted/20 border-t">
          {/* E6 Clusters Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-2 text-xs text-muted-foreground font-medium pl-16">
            <div className="col-span-3">E6 CLUSTER</div>
            <div className="col-span-2 text-right">COST/DAY</div>
            <div className="col-span-2 text-right">QUERIES/DAY</div>
            <div className="col-span-2 text-right">SUCCESS</div>
            <div className="col-span-2 text-right">AVG TIME</div>
            <div className="col-span-1 text-right">CONN</div>
          </div>

          {/* E6 Cluster Rows */}
          {e6Clusters.map((cluster) => {
            const clusterMetrics = MOCK_E6_CLUSTER_METRICS[cluster] || {
              cost_per_day: Math.random() * 30 + 5,
              queries_per_day: Math.floor(Math.random() * 3000),
              success_rate: 95 + Math.random() * 4,
              avg_query_time_ms: Math.floor(Math.random() * 200) + 100,
              active_connections: Math.floor(Math.random() * 30) + 5,
            }

            return (
              <div
                key={cluster}
                className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-muted/30 transition-colors items-center pl-16 text-sm"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{cluster}</span>
                </div>
                <div className="col-span-2 text-right">
                  ${clusterMetrics.cost_per_day.toFixed(0)}
                </div>
                <div className="col-span-2 text-right">
                  {clusterMetrics.queries_per_day > 0 ? clusterMetrics.queries_per_day.toLocaleString() : "-"}
                </div>
                <div className="col-span-2 text-right">
                  {clusterMetrics.queries_per_day > 0 ? (
                    <span className={clusterMetrics.success_rate < 95 ? "text-destructive" : "text-green-600"}>
                      {clusterMetrics.success_rate.toFixed(1)}%
                    </span>
                  ) : "-"}
                </div>
                <div className="col-span-2 text-right">
                  {clusterMetrics.queries_per_day > 0 ? `${clusterMetrics.avg_query_time_ms}ms` : "-"}
                </div>
                <div className="col-span-1 text-right text-muted-foreground">
                  {clusterMetrics.active_connections}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* No clusters message */}
      {isExpanded && e6Clusters.length === 0 && (
        <div className="bg-muted/20 border-t px-6 py-4 pl-16 text-sm text-muted-foreground">
          No E6 clusters found in this workspace
        </div>
      )}
    </div>
  )
}
