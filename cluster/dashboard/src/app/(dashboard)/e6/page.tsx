"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
} from "e6ds"
import { Server, MapPin, Layers } from "lucide-react"
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

export default function E6ClustersPage() {
  const { timeRange } = useDate()

  const dateRange = useMemo(() => {
    const from = timeRange?.from || new Date()
    const to = timeRange?.to || new Date()
    // Set to start/end of day
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

  // Group by eks_cluster to dedupe (join may produce multiple rows)
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">E6 Workspaces</h1>
          <p className="text-muted-foreground mt-1">Loading workspaces...</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">E6 Workspaces</h1>
        </div>
        <QueryError message={error} onRetry={refetch} />
      </div>
    )
  }

  if (!workspaces.length) {
    return (
      <div className="space-y-8">
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">E6 Workspaces</h1>
        <p className="text-muted-foreground mt-1">
          Select a workspace to view E6 cluster metrics and resource usage
        </p>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {workspaces.map((workspace) => (
          <WorkspaceCard
            key={workspace.eks_cluster}
            workspace={workspace}
            dateRange={dateRange}
          />
        ))}
      </div>
    </div>
  )
}

function WorkspaceCard({
  workspace,
  dateRange,
}: {
  workspace: Workspace
  dateRange: { startTs: string; endTs: string }
}) {
  // Fetch E6 clusters for this workspace
  const { data: e6ClustersData } = useQuery<E6Cluster>(
    "e6",
    "getE6Clusters",
    [workspace.eks_cluster, dateRange],
    { database: "kubernetes" }
  )

  const e6Clusters = e6ClustersData?.map((c) => c.e6_cluster) || []

  // Extract workspace name from eks_cluster (e.g., "condenast-prod-eks" -> "condenast")
  const workspaceName = workspace.eks_cluster.split("-")[0]

  return (
    <Link href={`/e6/${encodeURIComponent(workspace.eks_cluster)}`}>
      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="capitalize text-xl">{workspaceName}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {e6Clusters.length} cluster{e6Clusters.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <CardDescription className="flex items-center gap-1.5 mt-1">
            <Server className="h-3.5 w-3.5" />
            {workspace.eks_cluster}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metadata */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{workspace.region || "Unknown region"}</span>
          </div>

          {/* E6 Clusters */}
          {e6Clusters.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Layers className="h-4 w-4" />
                <span>E6 Clusters</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {e6Clusters.map((cluster) => (
                  <Badge key={cluster} variant="secondary" className="text-xs">
                    {cluster}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
