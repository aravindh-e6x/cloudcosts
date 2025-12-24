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
import { DateBanner } from "@/components/shared"
import { isAllowedSchema, E6_SCHEMA_PREFIX } from "@/lib/utils"

interface CustomerSummary {
  database: string
  displayName: string
  clusterCount: number
  containerCount: number
  lastUpdated: string | null
  [key: string]: unknown
}

interface ClusterSummary {
  cluster_name: string
  engine_uptime: number
  executor_count: number
  container_count: number
  queue_depth: number
}

export default function E6OverviewPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all e6_* databases and their summary stats
  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true)
      setError(null)

      try {
        // First, get all databases
        const dbResponse = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            database: "information_schema",
            sql: "SELECT schema_name FROM schemata ORDER BY schema_name",
          }),
        })
        const dbData = await dbResponse.json()

        if (!dbData.data) {
          setCustomers([])
          setLoading(false)
          return
        }

        // Filter to e6_* databases
        const e6Databases = dbData.data
          .map((row: { schema_name: string }) => row.schema_name)
          .filter((db: string) => db.startsWith(E6_SCHEMA_PREFIX))

        // For each database, get summary stats
        const summaries: CustomerSummary[] = []

        for (const db of e6Databases) {
          try {
            // Get cluster count and last updated
            const statsResponse = await fetch("/api/query", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                database: db,
                sql: `
                  SELECT
                    COUNT(DISTINCT cluster_name) as cluster_count,
                    MAX(ts) as last_updated
                  FROM e6_engine_metrics
                `,
              }),
            })
            const statsData = await statsResponse.json()

            // Get container count
            const containerResponse = await fetch("/api/query", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                database: db,
                sql: `SELECT COUNT(DISTINCT pod) as container_count FROM e6_container_metrics`,
              }),
            })
            const containerData = await containerResponse.json()

            const clusterCount = statsData.data?.[0]?.cluster_count || 0
            const lastUpdated = statsData.data?.[0]?.last_updated || null
            const containerCount = containerData.data?.[0]?.container_count || 0

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
      } catch (err) {
        console.error("Error fetching customers:", err)
        setError("Failed to fetch customer data")
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

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
      sortable: true,
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
      sortable: true,
      render: (value: unknown) => (
        <Badge variant="secondary">{String(value)}</Badge>
      ),
    },
    {
      key: "containerCount",
      header: "Containers",
      sortable: true,
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

  if (loading) {
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

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">E6 Clusters</h1>
          <p className="text-red-500">{error}</p>
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
