"use client"

import { Suspense } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
} from "e6ds"
import { InfoPopover, DateBanner, DataHealthIndicator } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery, formatBytes } from "@/hooks/useQuery"
import { Cloud, Server, Database, HardDrive, MessageSquare, ArrowRight, Cpu, Activity } from "lucide-react"

interface ServiceOverview {
  service: string
  resource_count: number
}

interface EC2Summary {
  total_instances: number
  avg_cpu: number
  total_network_in: number
  total_network_out: number
}

interface EKSSummary {
  total_clusters: number
  total_nodes: number
  avg_cpu: number
  avg_memory: number
}

interface RDSSummary {
  total_instances: number
  avg_cpu: number
  total_connections: number
  total_iops: number
}

interface S3Summary {
  total_buckets: number
  total_size: number
  total_objects: number
  total_requests: number
}

interface MSKSummary {
  total_clusters: number
  total_brokers: number
  total_messages: number
  total_throughput: number
}

function ServiceCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function EC2Card({ startTs, endTs }: { startTs: string; endTs: string }) {
  const { data } = useQuery<EC2Summary>(
    "cloudwatch",
    "getEC2Summary",
    [{ startTs, endTs }],
    { refetchInterval: 300000 }
  )

  const summary = data?.[0]

  return (
    <Link href="/aws/ec2">
      <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">EC2</CardTitle>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <CardDescription>Elastic Compute Cloud instances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Instances</div>
              <p className="text-lg font-semibold">{summary?.total_instances || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg CPU</div>
              <p className="text-lg font-semibold">{(summary?.avg_cpu || 0).toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Network In</div>
              <p className="text-lg font-semibold">{formatBytes(summary?.total_network_in || 0)}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Network Out</div>
              <p className="text-lg font-semibold">{formatBytes(summary?.total_network_out || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EKSCard({ startTs, endTs }: { startTs: string; endTs: string }) {
  const { data } = useQuery<EKSSummary>(
    "cloudwatch",
    "getEKSSummary",
    [{ startTs, endTs }],
    { refetchInterval: 300000 }
  )

  const summary = data?.[0]

  return (
    <Link href="/aws/eks">
      <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">EKS</CardTitle>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <CardDescription>Elastic Kubernetes Service clusters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Clusters</div>
              <p className="text-lg font-semibold">{summary?.total_clusters || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Nodes</div>
              <p className="text-lg font-semibold">{summary?.total_nodes || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg CPU</div>
              <p className="text-lg font-semibold">{(summary?.avg_cpu || 0).toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg Memory</div>
              <p className="text-lg font-semibold">{(summary?.avg_memory || 0).toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function RDSCard({ startTs, endTs }: { startTs: string; endTs: string }) {
  const { data } = useQuery<RDSSummary>(
    "cloudwatch",
    "getRDSSummary",
    [{ startTs, endTs }],
    { refetchInterval: 300000 }
  )

  const summary = data?.[0]

  return (
    <Link href="/aws/rds">
      <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">RDS</CardTitle>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <CardDescription>Relational Database Service instances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Instances</div>
              <p className="text-lg font-semibold">{summary?.total_instances || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg CPU</div>
              <p className="text-lg font-semibold">{(summary?.avg_cpu || 0).toFixed(1)}%</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Connections</div>
              <p className="text-lg font-semibold">{summary?.total_connections || 0}</p>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Total IOPS</div>
              <p className="text-lg font-semibold">{(summary?.total_iops || 0).toFixed(0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function S3Card({ startTs, endTs }: { startTs: string; endTs: string }) {
  const { data } = useQuery<S3Summary>(
    "cloudwatch",
    "getS3Summary",
    [{ startTs, endTs }],
    { refetchInterval: 300000 }
  )

  const summary = data?.[0]

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-green-500" />
          <CardTitle className="text-lg">S3</CardTitle>
        </div>
        <CardDescription>Simple Storage Service buckets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Buckets</div>
            <p className="text-lg font-semibold">{summary?.total_buckets || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total Size</div>
            <p className="text-lg font-semibold">{formatBytes(summary?.total_size || 0)}</p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Objects</div>
            <p className="text-lg font-semibold">{(summary?.total_objects || 0).toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Requests</div>
            <p className="text-lg font-semibold">{(summary?.total_requests || 0).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MSKCard({ startTs, endTs }: { startTs: string; endTs: string }) {
  const { data } = useQuery<MSKSummary>(
    "cloudwatch",
    "getMSKSummary",
    [{ startTs, endTs }],
    { refetchInterval: 300000 }
  )

  const summary = data?.[0]

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-red-500" />
          <CardTitle className="text-lg">MSK</CardTitle>
        </div>
        <CardDescription>Managed Streaming for Apache Kafka</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Clusters</div>
            <p className="text-lg font-semibold">{summary?.total_clusters || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Brokers</div>
            <p className="text-lg font-semibold">{summary?.total_brokers || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Messages/sec</div>
            <p className="text-lg font-semibold">{(summary?.total_messages || 0).toFixed(0)}</p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Throughput</div>
            <p className="text-lg font-semibold">{formatBytes(summary?.total_throughput || 0)}/s</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AWSPageContent() {
  const { startTimestamp, endTimestamp } = useDate()

  // Data health query
  const { data: dataHealth } = useQuery<{ last_data: string }>(
    "cloudwatch",
    "getDataHealth",
    [],
    { refetchInterval: 60000 }
  )
  const lastDataTimestamp = dataHealth?.[0]?.last_data || null

  return (
    <div className="space-y-6">
      <DateBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold">AWS Services</h1>
            <p className="text-muted-foreground">
              CloudWatch metrics for AWS resources
            </p>
          </div>
          <InfoPopover
            title="AWS CloudWatch Metrics"
            description="Displays CloudWatch metrics from AWS services including EC2, EKS, RDS, S3, and MSK. Metrics are collected at hourly intervals and include CPU utilization, network traffic, storage, and more."
          />
        </div>
        <DataHealthIndicator
          lastDataTimestamp={lastDataTimestamp}
          dataSource="CloudWatch metrics"
          expectedIntervalMinutes={60}
          warningThresholdMinutes={120}
          criticalThresholdMinutes={180}
        />
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <EC2Card startTs={startTimestamp} endTs={endTimestamp} />
        <EKSCard startTs={startTimestamp} endTs={endTimestamp} />
        <RDSCard startTs={startTimestamp} endTs={endTimestamp} />
        <S3Card startTs={startTimestamp} endTs={endTimestamp} />
        <MSKCard startTs={startTimestamp} endTs={endTimestamp} />
      </div>
    </div>
  )
}

export default function AWSPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <AWSPageContent />
    </Suspense>
  )
}
