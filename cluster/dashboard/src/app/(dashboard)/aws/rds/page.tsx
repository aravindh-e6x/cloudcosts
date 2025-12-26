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
import { Database, ArrowLeft, Cpu, HardDrive, Users, Activity } from "lucide-react"

interface RDSInstance {
  db_instance_identifier: string
  db_instance_class: string
  engine: string
  region: string
  account_id: string
  avg_cpu: number
  max_connections: number
  avg_freeable_memory: number
  avg_read_iops: number
  avg_write_iops: number
  min_free_storage: number
}

function InstanceTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {["Instance", "Engine", "Class", "Region", "Avg CPU", "Connections", "IOPS", "Free Storage"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    <Skeleton className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(4)].map((_, i) => (
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

function getEngineColor(engine: string): string {
  switch (engine?.toLowerCase()) {
    case 'mysql':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'postgres':
    case 'postgresql':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    case 'aurora':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'mariadb':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
    case 'sqlserver':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

function RDSPageContent() {
  const { startTimestamp, endTimestamp } = useDate()

  const { data: instances, loading, error } = useQuery<RDSInstance>(
    "cloudwatch",
    "getRDSInstances",
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
              <Database className="h-6 w-6 text-purple-500" />
              <h1 className="text-3xl font-bold">RDS Instances</h1>
            </div>
            <p className="text-muted-foreground">
              Relational Database Service instances and their metrics
            </p>
          </div>
          <InfoPopover
            title="RDS Instances"
            description="Displays CloudWatch metrics for RDS database instances including CPU utilization, connections, IOPS, and storage capacity."
          />
        </div>
        <DataHealthIndicator
          lastDataTimestamp={lastDataTimestamp}
          dataSource="CloudWatch RDS metrics"
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
                <Database className="h-4 w-4 text-muted-foreground" />
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
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Connections</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {instances.reduce((acc, i) => acc + (i.max_connections || 0), 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total IOPS</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {instances.reduce((acc, i) => acc + (i.avg_read_iops || 0) + (i.avg_write_iops || 0), 0).toFixed(0)}
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
            <CardTitle>All RDS Instances</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Instance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Engine</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Region</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Avg CPU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Connections</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">IOPS (R/W)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Free Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {instances.map((instance) => (
                    <tr key={instance.db_instance_identifier} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{instance.db_instance_identifier}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getEngineColor(instance.engine)}>
                          {instance.engine}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{instance.db_instance_class}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{instance.region}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${instance.avg_cpu > 80 ? 'text-destructive' : instance.avg_cpu > 60 ? 'text-yellow-600' : ''}`}>
                          {instance.avg_cpu?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {instance.max_connections || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-col">
                          <span>R: {(instance.avg_read_iops || 0).toFixed(0)}</span>
                          <span>W: {(instance.avg_write_iops || 0).toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${(instance.min_free_storage || 0) < 10737418240 ? 'text-destructive font-medium' : ''}`}>
                          {formatBytes(instance.min_free_storage || 0)}
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
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No RDS instances found for the selected date range</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function RDSPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <InstanceTableSkeleton />
      </div>
    }>
      <RDSPageContent />
    </Suspense>
  )
}
