"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TreeView,
  TreeNode,
  SQLEditor,
  TableSchema,
  DataTable,
  Button,
  ScrollArea,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "laminar-ui"
import { Database, Table, Columns, RefreshCw, Clock, ExternalLink } from "lucide-react"
import { isAllowedSchema, STATIC_SCHEMAS } from "@/lib/utils"

interface QueryResult {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  executionTime: number
}

interface TableInfo {
  name: string
  database: string
  columns: { name: string; type: string }[]
}

export default function GreptimeDBPage() {
  const [databases, setDatabases] = useState<string[]>([])
  const [tables, setTables] = useState<Record<string, TableInfo[]>>({})
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [query, setQuery] = useState("SELECT * FROM vantage_daily_cost_by_provider LIMIT 10")
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(true)

  // Fetch databases - show static schemas + any e6_* databases
  const fetchDatabases = useCallback(async () => {
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: "information_schema",
          sql: "SELECT schema_name FROM schemata ORDER BY schema_name",
        }),
      })
      const data = await response.json()
      if (data.data) {
        const allDatabases = data.data.map((row: { schema_name: string }) => row.schema_name)
        const allowedDatabases = allDatabases.filter(isAllowedSchema)
        setDatabases(allowedDatabases)
        return allowedDatabases
      }
    } catch (err) {
      console.error("Failed to fetch databases:", err)
    }
    // Fallback to static schemas
    setDatabases([...STATIC_SCHEMAS])
    return STATIC_SCHEMAS
  }, [])

  // Fetch tables for a database
  const fetchTables = useCallback(async (database: string) => {
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: "information_schema",
          sql: `SELECT table_name FROM tables WHERE table_schema = '${database}' ORDER BY table_name`,
        }),
      })
      const data = await response.json()
      if (data.data) {
        const tableList = data.data.map((row: { table_name: string }) => ({
          name: row.table_name,
          database,
          columns: [],
        }))
        setTables((prev) => ({ ...prev, [database]: tableList }))
        return tableList
      }
    } catch (err) {
      console.error(`Failed to fetch tables for ${database}:`, err)
    }
    return []
  }, [])

  // Fetch columns for a table
  const fetchColumns = useCallback(async (database: string, tableName: string) => {
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: "information_schema",
          sql: `SELECT column_name, data_type FROM columns WHERE table_schema = '${database}' AND table_name = '${tableName}' ORDER BY ordinal_position`,
        }),
      })
      const data = await response.json()
      if (data.data) {
        const columns = data.data.map((row: { column_name: string; data_type: string }) => ({
          name: row.column_name,
          type: row.data_type,
        }))
        setTables((prev) => ({
          ...prev,
          [database]: prev[database]?.map((t) =>
            t.name === tableName ? { ...t, columns } : t
          ) || [],
        }))
        return columns
      }
    } catch (err) {
      console.error(`Failed to fetch columns for ${database}.${tableName}:`, err)
    }
    return []
  }, [])

  // Load schema function - reusable for initial load and refresh
  const loadSchema = useCallback(async () => {
    setSchemaLoading(true)
    setTables({})
    const dbList = await fetchDatabases()
    // Auto-expand all allowed schemas
    setExpandedIds(dbList)

    // Fetch tables for all schemas
    for (const db of dbList) {
      await fetchTables(db)
    }
    setSchemaLoading(false)
  }, [fetchDatabases, fetchTables])

  // Load schema on mount
  useEffect(() => {
    loadSchema()
  }, [loadSchema])

  // Build tree data for TreeView
  const treeData: TreeNode[] = useMemo(() => {
    return databases.map((db) => ({
      id: db,
      label: db,
      icon: <Database className="h-4 w-4" />,
      children: (tables[db] || []).map((table) => ({
        id: `${db}.${table.name}`,
        label: table.name,
        icon: <Table className="h-4 w-4" />,
        data: { database: db, table: table.name },
        children: table.columns.length > 0
          ? table.columns.map((col) => ({
              id: `${db}.${table.name}.${col.name}`,
              label: col.name,
              secondaryLabel: col.type,
              icon: <Columns className="h-3 w-3" />,
              data: { database: db, table: table.name, column: col.name, type: col.type },
            }))
          : [{ id: `${db}.${table.name}._loading`, label: "Loading...", icon: <Columns className="h-3 w-3 opacity-50" /> }],
      })),
    }))
  }, [databases, tables])

  // Build schemas for SQLEditor autocomplete
  const schemas: TableSchema[] = useMemo(() => {
    const result: TableSchema[] = []
    Object.entries(tables).forEach(([, tableList]) => {
      tableList.forEach((table) => {
        if (table.columns.length > 0) {
          result.push({
            name: table.name,
            columns: table.columns.map((col) => ({
              name: col.name,
              type: col.type,
            })),
          })
        }
      })
    })
    return result
  }, [tables])

  // Handle tree node expansion
  const handleExpand = async (ids: string[]) => {
    const newIds = ids.filter((id) => !expandedIds.includes(id))
    setExpandedIds(ids)

    // Find newly expanded nodes and fetch their data
    for (const id of newIds) {
      // Database node - fetch tables
      if (databases.includes(id) && !tables[id]) {
        await fetchTables(id)
      }
      // Table node - fetch columns
      const parts = id.split(".")
      if (parts.length === 2) {
        const [db, tableName] = parts
        const tableInfo = tables[db]?.find((t) => t.name === tableName)
        if (tableInfo && tableInfo.columns.length === 0) {
          await fetchColumns(db, tableName)
        }
      }
    }
  }

  // Handle tree node click
  const handleNodeClick = (node: TreeNode) => {
    if (node.data?.table && !node.data?.column) {
      const db = node.data.database as string
      const tableName = node.data.table as string
      const tableInfo = tables[db]?.find((t) => t.name === tableName)
      if (tableInfo) {
        setSelectedTable(tableInfo)
        setQuery(`SELECT * FROM ${db}.${tableName} LIMIT 100`)
      }
    } else if (node.data?.column) {
      // Insert column name at cursor
      const colName = node.data.column as string
      setQuery((prev) => prev + colName)
    }
  }

  // Execute query
  const executeQuery = async (sql: string) => {
    setIsLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      // Determine database from query or use default
      let database = "vantage"
      const fromMatch = sql.match(/FROM\s+(\w+)/i)
      if (fromMatch) {
        const tableName = fromMatch[1]
        // Find which database has this table
        for (const [db, tableList] of Object.entries(tables)) {
          if (tableList.some((t) => t.name === tableName)) {
            database = db
            break
          }
        }
      }

      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database, sql }),
      })

      const data = await response.json()
      const executionTime = Date.now() - startTime

      if (data.error) {
        setError(data.error)
        setQueryResult(null)
      } else if (data.data && data.data.length > 0) {
        const columns = Object.keys(data.data[0])
        const rows = data.data.map((row: Record<string, unknown>) =>
          columns.map((col) => row[col])
        )
        setQueryResult({
          columns,
          rows,
          rowCount: rows.length,
          executionTime,
        })
      } else {
        setQueryResult({
          columns: [],
          rows: [],
          rowCount: 0,
          executionTime,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query execution failed")
      setQueryResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Format value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  // Build columns for DataTable
  const resultColumns = useMemo(() => {
    if (!queryResult) return []
    return queryResult.columns.map((col) => ({
      key: col,
      header: col,
      sortable: true,
      render: (value: unknown) => (
        <span className="font-mono text-xs">{formatValue(value)}</span>
      ),
    }))
  }, [queryResult])

  // Build data for DataTable
  const resultData = useMemo(() => {
    if (!queryResult) return []
    return queryResult.rows.map((row, idx) => {
      const obj: Record<string, unknown> = { _id: idx }
      queryResult.columns.forEach((col, colIdx) => {
        obj[col] = row[colIdx]
      })
      return obj
    })
  }, [queryResult])

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">GreptimeDB Query Editor</h1>
          <p className="text-sm text-muted-foreground">
            Explore schema and run SQL queries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSchema}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Schema
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href="https://greptimedb.cloudcosts.in/dashboard" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open GreptimeDB
            </a>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Schema Explorer */}
        <Card className="w-[400px] flex flex-col flex-shrink-0">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Schema Explorer</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {schemaLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading schema...</div>
              ) : (
                <TreeView
                  data={treeData}
                  expandedIds={expandedIds}
                  onExpand={handleExpand}
                  onNodeClick={handleNodeClick}
                />
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Editor and Results */}
        <div className="flex-1 grid grid-rows-2 gap-4 min-h-0 min-w-0 overflow-hidden">
          {/* SQL Editor */}
          <Card className="flex flex-col min-h-0 overflow-hidden">
            <SQLEditor
              value={query}
              onChange={(val) => setQuery(val || "")}
              onExecute={executeQuery}
              height="calc(100% - 1px)"
              theme="light"
              schemas={schemas}
              showToolbar={true}
              showRunButton={true}
              showCopyButton={true}
              showFullscreenButton={true}
              loading={isLoading}
              className="h-full"
            />
          </Card>

          {/* Results */}
          <Card className="flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="py-2 px-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Results</CardTitle>
                {queryResult && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {queryResult.rowCount} rows
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {queryResult.executionTime}ms
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {error ? (
                <div className="p-4 text-sm text-red-500 bg-red-500/10">
                  <strong>Error:</strong> {error}
                </div>
              ) : queryResult ? (
                <div className="h-full overflow-auto">
                  <div className="p-2 min-w-max">
                    {queryResult.rows.length > 0 ? (
                      <DataTable
                        data={resultData}
                        columns={resultColumns}
                        hoverable
                        striped
                      />
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        Query returned no results
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Run a query to see results
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
