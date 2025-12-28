"use client"

import { useMemo, useState } from "react"
import { Server, Info, Grid3X3, BarChart3, Table, LayoutGrid } from "lucide-react"
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

import { NodePackingSectionProps } from "./types"
import { generateMockSnapshots } from "./mockData"
import { TimelineScrubber } from "./TimelineScrubber"
import { DistributionView } from "./DistributionView"
import { HeatmapView } from "./HeatmapView"
import { HistogramView } from "./HistogramView"
import { CardsView } from "./CardsView"

export function NodePackingSection({ eksCluster, dateRange, selectedDate }: NodePackingSectionProps) {
  const snapshots = useMemo(() => generateMockSnapshots(dateRange.startTs, dateRange.endTs), [dateRange])

  const [selectedIndex, setSelectedIndex] = useState(Math.floor(snapshots.length / 2))
  const [activeTab, setActiveTab] = useState("distribution")

  const currentSnapshot = snapshots[selectedIndex] || snapshots[0]

  const totals = useMemo(() => {
    if (!currentSnapshot?.nodes.length) {
      return { nodeCount: 0, podCount: 0, avgCpu: 0, avgMem: 0, totalCpuAlloc: 0, totalCpuCap: 0, totalMemAlloc: 0, totalMemCap: 0 }
    }
    const totalCpuAlloc = currentSnapshot.nodes.reduce((sum, n) => sum + n.cpuAllocated, 0)
    const totalCpuCap = currentSnapshot.nodes.reduce((sum, n) => sum + n.cpuCapacity, 0)
    const totalMemAlloc = currentSnapshot.nodes.reduce((sum, n) => sum + n.memAllocatedGb, 0)
    const totalMemCap = currentSnapshot.nodes.reduce((sum, n) => sum + n.memCapacityGb, 0)
    return {
      nodeCount: currentSnapshot.nodes.length,
      podCount: currentSnapshot.nodes.reduce((sum, n) => sum + n.podCount, 0),
      avgCpu: totalCpuCap > 0 ? (totalCpuAlloc / totalCpuCap) * 100 : 0,
      avgMem: totalMemCap > 0 ? (totalMemAlloc / totalMemCap) * 100 : 0,
      totalCpuAlloc,
      totalCpuCap,
      totalMemAlloc,
      totalMemCap,
    }
  }, [currentSnapshot])

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-5 w-5" />
            Node Packing
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
              <Server className="h-5 w-5" />
              Node Packing
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">CPU and memory allocation vs capacity per node over time</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the timeline to see how packing changed</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <div className="text-sm text-muted-foreground">{selectedDate}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeline Scrubber */}
          <TimelineScrubber
            snapshots={snapshots}
            selectedIndex={selectedIndex}
            onIndexChange={setSelectedIndex}
          />

          {/* Summary Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span>
                <span className="font-bold">{totals.nodeCount}</span>
                <span className="text-muted-foreground ml-1">nodes</span>
              </span>
              <span>
                <span className="font-bold">{totals.podCount}</span>
                <span className="text-muted-foreground ml-1">pods</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                <span className="text-muted-foreground">CPU:</span>
                <span className="font-bold ml-1">{totals.avgCpu.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({totals.totalCpuAlloc.toFixed(0)}/{totals.totalCpuCap} cores)
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">MEM:</span>
                <span className="font-bold ml-1">{totals.avgMem.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({totals.totalMemAlloc.toFixed(0)}/{totals.totalMemCap} GB)
                </span>
              </span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="distribution" className="flex items-center gap-1">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Distribution</span>
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="flex items-center gap-1">
                <Grid3X3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Heatmap</span>
              </TabsTrigger>
              <TabsTrigger value="histogram" className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Histogram</span>
              </TabsTrigger>
              <TabsTrigger value="cards" className="flex items-center gap-1">
                <Table className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="distribution" className="mt-4">
              <DistributionView nodes={currentSnapshot.nodes} />
            </TabsContent>

            <TabsContent value="heatmap" className="mt-4">
              <HeatmapView nodes={currentSnapshot.nodes} />
            </TabsContent>

            <TabsContent value="histogram" className="mt-4">
              <HistogramView nodes={currentSnapshot.nodes} />
            </TabsContent>

            <TabsContent value="cards" className="mt-4">
              <CardsView nodes={currentSnapshot.nodes} />
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Drag the timeline to see node packing at different times
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

// Re-export types for external use
export * from "./types"
