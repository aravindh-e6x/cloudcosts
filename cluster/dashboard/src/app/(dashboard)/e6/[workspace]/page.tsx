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
  WorkspaceChatPanel,
  E6ClusterPackingSection,
  TimelineProvider,
  TimelineScrubber,
  ClusterTreemap,
  MemoryTreemap,
  CostDrilldown,
} from "./components"

interface NodeCount {
  node_count: number
}

interface PodCount {
  pod_count: number
}

interface CostToday {
  cost_today: number
}

interface ClusterMetrics {
  cluster: string
  cpu_allocated: number
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
  const dbOpts = { database: workspace.database }

  // Fetch node count
  const { data: nodeCountData, loading: nodeLoading } = useQuery<NodeCount>(
    "workspaces",
    "getNodeCount",
    [dateRange],
    dbOpts
  )

  // Fetch pod count
  const { data: podCountData, loading: podLoading } = useQuery<PodCount>(
    "workspaces",
    "getPodCount",
    [dateRange],
    dbOpts
  )

  // Fetch total cost
  const { data: costData, loading: costLoading } = useQuery<CostToday>(
    "workspaces",
    "getWorkspaceMetrics",
    [dateRange],
    dbOpts
  )

  // Fetch E6 clusters (namespaces with executor pods)
  const { data: clusterData, loading: clustersLoading } = useQuery<ClusterMetrics>(
    "workspaces",
    "getClusterMetrics",
    [dateRange],
    dbOpts
  )

  // Extract values from query results
  const nodeCount = nodeCountData?.[0]?.node_count || 0
  const podCount = podCountData?.[0]?.pod_count || 0
  const costToday = costData?.[0]?.cost_today || 0
  const e6Clusters = clusterData?.map(c => c.cluster) || []

  // Time series data is not yet available - placeholders for now
  const nodeChartData: { time: string; value: number }[] = []
  const costChartData: { time: string; value: number }[] = []
  const podChartData: { time: string; value: number }[] = []

  const isLoading = nodeLoading || podLoading || costLoading || clustersLoading

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
    <TimelineProvider dateRange={dateRange}>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Back Link */}
          <Link href="/e6" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Workspaces
          </Link>

          {/* Workspace Heading */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-mono">{workspace.name}</h1>
            <span className="text-sm text-muted-foreground">{workspace.region || "-"}</span>
          </div>

          {/* Timeline Scrubber - Sticky at top */}
          <div className="sticky top-0 z-30 -mx-6 px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TimelineScrubber />
          </div>

          {/* Header Card */}
          <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Overview</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{selectedDate}</p>
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
                      description="Total compute cost for all nodes in this cluster"
                      metric="node_total_hourly_cost"
                    />
                  </div>
                  {costLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p
                      className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setCostModalOpen(true)}
                    >
                      ${costToday.toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">/day</span>
                    </p>
                  )}
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
                    <InfoTooltip
                      description="Number of worker nodes in this cluster"
                      metric="kube_node_status_allocatable_cpu_cores"
                    />
                  </div>
                  {nodeLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{nodeCount}</p>}
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
                      metric="container_cpu_allocation"
                    />
                  </div>
                  {podLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{podCount}</p>}
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
                      description="E6 database clusters deployed in this workspace"
                      metric="container_cpu_allocation (by namespace)"
                    />
                  </div>
                  {clustersLoading ? (
                    <>
                      <Skeleton className="h-8 w-12 mb-1" />
                      <Skeleton className="h-5 w-32" />
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{e6Clusters.length}</p>
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

      {/* E6 Cluster Packing Section */}
      <E6ClusterPackingSection
        eksCluster={workspace.id}
        e6Clusters={e6Clusters}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* Treemaps - CPU and Memory side by side */}
      <div className="grid grid-cols-2 gap-4">
        <ClusterTreemap />
        <MemoryTreemap />
      </div>

      {/* Cost Drilldown - Dual view by Node / E6 Cluster */}
      <CostDrilldown />
      </div>

        {/* AI Chat Panel */}
        <WorkspaceChatPanel
          eksCluster={workspace.id}
          e6Clusters={e6Clusters}
        />
      </TooltipProvider>
    </TimelineProvider>
  )
}
