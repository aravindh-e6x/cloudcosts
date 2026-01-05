"use client"

import { useMemo } from "react"
import { Treemap, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "e6ds"
import { Cpu, Info } from "lucide-react"
import { useTimeline } from "../TimelineContext"

// Custom content renderer for treemap cells
const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, utilization, depth, isEmpty } = props

  if (width < 2 || height < 2) return null

  // Depth 1 = node, Depth 2 = pod
  const isNode = depth === 1
  const isPod = depth === 2

  // Theme colors
  const colors = {
    green: "#49f59f",      // e6-green - used
    white: "#ffffff",      // white - unused/background
    dark: "#33322e",       // e6-dark - borders and text
  }

  // Gap between nodes
  const gap = 4

  // Empty/unused space (unallocated on node)
  if (isEmpty && isPod) {
    return null  // Don't render - let node background show through
  }

  // Node level
  if (isNode) {
    return (
      <g>
        <rect
          x={x + gap / 2}
          y={y + gap / 2}
          width={width - gap}
          height={height - gap}
          fill={colors.white}
          stroke={colors.dark}
          strokeWidth={1}
        />
        {width > 50 && height > 18 && (
          <text
            x={x + gap / 2 + 4}
            y={y + gap / 2 + 12}
            fill={colors.dark}
            fontSize={10}
            fontWeight={600}
          >
            {name}
          </text>
        )}
      </g>
    )
  }

  // Pod level - simple green fill based on utilization
  if (isPod && utilization !== undefined) {
    const showLabel = width > 35 && height > 20
    const usedHeight = height * Math.min(utilization, 1)

    return (
      <g>
        {/* Green fill (used portion) - fills from bottom */}
        <rect
          x={x}
          y={y + height - usedHeight}
          width={width}
          height={usedHeight}
          fill={colors.green}
        />
        {/* Border */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={colors.dark}
          strokeWidth={0.5}
        />
        {showLabel && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colors.dark}
            fontSize={9}
            fontWeight={500}
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
  const { currentSnapshot } = useTimeline()

  // Transform to treemap format: nodes -> pods with unallocated space
  const treemapData = useMemo(() => {
    if (!currentSnapshot) return []
    return currentSnapshot.nodes.map((node) => {
      const allocatedCpu = node.pods.reduce((sum, p) => sum + p.cpuRequested, 0)
      const unallocatedCpu = Math.max(0, node.cpuCapacity - allocatedCpu)

      const podChildren = node.pods.map((pod) => ({
        name: pod.component,
        size: pod.cpuRequested,
        cpuRequested: pod.cpuRequested,
        utilization: pod.cpuRequested > 0 ? pod.cpuUsed / pod.cpuRequested : 0,
        isEmpty: false,
      }))

      // Add unallocated space as empty pod
      if (unallocatedCpu > 0.5) {
        podChildren.push({
          name: "unallocated",
          size: unallocatedCpu,
          cpuRequested: unallocatedCpu,
          utilization: 0,
          isEmpty: true,
        })
      }

      return {
        name: node.name.replace("ip-10-", "").substring(0, 6),
        size: node.cpuCapacity,
        children: podChildren,
      }
    })
  }, [currentSnapshot])

  // Calculate totals
  const totals = useMemo(() => {
    if (!currentSnapshot) return { nodes: 0, pods: 0, totalCpu: 0, requestedCpu: 0, usedCpu: 0, allocatedPct: 0, utilizationPct: 0 }

    let totalCpu = 0
    let usedCpu = 0
    let requestedCpu = 0
    let podCount = 0

    currentSnapshot.nodes.forEach((node) => {
      totalCpu += node.cpuCapacity
      node.pods.forEach((pod) => {
        podCount++
        requestedCpu += pod.cpuRequested
        usedCpu += pod.cpuUsed
      })
    })

    return {
      nodes: currentSnapshot.nodes.length,
      pods: podCount,
      totalCpu,
      requestedCpu,
      usedCpu,
      allocatedPct: totalCpu > 0 ? (requestedCpu / totalCpu) * 100 : 0,
      utilizationPct: requestedCpu > 0 ? (usedCpu / requestedCpu) * 100 : 0,
    }
  }, [currentSnapshot])

  if (!currentSnapshot || treemapData.length === 0) {
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
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border border-foreground bg-white" />
              <span className="text-muted-foreground">Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-primary" />
              <span className="text-muted-foreground">Used</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-white border border-foreground/30" />
              <span className="text-muted-foreground">Unused</span>
            </div>
          </div>

          {/* Treemap */}
          <div className="h-[400px] w-full">
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
