"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, DollarSign, Cpu, Box, Layers } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "e6ds"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"
import { QueryError, EmptyState } from "@/components"

interface WorkspaceStats {
  node_count: number
  pod_count: number
  e6_cluster_count: number
}

interface WorkspaceInfo {
  eks_cluster: string
  region: string
}

interface WorkspaceCost {
  total_cost: number
  hourly_cost: number
}

interface E6Cluster {
  e6_cluster: string
}

interface NodeCountTimeSeries {
  ts: string
  node_count: number
}

interface CostTimeSeries {
  ts: string
  hourly_cost: number
}

interface PodCountTimeSeries {
  ts: string
  pod_count: number
}

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ eksCluster: string }>
}) {
  const { eksCluster } = use(params)
  const decodedCluster = decodeURIComponent(eksCluster)
  const { timeRange, startTimestamp, endTimestamp } = useDate()
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [costModalOpen, setCostModalOpen] = useState(false)
  const [podModalOpen, setPodModalOpen] = useState(false)

  const dateRange = useMemo(() => ({
    startTs: startTimestamp,
    endTs: endTimestamp,
  }), [startTimestamp, endTimestamp])

  // Fetch workspace info (region)
  const { data: workspaceData, loading: loadingInfo, error: errorInfo } = useQuery<WorkspaceInfo>(
    "e6",
    "getWorkspaceInfo",
    [decodedCluster, dateRange],
    { database: "kubernetes" }
  )

  // Fetch workspace stats
  const { data: statsData, loading: loadingStats, error: errorStats, refetch } = useQuery<WorkspaceStats>(
    "e6",
    "getWorkspaceStats",
    [decodedCluster, dateRange],
    { database: "kubernetes" }
  )

  // Fetch workspace cost
  const { data: costData, loading: loadingCost } = useQuery<WorkspaceCost>(
    "e6",
    "getWorkspaceCost",
    [decodedCluster, dateRange],
    { database: "kubernetes" }
  )

  // Fetch E6 clusters
  const { data: e6ClustersData } = useQuery<E6Cluster>(
    "e6",
    "getE6Clusters",
    [decodedCluster, dateRange],
    { database: "kubernetes" }
  )

  // Fetch node count time series (only when modal is open)
  const { data: nodeTimeSeriesData, loading: loadingNodeTimeSeries } = useQuery<NodeCountTimeSeries>(
    "e6",
    "getNodeCountTimeSeries",
    [decodedCluster, dateRange],
    { database: "kubernetes", enabled: nodeModalOpen }
  )

  // Fetch cost time series (only when modal is open)
  const { data: costTimeSeriesData, loading: loadingCostTimeSeries } = useQuery<CostTimeSeries>(
    "e6",
    "getCostTimeSeries",
    [decodedCluster, dateRange],
    { database: "kubernetes", enabled: costModalOpen }
  )

  // Fetch pod count time series (only when modal is open)
  const { data: podTimeSeriesData, loading: loadingPodTimeSeries } = useQuery<PodCountTimeSeries>(
    "e6",
    "getPodCountTimeSeries",
    [decodedCluster, dateRange],
    { database: "kubernetes", enabled: podModalOpen }
  )

  const workspace = workspaceData?.[0]
  const stats = statsData?.[0]
  const cost = costData?.[0]
  const e6Clusters = e6ClustersData?.map(c => c.e6_cluster) || []
  const loading = loadingInfo || loadingStats || loadingCost
  const error = errorInfo || errorStats

  const selectedDate = timeRange?.from ? format(timeRange.from, "MMM d, yyyy") : ""

  // Format node time series data for chart
  const nodeChartData = useMemo(() => {
    if (!nodeTimeSeriesData) return []
    return nodeTimeSeriesData.map(d => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.node_count,
    }))
  }, [nodeTimeSeriesData])

  // Format cost time series data for chart
  const costChartData = useMemo(() => {
    if (!costTimeSeriesData) return []
    return costTimeSeriesData.map(d => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.hourly_cost,
    }))
  }, [costTimeSeriesData])

  // Format pod time series data for chart
  const podChartData = useMemo(() => {
    if (!podTimeSeriesData) return []
    return podTimeSeriesData.map(d => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.pod_count,
    }))
  }, [podTimeSeriesData])

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/e6" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Workspaces
        </Link>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href="/e6" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Workspaces
        </Link>
        <QueryError message={error} onRetry={refetch} />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <Link href="/e6" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Workspaces
        </Link>
        <EmptyState
          title="No data found"
          description="No data available for this workspace on the selected date."
        />
      </div>
    )
  }

  // Reusable chart component
  const TimeSeriesChart = ({
    data,
    loading,
    color,
    label,
    formatter = (v: number) => v.toString()
  }: {
    data: { time: string; value: number }[]
    loading: boolean
    color: string
    label: string
    formatter?: (v: number) => string
  }) => (
    <div className="h-[400px] mt-4">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Skeleton className="h-full w-full" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: '#666' }}
              tickLine={false}
              axisLine={{ stroke: '#ccc' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#666' }}
              tickLine={false}
              axisLine={{ stroke: '#ccc' }}
              domain={[0, 'dataMax + 2']}
              allowDecimals={false}
              tickFormatter={formatter}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#333' }}
              formatter={(value: number) => [formatter(value), label]}
            />
            <Line
              type="stepAfter"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link href="/e6" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Workspaces
      </Link>

      {/* Header Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-mono">{decodedCluster}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{selectedDate}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {workspace?.region && (
                <span>{workspace.region}</span>
              )}
              <span>Account: 123456789</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Cost Card - Clickable */}
            <Card
              className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => setCostModalOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Cost</span>
                </div>
                <p className="text-2xl font-bold">
                  ${cost?.total_cost?.toFixed(0) || "0"}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/day</span>
                </p>
                <p className="text-xs text-muted-foreground">click for trend</p>
              </CardContent>
            </Card>

            {/* Nodes Card - Clickable */}
            <Card
              className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => setNodeModalOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Cpu className="h-4 w-4" />
                  <span className="text-xs">Nodes</span>
                </div>
                <p className="text-2xl font-bold">{stats.node_count}</p>
                <p className="text-xs text-muted-foreground">click for trend</p>
              </CardContent>
            </Card>

            {/* Pods Card - Clickable */}
            <Card
              className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
              onClick={() => setPodModalOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Box className="h-4 w-4" />
                  <span className="text-xs">Pods</span>
                </div>
                <p className="text-2xl font-bold">{stats.pod_count}</p>
                <p className="text-xs text-muted-foreground">click for trend</p>
              </CardContent>
            </Card>

            {/* E6 Clusters Card */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Layers className="h-4 w-4" />
                  <span className="text-xs">E6 Clusters</span>
                </div>
                <p className="text-2xl font-bold">{stats.e6_cluster_count}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {e6Clusters.slice(0, 3).map(cluster => (
                    <Badge key={cluster} variant="secondary" className="text-xs">
                      {cluster}
                    </Badge>
                  ))}
                  {e6Clusters.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{e6Clusters.length - 3}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Cost Modal */}
      <Dialog open={costModalOpen} onOpenChange={setCostModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Hourly Cost - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <TimeSeriesChart
            data={costChartData}
            loading={loadingCostTimeSeries}
            color="#f59e0b"
            label="Cost/hr"
            formatter={(v) => `$${v.toFixed(2)}`}
          />
        </DialogContent>
      </Dialog>

      {/* Node Count Modal */}
      <Dialog open={nodeModalOpen} onOpenChange={setNodeModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Node Count - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <TimeSeriesChart
            data={nodeChartData}
            loading={loadingNodeTimeSeries}
            color="#16a34a"
            label="Nodes"
          />
        </DialogContent>
      </Dialog>

      {/* Pod Count Modal */}
      <Dialog open={podModalOpen} onOpenChange={setPodModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              Pod Count - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <TimeSeriesChart
            data={podChartData}
            loading={loadingPodTimeSeries}
            color="#3b82f6"
            label="Pods"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
