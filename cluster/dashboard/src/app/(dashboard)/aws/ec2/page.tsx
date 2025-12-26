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
} from "e6ds"
import { InfoPopover, DateBanner, DataHealthIndicator } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery, formatBytes } from "@/hooks/useQuery"
import { Server, ArrowLeft, Cpu, Network, HardDrive, AlertCircle, CheckCircle } from "lucide-react"

interface EC2Instance {
  instance_id: string
  instance_type: string
  instance_name: string
  region: string
  account_id: string
  availability_zone: string
  avg_cpu: number
  max_cpu: number
  total_network_in: number
  total_network_out: number
  total_disk_read: number
  total_disk_write: number
  status_check_failed: number
}

function InstanceTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {["Instance", "Type", "Region", "CPU", "Network In", "Network Out", "Disk I/O", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-t">
                  {[...Array(8)].map((_, j) => (
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

function EC2PageContent() {
  const { startTimestamp, endTimestamp } = useDate()

  const { data: instances, loading, error } = useQuery<EC2Instance>(
    "cloudwatch",
    "getEC2Instances",
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
              <Server className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">EC2 Instances</h1>
            </div>
            <p className="text-muted-foreground">
              Elastic Compute Cloud instances and their metrics
            </p>
          </div>
          <InfoPopover
            title="EC2 Instances"
            description="Displays CloudWatch metrics for EC2 instances including CPU utilization, network traffic, and disk I/O. Status indicates if any status checks have failed."
          />
        </div>
        <DataHealthIndicator
          lastDataTimestamp={lastDataTimestamp}
          dataSource="CloudWatch EC2 metrics"
          expectedIntervalMinutes={60}
          warningThresholdMinutes={120}
          criticalThresholdMinutes={180}
        />
      </div>

      {/* Summary Cards */}
      {instances && instances.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Instances</span>
              </div>
              <p className="text-2xl font-bold mt-2">{instances.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg CPU</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {(instances.reduce((acc, i) => acc + (i.avg_cpu || 0), 0) / instances.length).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Network</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {formatBytes(instances.reduce((acc, i) => acc + (i.total_network_in || 0) + (i.total_network_out || 0), 0))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Failed Checks</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {instances.filter(i => i.status_check_failed > 0).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instances Table */}
      {loading ? (
        <InstanceTableSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            <p>Error loading instances: {error}</p>
          </CardContent>
        </Card>
      ) : instances && instances.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Instances</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Instance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Region</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Avg CPU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Max CPU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Network In</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Network Out</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Disk I/O</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {instances.map((instance) => (
                    <tr key={instance.instance_id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{instance.instance_name}</span>
                          <span className="text-xs text-muted-foreground">{instance.instance_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{instance.instance_type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm">{instance.region}</span>
                          <span className="text-xs text-muted-foreground">{instance.availability_zone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${instance.avg_cpu > 80 ? 'text-destructive' : instance.avg_cpu > 60 ? 'text-yellow-600' : ''}`}>
                          {instance.avg_cpu?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${instance.max_cpu > 90 ? 'text-destructive' : instance.max_cpu > 75 ? 'text-yellow-600' : ''}`}>
                          {instance.max_cpu?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatBytes(instance.total_network_in || 0)}</td>
                      <td className="px-4 py-3 text-sm">{formatBytes(instance.total_network_out || 0)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col">
                          <span>R: {formatBytes(instance.total_disk_read || 0)}</span>
                          <span>W: {formatBytes(instance.total_disk_write || 0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {instance.status_check_failed > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Healthy
                          </Badge>
                        )}
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
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No EC2 instances found for the selected date range</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function EC2Page() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <InstanceTableSkeleton />
      </div>
    }>
      <EC2PageContent />
    </Suspense>
  )
}
