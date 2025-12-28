"use client"

import { useMemo, useState } from "react"
import { Activity, Info, BarChart3, LayoutGrid, DollarSign, AlertTriangle, TrendingDown } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
} from "e6ds"

import { useTimeline } from "../TimelineContext"
import { generateEngineSnapshot } from "./mockData"
import { OverviewView } from "./OverviewView"
import { PipelineView } from "./PipelineView"
import { CostView } from "./CostView"
import { IssuesView } from "./IssuesView"
import { EngineSnapshot } from "./types"

interface EngineHealthProps {
  e6Clusters: string[]
}

export function EngineHealth({ e6Clusters }: EngineHealthProps) {
  const { currentTimestamp } = useTimeline()
  const [activeTab, setActiveTab] = useState("overview")

  // Generate snapshot for each cluster
  const clusterSnapshots = useMemo(() => {
    if (!currentTimestamp || e6Clusters.length === 0) return new Map<string, EngineSnapshot>()

    const snapshots = new Map<string, EngineSnapshot>()
    e6Clusters.forEach((cluster, idx) => {
      const snapshot = generateEngineSnapshot(currentTimestamp, idx)
      snapshots.set(cluster, snapshot)
    })
    return snapshots
  }, [currentTimestamp, e6Clusters])

  // Calculate aggregate totals across all clusters
  const totals = useMemo(() => {
    if (clusterSnapshots.size === 0) {
      return {
        clusterCount: 0,
        totalCostPerHour: 0,
        potentialSavingsPerHour: 0,
        totalIssues: 0,
        criticalIssues: 0,
        queriesRunning: 0,
        queriesQueued: 0,
      }
    }

    let totalCost = 0
    let potentialSavings = 0
    let totalIssues = 0
    let criticalIssues = 0
    let queriesRunning = 0
    let queriesQueued = 0

    clusterSnapshots.forEach((snapshot) => {
      totalCost += snapshot.totalCostPerHour
      potentialSavings += snapshot.potentialSavingsPerHour
      totalIssues += snapshot.queryBottlenecks.length + snapshot.idleResourceAlerts.length
      criticalIssues += snapshot.queryBottlenecks.filter(b => b.severity === "critical" || b.severity === "high").length
      queriesRunning += snapshot.gateway.queriesRunning
      queriesQueued += snapshot.gateway.queriesQueued
    })

    return {
      clusterCount: clusterSnapshots.size,
      totalCostPerHour: totalCost,
      potentialSavingsPerHour: potentialSavings,
      totalIssues,
      criticalIssues,
      queriesRunning,
      queriesQueued,
    }
  }, [clusterSnapshots])

  if (e6Clusters.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Engine Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No E6 clusters available
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentTimestamp) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Engine Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No data available for the selected time range
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" />
              Engine Health
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">Query engine metrics, cost analysis, and optimization recommendations</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>
                <span className="font-bold">{totals.clusterCount}</span>
                <span className="text-muted-foreground ml-1">clusters</span>
              </span>
              <span>
                <span className="font-bold">{totals.queriesRunning}</span>
                <span className="text-muted-foreground ml-1">queries</span>
                {totals.queriesQueued > 0 && (
                  <span className="text-orange-500 ml-1">(+{totals.queriesQueued})</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-bold">${totals.totalCostPerHour.toFixed(2)}</span>
                <span className="text-muted-foreground">/hr</span>
              </span>
              {totals.potentialSavingsPerHour > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="font-bold">-${totals.potentialSavingsPerHour.toFixed(2)}</span>
                  <span className="text-xs">potential</span>
                </span>
              )}
              {totals.criticalIssues > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {totals.criticalIssues} critical
                </Badge>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="flex items-center gap-1">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Pipeline</span>
              </TabsTrigger>
              <TabsTrigger value="costs" className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Costs</span>
              </TabsTrigger>
              <TabsTrigger value="issues" className="flex items-center gap-1 relative">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Issues</span>
                {totals.totalIssues > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {totals.totalIssues}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverviewView clusterSnapshots={clusterSnapshots} />
            </TabsContent>

            <TabsContent value="pipeline" className="mt-4">
              <PipelineView clusterSnapshots={clusterSnapshots} />
            </TabsContent>

            <TabsContent value="costs" className="mt-4">
              <CostView clusterSnapshots={clusterSnapshots} />
            </TabsContent>

            <TabsContent value="issues" className="mt-4">
              <IssuesView clusterSnapshots={clusterSnapshots} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
