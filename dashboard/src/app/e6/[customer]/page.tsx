"use client"

import { useState, useEffect, useMemo } from "react"
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
} from "laminar-ui"
import { DateBanner } from "@/components/shared"
import {
  Building2,
  Server,
  ChevronRight,
  ChevronLeft,
  Cpu,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Layers,
} from "lucide-react"
import { E6_SCHEMA_PREFIX } from "@/lib/utils"

interface ClusterStats {
  cluster_name: string
  engine_uptime: number
  executor_count: number
  container_count: number
  queue_depth: number
  running_queries: number
  last_updated: string | null
  health_status: "healthy" | "warning" | "critical" | "unknown"
  [key: string]: unknown
}

interface CustomerStats {
  totalClusters: number
  totalExecutors: number
  totalContainers: number
  totalQueueDepth: number
}

export default function CustomerDetailPage() {
  const params = useParams()
  const database = params.customer as string
  const [clusters, setClusters] = useState<ClusterStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create display name from database name
  const displayName = useMemo(() => {
    return database
      .replace(E6_SCHEMA_PREFIX, "")
      .split("_")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }, [database])

  // Fetch cluster data
  useEffect(() => {
    async function fetchClusters() {
      setLoading(true)
      setError(null)

      try {
        // Get cluster list and latest timestamp from e6_engine_metrics
        const engineResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT
                cluster_name,
                MAX(ts) as last_updated
              FROM e6_engine_metrics
              GROUP BY cluster_name
              ORDER BY cluster_name
            `,
          }),
        })
        const engineData = await engineResponse.json()

        // Get executor counts per cluster (using pod as executor identifier)
        const executorResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT
                cluster_name,
                COUNT(DISTINCT pod) as executor_count
              FROM e6_executor_metrics
              WHERE ts >= NOW() - INTERVAL '10 minutes'
              GROUP BY cluster_name
            `,
          }),
        })
        const executorData = await executorResponse.json()

        // Get container counts per cluster
        const containerResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT
                cluster_name,
                COUNT(DISTINCT pod) as container_count
              FROM e6_container_metrics
              WHERE ts >= NOW() - INTERVAL '10 minutes'
              GROUP BY cluster_name
            `,
          }),
        })
        const containerData = await containerResponse.json()

        // Get queue depth per cluster (using NumExecutionQueuedQueries metric)
        const queueResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database,
            sql: `
              SELECT
                cluster_name,
                MAX(metric_value) as queue_depth
              FROM e6_queue_metrics
              WHERE metric_name = 'io_e6x_E6Queue_NumExecutionQueuedQueries'
                AND ts >= NOW() - INTERVAL '10 minutes'
              GROUP BY cluster_name
            `,
          }),
        })
        const queueData = await queueResponse.json()

        // Build executor map
        const executorMap: Record<string, number> = {}
        if (executorData.data) {
          for (const row of executorData.data) {
            executorMap[row.cluster_name] = row.executor_count || 0
          }
        }

        // Build container map
        const containerMap: Record<string, number> = {}
        if (containerData.data) {
          for (const row of containerData.data) {
            containerMap[row.cluster_name] = row.container_count || 0
          }
        }

        // Build queue map
        const queueMap: Record<string, number> = {}
        if (queueData.data) {
          for (const row of queueData.data) {
            queueMap[row.cluster_name] = row.queue_depth || 0
          }
        }

        // Combine all data
        const clusterStats: ClusterStats[] = []
        if (engineData.data) {
          for (const row of engineData.data) {
            const lastUpdated = row.last_updated

            // Determine health status based on data freshness
            let healthStatus: "healthy" | "warning" | "critical" | "unknown" = "unknown"
            if (lastUpdated) {
              const dataAge = Date.now() - new Date(lastUpdated).getTime()
              const dataAgeMinutes = dataAge / 60000

              if (dataAgeMinutes < 10) {
                healthStatus = "healthy"
              } else if (dataAgeMinutes < 30) {
                healthStatus = "warning"
              } else {
                healthStatus = "critical"
              }
            }

            clusterStats.push({
              cluster_name: row.cluster_name,
              engine_uptime: 0, // Not available in current schema
              executor_count: executorMap[row.cluster_name] || 0,
              container_count: containerMap[row.cluster_name] || 0,
              queue_depth: queueMap[row.cluster_name] || 0,
              running_queries: 0, // Not available in current schema
              last_updated: lastUpdated,
              health_status: healthStatus,
            })
          }
        }

        setClusters(clusterStats)
      } catch (err) {
        console.error("Error fetching cluster data:", err)
        setError("Failed to fetch cluster data")
      } finally {
        setLoading(false)
      }
    }

    if (database) {
      fetchClusters()
    }
  }, [database])

  // Calculate customer stats
  const customerStats: CustomerStats = useMemo(() => {
    return {
      totalClusters: clusters.length,
      totalExecutors: clusters.reduce((sum, c) => sum + c.executor_count, 0),
      totalContainers: clusters.reduce((sum, c) => sum + c.container_count, 0),
      totalQueueDepth: clusters.reduce((sum, c) => sum + c.queue_depth, 0),
    }
  }, [clusters])

  // Format uptime
  const formatUptime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0s"
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  // Format date
  const formatDate = (dateStr: string | null): string => {
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

  // Get health badge
  const getHealthBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        )
      case "warning":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        )
      case "critical":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            Unknown
          </Badge>
        )
    }
  }

  // Cluster table columns
  const clusterColumns = [
    {
      key: "cluster_name",
      header: "Cluster",
      sortable: true,
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
      key: "health_status",
      header: "Status",
      render: (value: unknown) => getHealthBadge(String(value)),
    },
    {
      key: "engine_uptime",
      header: "Uptime",
      sortable: true,
      render: (value: unknown) => (
        <span className="text-sm">{formatUptime(Number(value))}</span>
      ),
    },
    {
      key: "executor_count",
      header: "Executors",
      sortable: true,
      render: (value: unknown) => (
        <Badge variant="secondary">{String(value)}</Badge>
      ),
    },
    {
      key: "container_count",
      header: "Containers",
      sortable: true,
    },
    {
      key: "queue_depth",
      header: "Queue Depth",
      sortable: true,
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
      key: "running_queries",
      header: "Running",
      sortable: true,
    },
    {
      key: "last_updated",
      header: "Last Updated",
      render: (value: unknown) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(value as string | null)}
        </span>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/e6">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/e6">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
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

  return (
    <div className="space-y-6">
      <DateBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/e6">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
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
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{customerStats.totalClusters}</p>
                <p className="text-sm text-muted-foreground">Clusters</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Cpu className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{customerStats.totalExecutors}</p>
                <p className="text-sm text-muted-foreground">Executors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <HardDrive className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{customerStats.totalContainers}</p>
                <p className="text-sm text-muted-foreground">Containers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Layers className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{customerStats.totalQueueDepth}</p>
                <p className="text-sm text-muted-foreground">Queue Depth</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Table */}
      {clusters.length > 0 ? (
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
                columns={clusterColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Clusters Found</h3>
            <p className="text-muted-foreground">
              No cluster data found for this customer. Make sure the e6metrics-exporter is collecting data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
