"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  PieChart,
  Badge,
  Button,
} from "laminar-ui"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import {
  InfoPopover,
  ComparisonCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
} from "@/components/shared"
import { useDate } from "@/components/providers"
import { formatCurrency } from "@/hooks/useQuery"
import {
  useTagCoverage,
  useUntaggedByService,
  useTagValueDistribution,
  useVantageResources,
} from "@/hooks/useVantage"
import { Tag, Package } from "lucide-react"

// Default required tags - these can be made configurable
const DEFAULT_REQUIRED_TAGS = ["Environment", "Team", "CostCenter", "Project"]

// Pagination component
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t">
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems.toLocaleString()} items
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Paginated DataTable wrapper
function PaginatedDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 10,
  hoverable,
}: {
  data: T[]
  columns: { key: string; header: string; sortable?: boolean; render?: (value: unknown, row: T) => React.ReactNode }[]
  pageSize?: number
  hoverable?: boolean
}) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(data.length / pageSize)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, currentPage, pageSize])

  // Reset to page 1 when data changes
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [data.length, totalPages, currentPage])

  if (data.length === 0) {
    return null
  }

  return (
    <div>
      <DataTable data={paginatedData} columns={columns} hoverable={hoverable} />
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={data.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

function TagCoverageBar({ label, percent, taggedCost, untaggedCost }: {
  label: string
  percent: number
  taggedCost: number
  untaggedCost: number
}) {
  const getColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500"
    if (pct >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {percent.toFixed(0)}% ({formatCurrency(taggedCost)} tagged)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(percent)} transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function TagsPage() {
  const [requiredTags] = useState(DEFAULT_REQUIRED_TAGS)
  const { startTimestamp, endTimestamp } = useDate()

  // Create date range for filtering
  const dateRange = useMemo(() => ({
    startTimestamp,
    endTimestamp,
  }), [startTimestamp, endTimestamp])

  // Fetch tag coverage data for selected date
  const {
    coverage,
    summary,
    resources,
    tags,
    loading: coverageLoading,
    error: coverageError,
  } = useTagCoverage(requiredTags, dateRange, { refetchInterval: 300000 })

  // Fetch untagged cost by service for selected date
  const {
    data: untaggedByService,
    loading: untaggedLoading,
    error: untaggedError,
  } = useUntaggedByService(requiredTags, dateRange, { refetchInterval: 300000 })

  // Fetch tag value distribution for Environment tag for selected date
  const {
    data: envDistribution,
    loading: envLoading,
    error: envError,
  } = useTagValueDistribution("Environment", dateRange, { refetchInterval: 300000 })

  // Prepare pie chart data for environment distribution
  const pieChartData = envDistribution.slice(0, 8).map((item, index) => ({
    name: item.value,
    value: item.cost,
    fill: `var(--chart-${(index % 5) + 1})`,
  }))

  // Table columns for resources
  const resourceColumns = [
    {
      key: "label",
      header: "Resource",
      sortable: true,
      render: (v: unknown) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate max-w-[300px]">{String(v)}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (v: unknown) => <Badge variant="outline">{String(v)}</Badge>,
    },
    {
      key: "provider",
      header: "Provider",
      sortable: true,
      render: (v: unknown) => (
        <Badge variant="secondary">{String(v).toUpperCase()}</Badge>
      ),
    },
    {
      key: "region",
      header: "Region",
      sortable: true,
    },
    {
      key: "cost",
      header: "Cost",
      sortable: true,
      render: (v: unknown) => formatCurrency(Number(v) || 0),
    },
  ]

  // Table columns for untagged by service
  const serviceColumns = [
    {
      key: "service",
      header: "Service",
      sortable: true,
      render: (v: unknown) => <Badge variant="outline">{String(v)}</Badge>,
    },
    {
      key: "cost",
      header: "Untagged Cost",
      sortable: true,
      render: (v: unknown) => (
        <span className="font-medium text-red-600">
          {formatCurrency(Number(v) || 0)}
        </span>
      ),
    },
    {
      key: "missingTags",
      header: "Missing Tags",
      render: (v: unknown) => (
        <div className="flex flex-wrap gap-1">
          {(v as string[]).map((tag) => (
            <Badge key={tag} variant="destructive" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
  ]

  // Tags inventory columns
  const tagsInventoryColumns = [
    {
      key: "key",
      header: "Tag Key",
      sortable: true,
      render: (v: unknown) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{String(v)}</span>
        </div>
      ),
    },
    {
      key: "providers",
      header: "Providers",
      render: (v: unknown) => {
        const providers = v as string[]
        return (
          <div className="flex flex-wrap gap-1">
            {providers.map((p) => (
              <Badge key={p} variant="secondary" className="text-xs">
                {p.toUpperCase()}
              </Badge>
            ))}
          </div>
        )
      },
    },
  ]

  const isLoading = coverageLoading || untaggedLoading || envLoading
  const hasError = coverageError || untaggedError || envError

  return (
    <div className="space-y-8">
      <DateBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tags Compliance</h1>
          <p className="text-muted-foreground mt-1">
            Monitor tagging coverage and identify untagged costs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Required tags: {requiredTags.join(", ")}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <ComparisonCardSkeleton />
            <ComparisonCardSkeleton />
            <ComparisonCardSkeleton />
            <ComparisonCardSkeleton />
          </>
        ) : hasError ? (
          <Card className="col-span-4">
            <QueryError message={hasError} onRetry={() => window.location.reload()} />
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Resources</CardDescription>
                <CardTitle className="text-3xl">{summary.totalResources.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(summary.totalCost)} total cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tagged Cost</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {formatCurrency(summary.fullyTaggedCost)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {summary.fullyTaggedPercent.toFixed(0)}% coverage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Untagged Cost</CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {formatCurrency(summary.untaggedCost)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {(100 - summary.fullyTaggedPercent).toFixed(0)}% needs tagging
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Tag Keys</CardDescription>
                <CardTitle className="text-3xl">{tags.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Unique tag keys in use
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Coverage and Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Tag Coverage by Required Tag */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Tag Coverage by Required Tag</CardTitle>
              <InfoPopover
                title="Tag Coverage"
                description="Shows the percentage of cost that is tagged for each required tag. Green indicates good coverage (80%+), yellow is moderate (60-80%), and red needs attention (below 60%)."
              />
            </div>
            <CardDescription>
              Percentage of cost with each required tag
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coverageLoading ? (
              <ChartSkeleton height={200} />
            ) : coverageError ? (
              <QueryError message={coverageError} onRetry={() => window.location.reload()} />
            ) : coverage.length > 0 ? (
              <div className="space-y-4">
                {coverage.map((c) => (
                  <TagCoverageBar
                    key={c.tagKey}
                    label={c.tagKey}
                    percent={c.coveragePercent}
                    taggedCost={c.taggedCost}
                    untaggedCost={c.untaggedCost}
                  />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        {/* Environment Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Cost by Environment</CardTitle>
              <InfoPopover
                title="Environment Distribution"
                description="Shows how costs are distributed across different environment tag values (e.g., production, staging, development)."
              />
            </div>
            <CardDescription>
              Cost distribution by Environment tag value
            </CardDescription>
          </CardHeader>
          <CardContent>
            {envLoading ? (
              <ChartSkeleton height={250} />
            ) : envError ? (
              <QueryError message={envError} onRetry={() => window.location.reload()} />
            ) : pieChartData.length > 0 ? (
              <PieChart
                data={pieChartData}
                height={250}
                outerRadius={80}
                tooltipFormatter={(value) => formatCurrency(Number(value))}
                showLegend
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Untagged Cost by Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Untagged Cost by Service</CardTitle>
            <InfoPopover
              title="Untagged by Service"
              description="Shows which services have the most untagged cost. Prioritize services with higher untagged costs for tagging efforts."
            />
          </div>
          <CardDescription>
            Services with untagged costs, sorted by cost impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          {untaggedLoading ? (
            <TableSkeleton rows={5} />
          ) : untaggedError ? (
            <QueryError message={untaggedError} onRetry={() => window.location.reload()} />
          ) : untaggedByService.length > 0 ? (
            <PaginatedDataTable
              data={untaggedByService}
              columns={serviceColumns}
              pageSize={10}
              hoverable
            />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* All Tags Inventory */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Tags Inventory</CardTitle>
            <InfoPopover
              title="Tags Inventory"
              description="All tags currently in use across your cloud resources from Vantage."
            />
          </div>
          <CardDescription>
            All tag keys in use across your cloud infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <TableSkeleton rows={5} />
          ) : coverageError ? (
            <QueryError message={coverageError} onRetry={() => window.location.reload()} />
          ) : tags.length > 0 ? (
            <PaginatedDataTable
              data={tags as unknown as Record<string, unknown>[]}
              columns={tagsInventoryColumns}
              pageSize={15}
              hoverable
            />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* Resources Inventory */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Resources Inventory</CardTitle>
            <InfoPopover
              title="Resources"
              description="Cloud resources tracked in Vantage, sorted by cost."
            />
          </div>
          <CardDescription>
            {resources.all.length.toLocaleString()} resources from Vantage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <TableSkeleton rows={10} />
          ) : coverageError ? (
            <QueryError message={coverageError} onRetry={() => window.location.reload()} />
          ) : resources.all.length > 0 ? (
            <PaginatedDataTable
              data={resources.all as unknown as Record<string, unknown>[]}
              columns={resourceColumns}
              pageSize={20}
              hoverable
            />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Data source: GreptimeDB (vantage schema)
      </p>
    </div>
  )
}
