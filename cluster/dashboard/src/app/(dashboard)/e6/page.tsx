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
} from "laminar-ui"
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

interface CustomerStatsRow {
  cluster_count: number
  last_updated: string | null
}

interface ContainerCountRow {
  container_count: number
}

export default function E6OverviewPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const { startTimestamp, endTimestamp } = useDate()

  // Fetch all databases using the query hook
  const { data: dbData, loading: dbLoading, error: dbError } = useQuery<DatabaseRow>(
    "e6",
    "getAllDatabases",
    [],
    { database: "information_schema" }
  )

  // Filter to e6_* databases
  const e6Databases = useMemo(() => {
    if (!dbData) return []
    return dbData
      .map((row) => row.schema_name)
      .filter((db) => db.startsWith(E6_SCHEMA_PREFIX))
  }, [dbData])

  // Fetch stats for each database (we need to do this in useEffect since we need dynamic databases)
  useEffect(() => {
    async function fetchCustomerStats() {
      if (e6Databases.length === 0) {
        setCustomers([])
        setLoading(false)
        return
      }

      setLoading(true)
      const dateRange = { startTs: startTimestamp, endTs: endTimestamp }

      const summaries: CustomerSummary[] = []

      for (const db of e6Databases) {
        try {
          // Fetch customer stats using API
          const statsResponse = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schema: "e6",
              queryName: "getCustomerStats",
              params: [dateRange],
              database: db,
            }),
          })
          const statsResult = await statsResponse.json()

          // Fetch container count using API
          const containerResponse = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schema: "e6",
              queryName: "getContainerCount",
              params: [dateRange],
              database: db,
            }),
          })
          const containerResult = await containerResponse.json()

          const clusterCount = statsResult.data?.[0]?.cluster_count || 0
          const lastUpdated = statsResult.data?.[0]?.last_updated || null
          const containerCount = containerResult.data?.[0]?.container_count || 0

          // Create display name from database name
          const displayName = db
            .replace(E6_SCHEMA_PREFIX, "")
            .split("_")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")

          summaries.push({
            database: db,
            displayName,
            clusterCount,
            containerCount,
            lastUpdated,
          })
        } catch (err) {
          console.error(`Error fetching stats for ${db}:`, err)
          // Still add the database even if stats fail
          summaries.push({
            database: db,
            displayName: db.replace(E6_SCHEMA_PREFIX, "").replace(/_/g, " "),
            clusterCount: 0,
            containerCount: 0,
            lastUpdated: null,
          })
        }
      }

      setCustomers(summaries)
      setLoading(false)
    }

    if (startTimestamp && endTimestamp && !dbLoading) {
      fetchCustomerStats()
    }
  }, [e6Databases, startTimestamp, endTimestamp, dbLoading])

  // Calculate totals
  const totals = useMemo(() => {
    return {
      customers: customers.length,
      clusters: customers.reduce((sum, c) => sum + c.clusterCount, 0),
      containers: customers.reduce((sum, c) => sum + c.containerCount, 0),
    }
  }, [customers])

  // Format date
  const formatDate = (dateStr: string | null) => {
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

  // Customer table columns
  const customerColumns = [
    {
      key: "displayName",
      header: "Customer",
      render: (value: unknown, row: CustomerSummary) => (
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
          {formatDate(value as string | null)}
        </span>
      ),
    },
  ]

  const isLoading = dbLoading || loading

  if (isLoading) {
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

  if (dbError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">E6 Clusters</h1>
          <p className="text-red-500">{dbError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DateBanner />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">E6 Clusters</h1>
        <p className="text-muted-foreground">
          Monitor E6 engine metrics across all customers
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totals.customers}</p>
                <p className="text-sm text-muted-foreground">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Server className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{totals.clusters}</p>
                <p className="text-sm text-muted-foreground">Active Clusters</p>
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
                <p className="text-3xl font-bold">{totals.containers}</p>
                <p className="text-sm text-muted-foreground">Containers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      {customers.length > 0 ? (
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
              columns={customerColumns}
              hoverable
              striped
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No E6 Data Found</h3>
            <p className="text-muted-foreground">
              No e6_* databases found in GreptimeDB. Make sure the e6metrics-exporter is running.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
