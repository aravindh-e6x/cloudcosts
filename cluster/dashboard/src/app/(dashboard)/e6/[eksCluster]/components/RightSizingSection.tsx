"use client"

import { useMemo } from "react"
import { Target, Cpu, MemoryStick } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "e6ds"
import { useQuery } from "@/hooks/useQuery"

interface RightSizingData {
  component: string
  cpu_requested: number
  cpu_actual: number
  cpu_util_pct: number
  memory_requested: number
  memory_actual: number
  memory_util_pct: number
}

interface RightSizingSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
}

export function RightSizingSection({ eksCluster, dateRange }: RightSizingSectionProps) {
  // Fetch right-sizing data
  const { data: rightSizingData, loading } = useQuery<RightSizingData>(
    "e6",
    "getRightSizing",
    [eksCluster, dateRange],
    { database: "kubernetes" }
  )

  // Calculate totals
  const totals = useMemo(() => {
    if (!rightSizingData?.length) return null
    const totalCpuRequested = rightSizingData.reduce((sum, d) => sum + d.cpu_requested, 0)
    const totalCpuActual = rightSizingData.reduce((sum, d) => sum + d.cpu_actual, 0)
    const totalMemRequested = rightSizingData.reduce((sum, d) => sum + d.memory_requested, 0)
    const totalMemActual = rightSizingData.reduce((sum, d) => sum + d.memory_actual, 0)
    return {
      cpuRequested: Math.round(totalCpuRequested),
      cpuActual: Math.round(totalCpuActual),
      cpuUtilPct: totalCpuRequested > 0 ? Math.round(totalCpuActual / totalCpuRequested * 100) : 0,
      memRequested: Math.round(totalMemRequested / 1024 / 1024 / 1024), // GB
      memActual: Math.round(totalMemActual / 1024 / 1024 / 1024), // GB
      memUtilPct: totalMemRequested > 0 ? Math.round(totalMemActual / totalMemRequested * 100) : 0,
    }
  }, [rightSizingData])

  // Color based on utilization percentage
  const getUtilColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500"
    if (pct >= 60) return "bg-yellow-500"
    if (pct >= 40) return "bg-orange-500"
    return "bg-red-500"
  }

  const getUtilTextColor = (pct: number) => {
    if (pct >= 80) return "text-green-600"
    if (pct >= 60) return "text-yellow-600"
    if (pct >= 40) return "text-orange-600"
    return "text-red-600"
  }

  // Progress bar component
  const ProgressBar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="w-full bg-muted rounded h-2">
      <div
        className={`h-2 rounded ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Right-Sizing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5" />
          Right-Sizing
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Summary */}
        {totals && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* CPU Summary */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested</span>
                  <span>{totals.cpuRequested} cores</span>
                </div>
                <ProgressBar pct={100} color="bg-muted-foreground/30" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual</span>
                  <span>{totals.cpuActual} cores</span>
                </div>
                <ProgressBar pct={totals.cpuUtilPct} color={getUtilColor(totals.cpuUtilPct)} />
                <div className="text-right">
                  <span className={`font-bold ${getUtilTextColor(totals.cpuUtilPct)}`}>
                    {totals.cpuUtilPct}% utilized
                  </span>
                </div>
              </div>
            </div>

            {/* Memory Summary */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested</span>
                  <span>{totals.memRequested} GB</span>
                </div>
                <ProgressBar pct={100} color="bg-muted-foreground/30" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual</span>
                  <span>{totals.memActual} GB</span>
                </div>
                <ProgressBar pct={totals.memUtilPct} color={getUtilColor(totals.memUtilPct)} />
                <div className="text-right">
                  <span className={`font-bold ${getUtilTextColor(totals.memUtilPct)}`}>
                    {totals.memUtilPct}% utilized
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* By Component */}
        <div className="text-xs text-muted-foreground mb-2">BY COMPONENT</div>
        <div className="space-y-2">
          {rightSizingData?.map((row) => (
            <div key={row.component} className="grid grid-cols-3 gap-4 items-center text-sm">
              <span className="font-medium capitalize">{row.component}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded h-2">
                  <div
                    className={`h-2 rounded ${getUtilColor(row.cpu_util_pct)}`}
                    style={{ width: `${Math.min(row.cpu_util_pct, 100)}%` }}
                  />
                </div>
                <span className={`text-xs ${getUtilTextColor(row.cpu_util_pct)}`}>
                  {Math.round(row.cpu_util_pct)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-muted rounded h-2">
                  <div
                    className={`h-2 rounded ${getUtilColor(row.memory_util_pct)}`}
                    style={{ width: `${Math.min(row.memory_util_pct, 100)}%` }}
                  />
                </div>
                <span className={`text-xs ${getUtilTextColor(row.memory_util_pct)}`}>
                  {Math.round(row.memory_util_pct)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {(!rightSizingData || rightSizingData.length === 0) && (
          <div className="text-center text-muted-foreground py-4">
            No right-sizing data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
