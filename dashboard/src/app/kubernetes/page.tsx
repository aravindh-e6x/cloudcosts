"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { groupBy, sumBy, maxBy } from "lodash-es"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Skeleton,
} from "laminar-ui"
import { InfoPopover, TimeRangePicker, type DateRange } from "@/components/shared"
import { useQuery, formatBytes, formatCurrency } from "@/hooks/useQuery"
import { kubernetesQueries } from "@/lib/queries"
import { Server, Cpu, HardDrive, Box, Layers, DollarSign, ArrowRight } from "lucide-react"

interface ClusterBasic {
  cluster: string
  node_count: number
}

interface ClusterStats {
  pod_count: number
  namespace_count: number
  hourly_cost: number
  cpu_allocated: number
  memory_allocated: number
}

function ClusterCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ClusterCard({ cluster, selectedDate }: { cluster: ClusterBasic; selectedDate: string }) {
  // Fetch additional stats for this cluster
  const { data: statsData } = useQuery<ClusterStats>(
    "kubernetes",
    kubernetesQueries.clusterStats(cluster.cluster, selectedDate),
    { refetchInterval: 300000 }
  )

  const stats = statsData?.[0]
  const hourly = stats?.hourly_cost || 0
  const dailyCost = hourly * 24
  const monthlyCost = dailyCost * 30

  return (
    <Link href={`/kubernetes/${encodeURIComponent(cluster.cluster)}?date=${selectedDate}`}>
      <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{cluster.cluster}</CardTitle>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <CardDescription>
            {cluster.node_count} nodes across {stats?.namespace_count || 0} namespaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resource Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Server className="h-3 w-3" />
                Nodes
              </div>
              <p className="text-lg font-semibold">{cluster.node_count}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Box className="h-3 w-3" />
                Pods
              </div>
              <p className="text-lg font-semibold">{stats?.pod_count || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                Namespaces
              </div>
              <p className="text-lg font-semibold">{stats?.namespace_count || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Cpu className="h-3 w-3" />
                CPU Cores
              </div>
              <p className="text-lg font-semibold">{(stats?.cpu_allocated || 0).toFixed(1)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Memory
              </div>
              <p className="text-lg font-semibold">{formatBytes(stats?.memory_allocated || 0)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Cost/hr
              </div>
              <p className="text-lg font-semibold">{formatCurrency(hourly, 2)}</p>
            </div>
          </div>

          {/* Cost Estimates */}
          <div className="pt-2 border-t flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Daily: </span>
              <span className="font-medium">{formatCurrency(dailyCost, 0)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly: </span>
              <span className="font-medium">{formatCurrency(monthlyCost, 0)}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              View Details
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function KubernetesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const [timeRange, setTimeRange] = useState<DateRange | undefined>(() => {
    if (dateParam) {
      const date = new Date(dateParam)
      return { from: date, to: date }
    }
    return { from: new Date(), to: new Date() }
  })

  const selectedDate = useMemo(() => {
    return (timeRange?.from || new Date()).toISOString().split('T')[0]
  }, [timeRange])

  // Update URL when date changes (only if different from current)
  useEffect(() => {
    if (dateParam !== selectedDate) {
      router.replace(`/kubernetes?date=${selectedDate}`, { scroll: false })
    }
  }, [selectedDate, dateParam, router])

  const { data: rawClusters, loading, error } = useQuery<ClusterBasic>(
    "kubernetes",
    kubernetesQueries.allClustersSummary(selectedDate),
    { refetchInterval: 300000 }
  )

  // Deduplicate clusters by name (take max node count for each unique cluster)
  const clusters = useMemo(() => {
    if (!rawClusters) return null
    const filtered = rawClusters.filter((c) => c.cluster && c.cluster.trim() !== '')
    const grouped = groupBy(filtered, (c) => c.cluster.trim())
    return Object.entries(grouped).map(([name, entries]) => ({
      cluster: name,
      node_count: maxBy(entries, 'node_count')?.node_count || sumBy(entries, 'node_count'),
    }))
  }, [rawClusters])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold">Kubernetes Clusters</h1>
            <p className="text-muted-foreground">
              Select a cluster to view detailed metrics and resources
            </p>
          </div>
          <InfoPopover
            title="Kubernetes Clusters"
            description="Lists all Kubernetes clusters with their resource metrics for the selected date. Each card shows node count, pod count, namespaces, CPU/memory allocation, and estimated hourly cost based on node pricing."
            sql={`-- Cluster list query:\n${kubernetesQueries.allClustersSummary(selectedDate)}\n\n-- Per-cluster stats query (example):\n${kubernetesQueries.clusterStats('CLUSTER_NAME', selectedDate)}`}
          />
        </div>
        <TimeRangePicker value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Cluster Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ClusterCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            <p>Error loading clusters: {error}</p>
          </CardContent>
        </Card>
      ) : clusters && clusters.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <ClusterCard key={cluster.cluster} cluster={cluster} selectedDate={selectedDate} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No clusters found for {selectedDate}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function KubernetesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ClusterCardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <KubernetesPageContent />
    </Suspense>
  )
}
