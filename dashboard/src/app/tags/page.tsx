"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  BarChart,
  PieChart,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "laminar-ui"
import {
  ComparisonCard,
  InfoPopover,
  ComparisonCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  QueryError,
  EmptyState,
  DateBanner,
} from "@/components/shared"
import { formatCurrency } from "@/hooks/useQuery"
import {
  useTagCoverage,
  useUntaggedByService,
  useTagValueDistribution,
  useVantageTags,
  VantageResource,
} from "@/hooks/useVantage"
import { Tag, AlertTriangle, CheckCircle, XCircle, Package } from "lucide-react"

// Default required tags - these can be made configurable
const DEFAULT_REQUIRED_TAGS = ["Environment", "Team", "CostCenter", "Project"]

function TagCoverageBar({ label, percent }: { label: string; percent: number }) {
  const getColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500"
    if (pct >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{percent.toFixed(0)}%</span>
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

function ResourceStatusBadge({ resource, requiredTags }: { resource: VantageResource; requiredTags: string[] }) {
  const missingTags = requiredTags.filter(
    (tagKey) => !resource.tags?.some((t) => t.key === tagKey)
  )

  if (missingTags.length === 0) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        Complete
      </Badge>
    )
  }

  if (missingTags.length === requiredTags.length) {
    return (
      <Badge variant="outline" className="text-red-600 border-red-600">
        <XCircle className="h-3 w-3 mr-1" />
        Untagged
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Partial ({requiredTags.length - missingTags.length}/{requiredTags.length})
    </Badge>
  )
}

export default function TagsPage() {
  const [requiredTags] = useState(DEFAULT_REQUIRED_TAGS)
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all")

  // Fetch tag coverage data
  const {
    coverage,
    summary,
    resources,
    tags,
    loading: coverageLoading,
    error: coverageError,
  } = useTagCoverage(requiredTags, { refetchInterval: 300000 })

  // Fetch untagged resources by service
  const {
    data: untaggedByService,
    loading: untaggedLoading,
    error: untaggedError,
  } = useUntaggedByService(requiredTags, { refetchInterval: 300000 })

  // Fetch tag value distribution for Environment tag (example)
  const {
    data: envDistribution,
    loading: envLoading,
    error: envError,
  } = useTagValueDistribution("Environment", { refetchInterval: 300000 })

  // Filter resources based on selections
  const filteredResources = useMemo(() => {
    let result = resources.all

    // Filter by status
    if (selectedStatusFilter === "tagged") {
      result = resources.fullyTagged
    } else if (selectedStatusFilter === "partial") {
      result = resources.partiallyTagged
    } else if (selectedStatusFilter === "untagged") {
      result = resources.untagged
    }

    // Filter by specific tag
    if (selectedTagFilter !== "all") {
      result = result.filter((r) =>
        r.tags?.some((t) => t.key === selectedTagFilter)
      )
    }

    return result
  }, [resources, selectedStatusFilter, selectedTagFilter])

  // Prepare chart data for coverage
  const coverageChartData = coverage.map((c) => ({
    tag: c.tagKey,
    coverage: c.coveragePercent,
    tagged: c.taggedCount,
    untagged: c.untaggedCount,
  }))

  // Prepare pie chart data for environment distribution
  const pieChartData = envDistribution.slice(0, 6).map((item, index) => ({
    name: item.value,
    value: item.cost,
    count: item.count,
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
          <span className="font-medium">{String(v)}</span>
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
    {
      key: "status",
      header: "Tag Status",
      render: (_: unknown, r: Record<string, unknown>) => (
        <ResourceStatusBadge
          resource={r as unknown as VantageResource}
          requiredTags={requiredTags}
        />
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (_: unknown, r: Record<string, unknown>) => {
        const res = r as unknown as VantageResource
        if (!res.tags || res.tags.length === 0) {
          return <span className="text-muted-foreground">No tags</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {res.tags.slice(0, 3).map((t) => (
              <Badge key={t.key} variant="outline" className="text-xs">
                {t.key}: {t.value}
              </Badge>
            ))}
            {res.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{res.tags.length - 3} more
              </Badge>
            )}
          </div>
        )
      },
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
      key: "count",
      header: "Resources",
      sortable: true,
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
      key: "values",
      header: "Unique Values",
      render: (v: unknown) => {
        const values = v as string[]
        return (
          <div className="flex items-center gap-2">
            <span>{values.length}</span>
            {values.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({values.slice(0, 3).join(", ")}
                {values.length > 3 ? "..." : ""})
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (v: unknown) =>
        new Date(String(v)).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
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
            Monitor tagging coverage and identify untagged resources
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
                <CardDescription>Fully Tagged</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {summary.fullyTaggedCount.toLocaleString()}
                  <span className="text-lg ml-2">({summary.fullyTaggedPercent.toFixed(0)}%)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(summary.fullyTaggedCost)} tagged cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Partially Tagged</CardDescription>
                <CardTitle className="text-3xl text-yellow-600">
                  {summary.partiallyTaggedCount.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Missing some required tags
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
                  {summary.untaggedCount.toLocaleString()} resources without required tags
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Coverage and Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tag Coverage by Required Tag */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Tag Coverage by Required Tag</CardTitle>
              <InfoPopover
                title="Tag Coverage"
                description="Shows the percentage of resources that have each required tag. Green indicates good coverage (80%+), yellow is moderate (60-80%), and red needs attention (below 60%)."
              />
            </div>
            <CardDescription>
              Percentage of resources with each required tag
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

      {/* Untagged Resources by Service */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Untagged Resources by Service</CardTitle>
            <InfoPopover
              title="Untagged by Service"
              description="Shows which services have the most untagged resources and the associated costs. Prioritize services with higher untagged costs for tagging efforts."
            />
          </div>
          <CardDescription>
            Services with resources missing required tags, sorted by cost impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          {untaggedLoading ? (
            <TableSkeleton rows={5} />
          ) : untaggedError ? (
            <QueryError message={untaggedError} onRetry={() => window.location.reload()} />
          ) : untaggedByService.length > 0 ? (
            <DataTable
              data={untaggedByService}
              columns={serviceColumns}
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
              description="All tags currently in use across your cloud resources. Shows unique values for each tag key."
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
            <DataTable data={tags as unknown as Record<string, unknown>[]} columns={tagsInventoryColumns} hoverable />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* Resources Detail with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Resources Detail</CardTitle>
                <InfoPopover
                  title="Resources Detail"
                  description="Detailed list of all resources with their tag status. Use filters to find resources that need tagging."
                />
              </div>
              <CardDescription>
                {filteredResources.length.toLocaleString()} resources
                {selectedStatusFilter !== "all" && ` (${selectedStatusFilter})`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={selectedStatusFilter}
                onValueChange={setSelectedStatusFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="tagged">Fully Tagged</SelectItem>
                  <SelectItem value="partial">Partially Tagged</SelectItem>
                  <SelectItem value="untagged">Untagged</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedTagFilter}
                onValueChange={setSelectedTagFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {requiredTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      Has: {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coverageLoading ? (
            <TableSkeleton rows={10} />
          ) : coverageError ? (
            <QueryError message={coverageError} onRetry={() => window.location.reload()} />
          ) : filteredResources.length > 0 ? (
            <DataTable
              data={filteredResources as unknown as Record<string, unknown>[]}
              columns={resourceColumns}
              hoverable
            />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Data refreshed: {new Date().toLocaleString()}
      </p>
    </div>
  )
}
