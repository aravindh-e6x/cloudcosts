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

import { useTimeline } from "../TimelineContext"
import { PodSnapshot } from "../shared/types"

interface NamespaceData {
  name: string
  pods: PodSnapshot[]
  podCount: number
  cpuRequested: number
  cpuUsed: number
  memRequestedGb: number
  memUsedGb: number
  cpuUtilPct: number
  memUtilPct: number
}

// Histogram view for namespaces
function HistogramView({ namespaces }: { namespaces: NamespaceData[] }) {
  const histogramData = useMemo(() => {
    const ranges = [
      { label: "90-100%", min: 90, max: 101, color: "bg-green-600" },
      { label: "80-90%", min: 80, max: 90, color: "bg-green-500" },
      { label: "70-80%", min: 70, max: 80, color: "bg-yellow-400" },
      { label: "60-70%", min: 60, max: 70, color: "bg-yellow-500" },
      { label: "50-60%", min: 50, max: 60, color: "bg-orange-400" },
      { label: "40-50%", min: 40, max: 50, color: "bg-orange-500" },
      { label: "<40%", min: 0, max: 40, color: "bg-red-500" },
    ]

    return ranges.map((range) => {
      const cpuCount = namespaces.filter((ns) => {
        return ns.cpuUtilPct >= range.min && ns.cpuUtilPct < range.max
      }).length
      const memCount = namespaces.filter((ns) => {
        return ns.memUtilPct >= range.min && ns.memUtilPct < range.max
      }).length
      return { ...range, cpuCount, memCount }
    })
  }, [namespaces])

  const maxCount = Math.max(...histogramData.flatMap((d) => [d.cpuCount, d.memCount]), 1)

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="text-sm font-medium mb-3">CPU Utilization</div>
        <div className="space-y-1">
          {histogramData.map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-muted-foreground">{row.label}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full ${row.color} transition-all`}
                  style={{ width: `${(row.cpuCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right">{row.cpuCount}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-3">Memory Utilization</div>
        <div className="space-y-1">
          {histogramData.map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <span className="w-16 text-muted-foreground">{row.label}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full ${row.color} transition-all`}
                  style={{ width: `${(row.memCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right">{row.memCount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Cards view showing each namespace
function NamespaceCards({ namespaces }: { namespaces: NamespaceData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {namespaces.map((ns) => {
        const cpuColor = ns.cpuUtilPct > 80 ? "bg-green-500" : ns.cpuUtilPct > 60 ? "bg-yellow-500" : ns.cpuUtilPct > 40 ? "bg-orange-500" : "bg-red-500"
        const memColor = ns.memUtilPct > 80 ? "bg-green-500" : ns.memUtilPct > 60 ? "bg-yellow-500" : ns.memUtilPct > 40 ? "bg-orange-500" : "bg-red-500"

        return (
          <div key={ns.name} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{ns.name}</span>
              <span className="text-xs text-muted-foreground">{ns.podCount} pods</span>
            </div>

            {/* CPU */}
            <div className="flex items-center gap-2 text-xs mb-1.5">
              <span className="w-10 text-muted-foreground">CPU</span>
              <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                <div className={`h-full ${cpuColor}`} style={{ width: `${Math.min(100, ns.cpuUtilPct)}%` }} />
              </div>
              <span className="w-20 text-right font-mono">
                {ns.cpuUsed.toFixed(0)}/{ns.cpuRequested.toFixed(0)} <span className="text-muted-foreground">({ns.cpuUtilPct.toFixed(0)}%)</span>
              </span>
            </div>

            {/* Memory */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-10 text-muted-foreground">MEM</span>
              <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                <div className={`h-full ${memColor}`} style={{ width: `${Math.min(100, ns.memUtilPct)}%` }} />
              </div>
              <span className="w-20 text-right font-mono">
                {ns.memUsedGb.toFixed(0)}/{ns.memRequestedGb.toFixed(0)}G <span className="text-muted-foreground">({ns.memUtilPct.toFixed(0)}%)</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export interface NamespacePackingSectionProps {
  eksCluster: string
  e6Clusters: string[]
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

export function NamespacePackingSection({
  eksCluster,
  e6Clusters,
  dateRange,
  selectedDate,
}: NamespacePackingSectionProps) {
  const { currentSnapshot } = useTimeline()
  const [activeTab, setActiveTab] = useState("overview")

  // Group pods by namespace and calculate stats
  const namespaces = useMemo((): NamespaceData[] => {
    if (!currentSnapshot) return []

    const namespaceMap = new Map<string, PodSnapshot[]>()

    for (const node of currentSnapshot.nodes) {
      for (const pod of node.pods) {
        const ns = pod.namespace
        if (!namespaceMap.has(ns)) {
          namespaceMap.set(ns, [])
        }
        namespaceMap.get(ns)!.push(pod)
      }
    }

    return Array.from(namespaceMap.entries()).map(([name, pods]) => {
      const cpuRequested = pods.reduce((sum, p) => sum + p.cpuRequested, 0)
      const cpuUsed = pods.reduce((sum, p) => sum + p.cpuUsed, 0)
      const memRequestedGb = pods.reduce((sum, p) => sum + p.memRequestedGb, 0)
      const memUsedGb = pods.reduce((sum, p) => sum + p.memUsedGb, 0)

      return {
        name,
        pods,
        podCount: pods.length,
        cpuRequested,
        cpuUsed,
        memRequestedGb,
        memUsedGb,
        cpuUtilPct: cpuRequested > 0 ? (cpuUsed / cpuRequested) * 100 : 0,
        memUtilPct: memRequestedGb > 0 ? (memUsedGb / memRequestedGb) * 100 : 0,
      }
    }).sort((a, b) => b.podCount - a.podCount)
  }, [currentSnapshot])

  // Calculate totals
  const totals = useMemo(() => {
    if (namespaces.length === 0) {
      return { namespaceCount: 0, podCount: 0, cpuUsed: 0, cpuRequested: 0, memUsed: 0, memRequested: 0, avgCpu: 0, avgMem: 0 }
    }

    const cpuUsed = namespaces.reduce((sum, ns) => sum + ns.cpuUsed, 0)
    const cpuRequested = namespaces.reduce((sum, ns) => sum + ns.cpuRequested, 0)
    const memUsed = namespaces.reduce((sum, ns) => sum + ns.memUsedGb, 0)
    const memRequested = namespaces.reduce((sum, ns) => sum + ns.memRequestedGb, 0)

    return {
      namespaceCount: namespaces.length,
      podCount: namespaces.reduce((sum, ns) => sum + ns.podCount, 0),
      cpuUsed,
      cpuRequested,
      memUsed,
      memRequested,
      avgCpu: cpuRequested > 0 ? (cpuUsed / cpuRequested) * 100 : 0,
      avgMem: memRequested > 0 ? (memUsed / memRequested) * 100 : 0,
    }
  }, [namespaces])

  if (!currentSnapshot || namespaces.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5" />
            Namespace Packing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No namespaces available
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
              Namespace Packing
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">CPU and memory utilization by namespace</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span>
                <span className="font-bold">{totals.namespaceCount}</span>
                <span className="text-muted-foreground ml-1">namespaces</span>
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
                  ({totals.cpuUsed.toFixed(0)}/{totals.cpuRequested.toFixed(0)} cores)
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">MEM:</span>
                <span className="font-bold ml-1">{totals.avgMem.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({totals.memUsed.toFixed(0)}/{totals.memRequested.toFixed(0)} GB)
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
              <TabsTrigger value="namespaces" className="flex items-center gap-1">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Namespaces</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-6">
              <HistogramView namespaces={namespaces} />
            </TabsContent>

            <TabsContent value="namespaces" className="mt-4">
              <NamespaceCards namespaces={namespaces} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

// Keep backward compatible export
export { NamespacePackingSection as E6ClusterPackingSection }
export type { NamespacePackingSectionProps as E6ClusterPackingSectionProps }
