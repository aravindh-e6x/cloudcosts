"use client"

import { useMemo } from "react"
import { Treemap, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "e6ds"
import { Cpu, Info } from "lucide-react"
import { generateMockNodeData } from "./mockData"
import { useTimeline } from "../TimelineContext"

// Custom content renderer for treemap cells
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, utilization, depth, isEmpty } = props

  if (width < 2 || height < 2) return null

  // Depth 1 = node, Depth 2 = pod
  const isNode = depth === 1
  const isPod = depth === 2

  // Empty/unused space - render as white/very light
  if (isEmpty && isPod) {
    return (
      <g>
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={height - 4}
          fill="#ffffff"
          stroke="none"
          rx={2}
        />
      </g>
    )
  }

  // Node level - thick dark border
  if (isNode) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#e2e8f0"
          stroke="#0f172a"
          strokeWidth={4}
          rx={4}
        />
        {width > 60 && height > 20 && (
          <text
            x={x + 8}
            y={y + 16}
            fill="#0f172a"
            stroke="none"
            fontSize={12}
            fontWeight={700}
          >
            {name}
          </text>
        )}
      </g>
    )
  }

  // Pod level - green for used, gray for unused within pod
  if (isPod && utilization !== undefined) {
    const showLabel = width > 40 && height > 25
    const innerWidth = width - 4
    const innerHeight = height - 4
    const usedHeight = innerHeight * Math.min(utilization, 1)
    const unusedHeight = innerHeight - usedHeight

    return (
      <g>
        {/* Gray background (unused portion) */}
        <rect
          x={x + 2}
          y={y + 2}
          width={innerWidth}
          height={innerHeight}
          fill="#d1d5db"
          stroke="#374151"
          strokeWidth={1}
          rx={2}
        />
        {/* Green fill (used portion) - fills from bottom */}
        <rect
          x={x + 2}
          y={y + 2 + unusedHeight}
          width={innerWidth}
          height={usedHeight}
          fill="#22c55e"
          stroke="none"
          rx={usedHeight === innerHeight ? 2 : 0}
        />
        {/* Border on top */}
        <rect
          x={x + 2}
          y={y + 2}
          width={innerWidth}
          height={innerHeight}
          fill="none"
          stroke="#374151"
          strokeWidth={1}
          rx={2}
        />
        {showLabel && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#0f172a"
            stroke="none"
            fontSize={11}
            fontWeight={600}
          >
            {name}
          </text>
        )}
      </g>
    )
  }

  return null
}

export function ClusterTreemap() {
  const { currentTimestamp } = useTimeline()

  const nodes = useMemo(() => {
    if (!currentTimestamp) return []
    return generateMockNodeData(currentTimestamp)
  }, [currentTimestamp])

  // Transform to treemap format: nodes -> pods
  const treemapData = useMemo(() => {
    return nodes.map((node) => ({
      name: node.name.replace("ip-10-", "").substring(0, 6),
      size: node.cpuCapacity,
      children: node.pods.map((pod) => ({
        name: pod.component,
        size: pod.cpuRequested,
        cpuRequested: pod.cpuRequested,
        utilization: pod.isEmpty ? 0 : pod.cpuUsed / pod.cpuRequested,
        isEmpty: pod.isEmpty || false,
      })),
    }))
  }, [nodes])

  // Calculate totals
  const totals = useMemo(() => {
    let totalCpu = 0
    let usedCpu = 0
    let requestedCpu = 0
    let podCount = 0

    nodes.forEach((node) => {
      totalCpu += node.cpuCapacity
      node.pods.forEach((pod) => {
        if (!pod.isEmpty) {
          podCount++
          requestedCpu += pod.cpuRequested
          usedCpu += pod.cpuUsed
        }
      })
    })

    return {
      nodes: nodes.length,
      pods: podCount,
      totalCpu,
      requestedCpu,
      usedCpu,
      allocatedPct: totalCpu > 0 ? (requestedCpu / totalCpu) * 100 : 0,
      utilizationPct: requestedCpu > 0 ? (usedCpu / requestedCpu) * 100 : 0,
    }
  }, [nodes])

  if (!currentTimestamp || nodes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-5 w-5" />
            CPU Treemap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No data available
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
              <Cpu className="h-5 w-5" />
              CPU Treemap
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">Node → Pod hierarchy by CPU</p>
                  <p className="text-xs text-muted-foreground mt-1">Box size = CPU cores, Color = utilization</p>
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
                <span className="font-bold">{totals.nodes}</span>
                <span className="text-muted-foreground ml-1">nodes</span>
              </span>
              <span>
                <span className="font-bold">{totals.pods}</span>
                <span className="text-muted-foreground ml-1">pods</span>
              </span>
              <span>
                <span className="font-bold">{totals.totalCpu}</span>
                <span className="text-muted-foreground ml-1">total cores</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                <span className="text-muted-foreground">Allocated:</span>
                <span className="font-bold ml-1">{totals.allocatedPct.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground ml-1">({totals.requestedCpu.toFixed(0)}/{totals.totalCpu})</span>
              </span>
              <span>
                <span className="text-muted-foreground">Utilized:</span>
                <span className="font-bold ml-1">{totals.utilizationPct.toFixed(0)}%</span>
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-[3px] border-slate-900 bg-slate-200" />
              <span className="text-muted-foreground">Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500 border border-gray-700" />
              <span className="text-muted-foreground">CPU Used</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-300 border border-gray-700" />
              <span className="text-muted-foreground">CPU Requested (unused)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white border border-slate-200" />
              <span className="text-muted-foreground">Unallocated</span>
            </div>
          </div>

          {/* Treemap */}
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="none"
                content={<CustomTreemapContent />}
                isAnimationActive={false}
              />
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

export * from "./types"
