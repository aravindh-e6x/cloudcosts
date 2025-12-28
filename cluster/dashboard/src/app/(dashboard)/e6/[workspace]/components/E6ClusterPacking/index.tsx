"use client"

import { useMemo, useState } from "react"
import { Layers, Info, BarChart3, LayoutGrid } from "lucide-react"
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
} from "e6ds"

import { E6ClusterPackingSectionProps } from "./types"
import { generateClusterSnapshot } from "./mockData"
import { OverviewView } from "./OverviewView"
import { ComponentCards } from "./ComponentCards"
import { useTimeline } from "../TimelineContext"

export function E6ClusterPackingSection({
  eksCluster,
  e6Clusters,
  dateRange,
  selectedDate,
}: E6ClusterPackingSectionProps) {
  const { currentTimestamp } = useTimeline()
  const [activeTab, setActiveTab] = useState("overview")

  // Generate snapshot for current timestamp
  const currentSnapshot = useMemo(() => {
    if (!currentTimestamp) return null
    return generateClusterSnapshot(currentTimestamp, e6Clusters)
  }, [currentTimestamp, e6Clusters])

  // Calculate totals
  const totals = useMemo(() => {
    if (!currentSnapshot) {
      return {
        componentCount: 0,
        clusterCount: 0,
        cpuAllocated: 0,
        cpuRequested: 0,
        memAllocated: 0,
        memRequested: 0,
        avgCpuPct: 0,
        avgMemPct: 0,
      }
    }

    let cpuAllocated = 0
    let cpuRequested = 0
    let memAllocated = 0
    let memRequested = 0
    let componentCount = currentSnapshot.workspaceComponents.length

    currentSnapshot.workspaceComponents.forEach((c) => {
      cpuAllocated += c.cpuAllocated
      cpuRequested += c.cpuRequested
      memAllocated += c.memAllocatedGb
      memRequested += c.memRequestedGb
    })

    Object.values(currentSnapshot.clusters).forEach((components) => {
      componentCount += components.length
      components.forEach((c) => {
        cpuAllocated += c.cpuAllocated
        cpuRequested += c.cpuRequested
        memAllocated += c.memAllocatedGb
        memRequested += c.memRequestedGb
      })
    })

    return {
      componentCount,
      clusterCount: Object.keys(currentSnapshot.clusters).length,
      cpuAllocated,
      cpuRequested,
      memAllocated,
      memRequested,
      avgCpuPct: cpuRequested > 0 ? (cpuAllocated / cpuRequested) * 100 : 0,
      avgMemPct: memRequested > 0 ? (memAllocated / memRequested) * 100 : 0,
    }
  }, [currentSnapshot])

  if (!currentSnapshot || e6Clusters.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5" />
            E6 Cluster Packing
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

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5" />
              E6 Cluster Packing
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">CPU and memory utilization for E6 components</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Workspace components are shared, cluster components are per E6 cluster
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <div className="text-sm text-muted-foreground">{selectedDate}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span>
                <span className="font-bold">{totals.clusterCount}</span>
                <span className="text-muted-foreground ml-1">clusters</span>
              </span>
              <span>
                <span className="font-bold">{totals.componentCount}</span>
                <span className="text-muted-foreground ml-1">components</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                <span className="text-muted-foreground">CPU:</span>
                <span className="font-bold ml-1">{totals.avgCpuPct.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({totals.cpuAllocated.toFixed(0)}/{totals.cpuRequested.toFixed(0)} cores)
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">MEM:</span>
                <span className="font-bold ml-1">{totals.avgMemPct.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({totals.memAllocated.toFixed(0)}/{totals.memRequested.toFixed(0)} GB)
                </span>
              </span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="components" className="flex items-center gap-1">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Components</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverviewView snapshot={currentSnapshot} />
            </TabsContent>

            <TabsContent value="components" className="mt-4">
              <ComponentCards snapshot={currentSnapshot} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

// Re-export types
export * from "./types"
