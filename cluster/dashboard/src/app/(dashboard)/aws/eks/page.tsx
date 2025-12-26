"use client"

import { Suspense } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Badge,
} from "laminar-ui"
import { InfoPopover, DateBanner, DataHealthIndicator } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery, formatBytes } from "@/hooks/useQuery"
import { Cloud, ArrowLeft, Server, Cpu, HardDrive, AlertTriangle } from "lucide-react"

interface EKSCluster {
  cluster_name: string
  region: string
  account_id: string
  avg_node_count: number
  max_failed_nodes: number
  avg_node_cpu: number
  avg_node_memory: number
}

function ClusterTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {["Cluster", "Region", "Nodes", "Failed Nodes", "Avg CPU", "Avg Memory"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-t">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function EKSPageContent() {
  const { startTimestamp, endTimestamp } = useDate()

  const { data: clusters, loading, error } = useQuery<EKSCluster>(
    "cloudwatch",
    "getEKSClusters",
    [{ startTs: startTimestamp, endTs: endTimestamp }],
    { refetchInterval: 300000 }
  )

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
          <Link href="/aws" className="text-muted-foreground hover:text-foreground transition-colors mr-2">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Cloud className="h-6 w-6 text-blue-500" />
              <h1 className="text-3xl font-bold">EKS Clusters</h1>
            </div>
            <p className="text-muted-foreground">
              Elastic Kubernetes Service clusters and their metrics
            </p>
          </div>
          <InfoPopover
            title="EKS Clusters"
            description="Displays CloudWatch Container Insights metrics for EKS clusters including node count, CPU/memory utilization, and failed nodes."
          />
        </div>
        <DataHealthIndicator
          lastDataTimestamp={lastDataTimestamp}
          dataSource="CloudWatch EKS metrics"
          expectedIntervalMinutes={60}
          warningThresholdMinutes={120}
          criticalThresholdMinutes={180}
        />
      </div>

      {/* Summary Cards */}
      {clusters && clusters.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Clusters</span>
              </div>
              <p className="text-2xl font-bold mt-2">{clusters.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Nodes</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {clusters.reduce((acc, c) => acc + (c.avg_node_count || 0), 0).toFixed(0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Node CPU</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {(clusters.reduce((acc, c) => acc + (c.avg_node_cpu || 0), 0) / clusters.length).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Node Memory</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {(clusters.reduce((acc, c) => acc + (c.avg_node_memory || 0), 0) / clusters.length).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clusters Table */}
      {loading ? (
        <ClusterTableSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            <p>Error loading clusters: {error}</p>
          </CardContent>
        </Card>
      ) : clusters && clusters.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All EKS Clusters</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Cluster</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Region</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Account</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nodes</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Failed Nodes</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Avg Node CPU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Avg Node Memory</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clusters.map((cluster) => (
                    <tr key={cluster.cluster_name} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{cluster.cluster_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{cluster.region}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cluster.account_id}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {cluster.avg_node_count?.toFixed(0) || 0}
                      </td>
                      <td className="px-4 py-3">
                        {cluster.max_failed_nodes > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {cluster.max_failed_nodes}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${cluster.avg_node_cpu > 80 ? 'text-destructive' : cluster.avg_node_cpu > 60 ? 'text-yellow-600' : ''}`}>
                          {cluster.avg_node_cpu?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${cluster.avg_node_memory > 80 ? 'text-destructive' : cluster.avg_node_memory > 60 ? 'text-yellow-600' : ''}`}>
                          {cluster.avg_node_memory?.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No EKS clusters found for the selected date range</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function EKSPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <ClusterTableSkeleton />
      </div>
    }>
      <EKSPageContent />
    </Suspense>
  )
}
