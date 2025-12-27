"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
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
import {
  NodePackingSection,
  RightSizingSection,
  CostBreakdownSection,
  IODataTransferSection,
  E6EngineUsageSection,
} from "./components"

// Mock data for workspace stats
const MOCK_STATS = {
  node_count: 7,
  pod_count: 85,
  e6_cluster_count: 3,
}

const MOCK_WORKSPACE = {
  region: "eu-west-1",
}

const MOCK_COST = {
  hourly_cost: 2.68,
  total_cost: 64.32,
}

const MOCK_E6_CLUSTERS = ["prod-analytics", "prod-reporting", "dev-testing"]

// Generate mock time series data
const generateMockTimeSeries = (baseValue: number, variance: number) => {
  const data = []
  for (let i = 0; i < 24; i++) {
    const hourFactor = Math.sin((i - 6) * Math.PI / 12) * 0.3 + 0.7
    data.push({
      time: `${i.toString().padStart(2, '0')}:00`,
      value: Math.round(baseValue * hourFactor * (1 + (Math.random() - 0.5) * variance)),
    })
  }
  return data
}

export default function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ eksCluster: string }>
}) {
  const { eksCluster } = use(params)
  const decodedCluster = decodeURIComponent(eksCluster)
  const { timeRange } = useDate()
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [costModalOpen, setCostModalOpen] = useState(false)
  const [podModalOpen, setPodModalOpen] = useState(false)

  const dateRange = useMemo(() => ({
    startTs: "",
    endTs: "",
  }), [])

  const selectedDate = timeRange?.from ? format(timeRange.from, "MMM d, yyyy") : format(new Date(), "MMM d, yyyy")

  // Mock time series data
  const nodeChartData = useMemo(() => generateMockTimeSeries(7, 0.2), [])
  const costChartData = useMemo(() => generateMockTimeSeries(2.68, 0.3).map(d => ({ ...d, value: d.value / 2.5 })), [])
  const podChartData = useMemo(() => generateMockTimeSeries(85, 0.15), [])

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
                <CardTitle className="text-lg font-mono">{decodedCluster}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{selectedDate}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{MOCK_WORKSPACE.region}</span>
                <span>Account: 123456789</span>
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
                  <p className="text-lg text-muted-foreground">
                    ${MOCK_COST.hourly_cost.toFixed(2)}/hr
                    <span className="text-xs ml-1">instant</span>
                  </p>
                  <p
                    className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setCostModalOpen(true)}
                  >
                    ${MOCK_COST.total_cost.toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/day</span>
                  </p>
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
                  <p className="text-2xl font-bold">{MOCK_STATS.node_count}</p>
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
                  <p className="text-2xl font-bold">{MOCK_STATS.pod_count}</p>
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
                  <p className="text-2xl font-bold">{MOCK_STATS.e6_cluster_count}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {MOCK_E6_CLUSTERS.slice(0, 3).map(cluster => (
                      <Badge key={cluster} variant="secondary" className="text-xs">
                        {cluster}
                      </Badge>
                    ))}
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
        eksCluster={decodedCluster}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* Right-Sizing Section */}
      <RightSizingSection
        eksCluster={decodedCluster}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* Cost Breakdown Section */}
      <CostBreakdownSection
        eksCluster={decodedCluster}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* IO & Data Transfer Section */}
      <IODataTransferSection
        eksCluster={decodedCluster}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />

      {/* E6 Engine Usage Section */}
      <E6EngineUsageSection
        eksCluster={decodedCluster}
        dateRange={dateRange}
        selectedDate={selectedDate}
      />
      </div>
    </TooltipProvider>
  )
}
