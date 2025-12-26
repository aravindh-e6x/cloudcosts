"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Badge,
  Skeleton,
  Button,
} from "e6ds"
import { DateBanner } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"
import {
  Building2,
  Server,
  ChevronRight,
  ChevronLeft,
  Cpu,
  HardDrive,
  Layers,
} from "lucide-react"
import { E6_SCHEMA_PREFIX } from "@/lib/utils"

interface ClusterListRow {
  cluster_name: string
  last_updated: string | null
}

interface ExecutorCountRow {
  cluster_name: string
  executor_count: number
}

interface ContainerCountRow {
  cluster_name: string
  container_count: number
}

interface QueueDepthRow {
  cluster_name: string
  queue_depth: number
}

interface ClusterStats {
  cluster_name: string
  executor_count: number
  container_count: number
  queue_depth: number
  last_updated: string | null
  [key: string]: unknown
}

function formatDisplayName(database: string): string {
  return database
    .replace(E6_SCHEMA_PREFIX, "")
    .split("_")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "No data"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return date.toLocaleDateString()
}

interface PageHeaderProps {
  database: string
  displayName: string
}

function PageHeader({ database, displayName }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Link href="/e6">
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>
      </Link>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <code className="text-sm text-muted-foreground">{database}</code>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  iconBgClass: string
  value: number
  label: string
}

function StatCard({ icon, iconBgClass, value, label }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface CustomerStatsProps {
  clusters: ClusterStats[]
}

function CustomerStats({ clusters }: CustomerStatsProps) {
  const stats = useMemo(() => ({
    totalClusters: clusters.length,
    totalExecutors: clusters.reduce((sum, c) => sum + c.executor_count, 0),
    totalContainers: clusters.reduce((sum, c) => sum + c.container_count, 0),
    totalQueueDepth: clusters.reduce((sum, c) => sum + c.queue_depth, 0),
  }), [clusters])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard
        icon={<Server className="h-5 w-5 text-primary" />}
        iconBgClass="bg-primary/10"
        value={stats.totalClusters}
        label="Clusters"
      />
      <StatCard
        icon={<Cpu className="h-5 w-5 text-emerald-500" />}
        iconBgClass="bg-emerald-500/10"
        value={stats.totalExecutors}
        label="Executors"
      />
      <StatCard
        icon={<HardDrive className="h-5 w-5 text-purple-500" />}
        iconBgClass="bg-purple-500/10"
        value={stats.totalContainers}
        label="Containers"
      />
      <StatCard
        icon={<Layers className="h-5 w-5 text-orange-500" />}
        iconBgClass="bg-orange-500/10"
        value={stats.totalQueueDepth}
        label="Queue Depth"
      />
    </div>
  )
}

interface ClusterTableProps {
  database: string
  clusters: ClusterStats[]
}

function ClusterTable({ database, clusters }: ClusterTableProps) {
  const columns = useMemo(() => [
    {
      key: "cluster_name",
      header: "Cluster",
      render: (value: unknown, row: ClusterStats) => (
        <Link
          href={`/e6/${database}/${encodeURIComponent(row.cluster_name)}`}
          className="flex items-center gap-2 hover:text-primary"
        >
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{String(value)}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </Link>
      ),
    },
    {
      key: "executor_count",
      header: "Executors",
      render: (value: unknown) => (
        <Badge variant="secondary">{String(value)}</Badge>
      ),
    },
    {
      key: "container_count",
      header: "Containers",
    },
    {
      key: "queue_depth",
      header: "Queue Depth",
      render: (value: unknown) => {
        const depth = Number(value)
        return (
          <span className={depth > 100 ? "text-yellow-600 font-medium" : ""}>
            {depth}
          </span>
        )
      },
    },
    {
      key: "last_updated",
      header: "Last Updated",
      render: (value: unknown) => (
        <span className="text-muted-foreground text-sm">
          {formatRelativeDate(value as string | null)}
        </span>
      ),
    },
  ], [database])

  if (clusters.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Clusters Found</h3>
          <p className="text-muted-foreground">
            No cluster data found for this customer. Make sure the e6metrics-exporter is collecting data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Clusters</CardTitle>
        <CardDescription>
          Click a row to view cluster metrics and details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          data={clusters}
          columns={columns}
          hoverable
          striped
        />
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton({ displayName }: { displayName: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/e6">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">Loading cluster data...</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorDisplay({ displayName, error }: { displayName: string; error: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/e6">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    </div>
  )
}

interface ClusterDataLoaderProps {
  database: string
  dateRange: { startTs: string; endTs: string }
  children: (props: { clusters: ClusterStats[]; loading: boolean; error: string | null }) => React.ReactNode
}

function ClusterDataLoader({ database, dateRange, children }: ClusterDataLoaderProps) {
  const { data: clusterListData, loading: clusterListLoading, error: clusterListError } = useQuery<ClusterListRow>(
    "e6",
    "getClusterList",
    [dateRange],
    { database, refetchInterval: 60000 }
  )

  const { data: executorData } = useQuery<ExecutorCountRow>(
    "e6",
    "getExecutorCountByCluster",
    [dateRange],
    { database, refetchInterval: 60000 }
  )

  const { data: containerData } = useQuery<ContainerCountRow>(
    "e6",
    "getContainerCountByCluster",
    [dateRange],
    { database, refetchInterval: 60000 }
  )

  const { data: queueData } = useQuery<QueueDepthRow>(
    "e6",
    "getQueueDepthByCluster",
    [dateRange],
    { database, refetchInterval: 60000 }
  )

  const clusters = useMemo<ClusterStats[]>(() => {
    if (!clusterListData) return []

    const executorMap: Record<string, number> = {}
    if (executorData) {
      for (const row of executorData) {
        executorMap[row.cluster_name] = row.executor_count || 0
      }
    }

    const containerMap: Record<string, number> = {}
    if (containerData) {
      for (const row of containerData) {
        containerMap[row.cluster_name] = row.container_count || 0
      }
    }

    const queueMap: Record<string, number> = {}
    if (queueData) {
      for (const row of queueData) {
        queueMap[row.cluster_name] = row.queue_depth || 0
      }
    }

    return clusterListData.map((row) => ({
      cluster_name: row.cluster_name,
      executor_count: executorMap[row.cluster_name] || 0,
      container_count: containerMap[row.cluster_name] || 0,
      queue_depth: queueMap[row.cluster_name] || 0,
      last_updated: row.last_updated,
    }))
  }, [clusterListData, executorData, containerData, queueData])

  return <>{children({ clusters, loading: clusterListLoading, error: clusterListError })}</>
}

export default function CustomerDetailPage() {
  const params = useParams()
  const database = params.customer as string
  const { startTimestamp, endTimestamp } = useDate()
  const dateRange = useMemo(() => ({ startTs: startTimestamp, endTs: endTimestamp }), [startTimestamp, endTimestamp])
  const displayName = useMemo(() => formatDisplayName(database), [database])

  return (
    <ClusterDataLoader database={database} dateRange={dateRange}>
      {({ clusters, loading, error }) => {
        if (loading) {
          return <LoadingSkeleton displayName={displayName} />
        }

        if (error) {
          return <ErrorDisplay displayName={displayName} error={error} />
        }

        return (
          <div className="space-y-6">
            <DateBanner />
            <PageHeader database={database} displayName={displayName} />
            <CustomerStats clusters={clusters} />
            <ClusterTable database={database} clusters={clusters} />
          </div>
        )
      }}
    </ClusterDataLoader>
  )
}
