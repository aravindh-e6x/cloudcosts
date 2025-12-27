"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, DollarSign, Cpu, Box, Layers, Info } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Skeleton,
} from "e6ds"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"
import { getWorkspace } from "@/config/workspaces"
import {
  NodePackingSection,
  RightSizingSection,
  CostBreakdownSection,
  IODataTransferSection,
  E6EngineUsageSection,
  WorkspaceChatPanel,
} from "./components"

interface WorkspaceStats {
  node_count: number
  pod_count: number
  e6_cluster_count: number
}

interface WorkspaceCost {
  hourly_cost: number
  total_cost: number
}

interface E6Cluster {
  namespace: string
}

interface TimeSeriesPoint {
  ts: string
  node_count?: number
  pod_count?: number
  hourly_cost?: number
}

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: workspaceId } = use(params)
  const workspace = getWorkspace(workspaceId)

  if (!workspace) {
    notFound()
  }

  const { timeRange } = useDate()
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [costModalOpen, setCostModalOpen] = useState(false)
  const [podModalOpen, setPodModalOpen] = useState(false)

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

  const selectedDate = timeRange?.from ? format(timeRange.from, "MMM d, yyyy") : format(new Date(), "MMM d, yyyy")

  // Fetch workspace stats (node_count, pod_count, e6_cluster_count)
  const { data: statsData, loading: statsLoading } = useQuery<WorkspaceStats>(
    "e6",
    "getWorkspaceStats",
    [dateRange],
    { database: workspace.database }
  )

  // Fetch workspace cost
  const { data: costData, loading: costLoading } = useQuery<WorkspaceCost>(
    "e6",
    "getWorkspaceCost",
    [dateRange],
    { database: workspace.database }
  )

  // Fetch E6 clusters list
  const { data: e6ClustersData, loading: e6ClustersLoading } = useQuery<E6Cluster>(
    "e6",
    "getE6Clusters",
    [dateRange],
    { database: workspace.database }
  )

  // Fetch time series data
  const { data: nodeTimeSeriesData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getNodeCountTimeSeries",
    [dateRange],
    { database: workspace.database }
  )

  const { data: costTimeSeriesData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getCostTimeSeries",
    [dateRange],
    { database: workspace.database }
  )

  const { data: podTimeSeriesData } = useQuery<TimeSeriesPoint>(
    "e6",
    "getPodCountTimeSeries",
    [dateRange],
    { database: workspace.database }
  )

  // Extract values from query results
  const stats = statsData?.[0] || { node_count: 0, pod_count: 0, e6_cluster_count: 0 }
  const cost = costData?.[0] || { hourly_cost: 0, total_cost: 0 }
  const e6Clusters = e6ClustersData?.map(c => c.namespace) || []

  // Format time series data for charts
  const nodeChartData = useMemo(() => {
    if (!nodeTimeSeriesData?.length) return []
    return nodeTimeSeriesData.map(d => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.node_count || 0,
    }))
  }, [nodeTimeSeriesData])

  const costChartData = useMemo(() => {
    if (!costTimeSeriesData?.length) return []
    return costTimeSeriesData.map(d => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.hourly_cost || 0,
    }))
  }, [costTimeSeriesData])

  const podChartData = useMemo(() => {
    if (!podTimeSeriesData?.length) return []
    return podTimeSeriesData.map(d => ({
      time: format(new Date(d.ts), "HH:mm"),
      value: d.pod_count || 0,
    }))
  }, [podTimeSeriesData])

  const isLoading = statsLoading || costLoading || e6ClustersLoading

  // Info tooltip helper
  const InfoTooltip = ({ description, metric }: { description: string; metric?: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{description}</p>
        {metric && <p className="text-xs text-muted-foreground mt-1">Metric: {metric}</p>}
      </TooltipContent>
    </Tooltip>
  )

  // Reusable chart component
  const TimeSeriesChart = ({
    data,
    color,
    label,
    formatter = (v: number) => v.toString()
  }: {
    data: { time: string; value: number }[]
    color: string
    label: string
    formatter?: (v: number) => string
  }) => (
    <div className="h-[400px] mt-4">
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
          <RechartsTooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#333' }}
            formatter={(value) => [formatter(value as number), label]}
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
    </div>
  )

  return (
    <TooltipProvider>
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
                <CardTitle className="text-lg font-mono">{workspace.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{selectedDate}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{workspace.region || "-"}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Cost Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Cost</span>
                    <InfoTooltip
                      description="Total compute cost for all nodes in this EKS cluster"
                      metric="node_total_hourly_cost"
                    />
                  </div>
                  {costLoading ? (
                    <>
                      <Skeleton className="h-6 w-24 mb-1" />
                      <Skeleton className="h-8 w-20" />
                    </>
                  ) : (
                    <>
                      <p className="text-lg text-muted-foreground">
                        ${(cost.hourly_cost || 0).toFixed(2)}/hr
                        <span className="text-xs ml-1">instant</span>
                      </p>
                      <p
                        className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setCostModalOpen(true)}
                      >
                        ${(cost.total_cost || 0).toFixed(0)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">/day</span>
                      </p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">click total for trend</p>
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
                    <InfoTooltip
                      description="Number of worker nodes in this EKS cluster"
                      metric="kube_node_info"
                    />
                  </div>
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{stats.node_count}</p>}
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
                    <InfoTooltip
                      description="Total number of pods running across all nodes"
                      metric="kube_pod_info"
                    />
                  </div>
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{stats.pod_count}</p>}
                  <p className="text-xs text-muted-foreground">click for trend</p>
                </CardContent>
              </Card>

              {/* E6 Clusters Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Layers className="h-4 w-4" />
                    <span className="text-xs">E6 Clusters</span>
                    <InfoTooltip
                      description="E6 database clusters deployed in this EKS cluster"
                      metric="kube_namespace_labels"
                    />
                  </div>
                  {statsLoading || e6ClustersLoading ? (
                    <>
                      <Skeleton className="h-8 w-12 mb-1" />
                      <Skeleton className="h-5 w-32" />
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{stats.e6_cluster_count}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {e6Clusters.slice(0, 3).map(cluster => (
                          <Badge key={cluster} variant="secondary" className="text-xs">
                            {cluster}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
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
            color="#3b82f6"
            label="Pods"
          />
        </DialogContent>
      </Dialog>

      {/* Node Packing Section */}
      <NodePackingSection
        eksCluster={workspace.id}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* Right-Sizing Section */}
      <RightSizingSection
        eksCluster={workspace.id}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* Cost Breakdown Section */}
      <CostBreakdownSection
        eksCluster={workspace.id}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* IO & Data Transfer Section */}
      <IODataTransferSection
        eksCluster={workspace.id}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* E6 Engine Usage Section */}
      <E6EngineUsageSection
        eksCluster={workspace.id}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />
      </div>

      {/* AI Chat Panel */}
      <WorkspaceChatPanel
        eksCluster={workspace.id}
        e6Clusters={e6Clusters}
      />
    </TooltipProvider>
  )
}
