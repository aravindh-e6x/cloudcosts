"use client"

import { useState, useEffect, useMemo } from "react"
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
} from "e6ds"
import { Building2, Server, ChevronRight, Database, HardDrive } from "lucide-react"
import { DateBanner } from "@/components"
import { useDate } from "@/components/providers"
import { useQuery } from "@/hooks/useQuery"
import { E6_SCHEMA_PREFIX } from "@/lib/utils"

interface CustomerSummary {
  database: string
  displayName: string
  clusterCount: number
  containerCount: number
  lastUpdated: string | null
  [key: string]: unknown
}

interface DatabaseRow {
  schema_name: string
}

function formatRelativeDate(dateStr: string | null): string {
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

function formatDisplayName(database: string): string {
  return database
    .replace(E6_SCHEMA_PREFIX, "")
    .split("_")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

interface StatCardProps {
  icon: React.ReactNode
  iconBgClass: string
  value: number
  label: string
}

function StatCard({ icon, iconBgClass, value, label }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgClass}`}>
            {icon}
          </div>
          <div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface OverviewStatsProps {
  customers: CustomerSummary[]
}

function OverviewStats({ customers }: OverviewStatsProps) {
  const totals = useMemo(() => ({
    customers: customers.length,
    clusters: customers.reduce((sum, c) => sum + c.clusterCount, 0),
    containers: customers.reduce((sum, c) => sum + c.containerCount, 0),
  }), [customers])

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        icon={<Building2 className="h-5 w-5 text-primary" />}
        iconBgClass="bg-primary/10"
        value={totals.customers}
        label="Customers"
      />
      <StatCard
        icon={<Server className="h-5 w-5 text-emerald-500" />}
        iconBgClass="bg-emerald-500/10"
        value={totals.clusters}
        label="Active Clusters"
      />
      <StatCard
        icon={<HardDrive className="h-5 w-5 text-purple-500" />}
        iconBgClass="bg-purple-500/10"
        value={totals.containers}
        label="Containers"
      />
    </div>
  )
}

interface CustomerRowData {
  database: string
  displayName: string
  clusterCount: number
  containerCount: number
  lastUpdated: string | null
}

function createCustomerColumns() {
  return [
    {
      key: "displayName",
      header: "Customer",
      render: (value: unknown, row: CustomerRowData) => (
        <Link
          href={`/e6/${row.database}`}
          className="flex items-center gap-2 hover:text-primary"
        >
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{String(value)}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </Link>
      ),
    },
    {
      key: "database",
      header: "Database",
      render: (value: unknown) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{String(value)}</code>
      ),
    },
    {
      key: "clusterCount",
      header: "Clusters",
      render: (value: unknown) => (
        <Badge variant="secondary">{String(value)}</Badge>
      ),
    },
    {
      key: "containerCount",
      header: "Containers",
    },
    {
      key: "lastUpdated",
      header: "Last Updated",
      render: (value: unknown) => (
        <span className="text-muted-foreground text-sm">
          {formatRelativeDate(value as string | null)}
        </span>
      ),
    },
  ]
}

interface CustomerTableProps {
  customers: CustomerSummary[]
}

function CustomerTable({ customers }: CustomerTableProps) {
  const columns = useMemo(() => createCustomerColumns(), [])

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No E6 Data Found</h3>
          <p className="text-muted-foreground">
            No e6_* databases found in GreptimeDB. Make sure the e6metrics-exporter is running.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Customers</CardTitle>
        <CardDescription>
          Click a row to view customer clusters and metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          data={customers}
          columns={columns}
          hoverable
          striped
        />
      </CardContent>
    </Card>
  )
}

interface CustomerStatsLoaderProps {
  database: string
  dateRange: { startTs: string; endTs: string }
  onLoaded: (stats: CustomerSummary) => void
}

function CustomerStatsLoader({ database, dateRange, onLoaded }: CustomerStatsLoaderProps) {
  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsResponse, containerResponse] = await Promise.all([
          fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schema: "e6",
              queryName: "getCustomerStats",
              params: [dateRange],
              database,
            }),
          }),
          fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schema: "e6",
              queryName: "getContainerCount",
              params: [dateRange],
              database,
            }),
          }),
        ])

        const [statsResult, containerResult] = await Promise.all([
          statsResponse.json(),
          containerResponse.json(),
        ])

        onLoaded({
          database,
          displayName: formatDisplayName(database),
          clusterCount: statsResult.data?.[0]?.cluster_count || 0,
          containerCount: containerResult.data?.[0]?.container_count || 0,
          lastUpdated: statsResult.data?.[0]?.last_updated || null,
        })
      } catch {
        onLoaded({
          database,
          displayName: formatDisplayName(database),
          clusterCount: 0,
          containerCount: 0,
          lastUpdated: null,
        })
      }
    }

    fetchStats()
  }, [database, dateRange, onLoaded])

  return null
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">E6 Clusters</h1>
        <p className="text-muted-foreground">Loading customer data...</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
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

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">E6 Clusters</h1>
        <p className="text-red-500">{error}</p>
      </div>
    </div>
  )
}

export default function E6OverviewPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loadedCount, setLoadedCount] = useState(0)
  const { startTimestamp, endTimestamp } = useDate()
  const dateRange = useMemo(() => ({ startTs: startTimestamp, endTs: endTimestamp }), [startTimestamp, endTimestamp])

  const { data: dbData, loading: dbLoading, error: dbError } = useQuery<DatabaseRow>(
    "e6",
    "getAllDatabases",
    [],
    { database: "information_schema" }
  )

  const e6Databases = useMemo(() => {
    if (!dbData) return []
    return dbData
      .map((row) => row.schema_name)
      .filter((db) => db.startsWith(E6_SCHEMA_PREFIX))
  }, [dbData])

  useEffect(() => {
    setCustomers([])
    setLoadedCount(0)
  }, [e6Databases.length, startTimestamp, endTimestamp])

  const handleCustomerLoaded = useMemo(() => {
    return (stats: CustomerSummary) => {
      setCustomers(prev => {
        const existing = prev.find(c => c.database === stats.database)
        if (existing) return prev
        return [...prev, stats]
      })
      setLoadedCount(prev => prev + 1)
    }
  }, [])

  const isLoading = dbLoading || (e6Databases.length > 0 && loadedCount < e6Databases.length)

  if (dbLoading) {
    return <LoadingSkeleton />
  }

  if (dbError) {
    return <ErrorDisplay error={dbError} />
  }

  return (
    <div className="space-y-6">
      <DateBanner />

      {e6Databases.map((db) => (
        <CustomerStatsLoader
          key={db}
          database={db}
          dateRange={dateRange}
          onLoaded={handleCustomerLoaded}
        />
      ))}

      <div>
        <h1 className="text-2xl font-bold">E6 Clusters</h1>
        <p className="text-muted-foreground">
          Monitor E6 engine metrics across all customers
          {isLoading && ` (Loading ${loadedCount}/${e6Databases.length}...)`}
        </p>
      </div>

      <OverviewStats customers={customers} />

      <CustomerTable customers={customers} />
    </div>
  )
}
