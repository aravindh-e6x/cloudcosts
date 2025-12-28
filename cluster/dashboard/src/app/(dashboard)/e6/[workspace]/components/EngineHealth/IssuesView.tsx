"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  Clock,
  Database,
  HardDrive,
  Zap,
  Timer,
  Cpu,
} from "lucide-react"
import { Badge } from "e6ds"
import { EngineSnapshot, QueryBottleneck, IdleResourceAlert } from "./types"

interface IssuesViewProps {
  clusterSnapshots: Map<string, EngineSnapshot>
}

const bottleneckIcons: Record<string, React.ElementType> = {
  queue_wait: Clock,
  memory_pressure: Database,
  cache_miss: HardDrive,
  spill: HardDrive,
  timeout: Timer,
}

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  high: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  low: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
}

export function IssuesView({ clusterSnapshots }: IssuesViewProps) {
  // Aggregate all issues
  const issues = useMemo(() => {
    const bottlenecks: { cluster: string; bottleneck: QueryBottleneck }[] = []
    const idleAlerts: { cluster: string; alert: IdleResourceAlert }[] = []

    clusterSnapshots.forEach((snapshot, cluster) => {
      snapshot.queryBottlenecks.forEach((b) => {
        bottlenecks.push({ cluster, bottleneck: b })
      })
      snapshot.idleResourceAlerts.forEach((a) => {
        idleAlerts.push({ cluster, alert: a })
      })
    })

    // Sort bottlenecks by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    bottlenecks.sort((a, b) => severityOrder[a.bottleneck.severity] - severityOrder[b.bottleneck.severity])

    return { bottlenecks, idleAlerts }
  }, [clusterSnapshots])

  // Get performance metrics summary
  const perfSummary = useMemo(() => {
    let totalQueries = 0
    let totalFailed = 0
    let totalTimedOut = 0
    let totalOomKills = 0
    let avgLatency = 0
    let avgCacheHit = 0
    let count = 0

    clusterSnapshots.forEach((snapshot) => {
      totalQueries += snapshot.gateway.queriesCompleted
      totalFailed += snapshot.gateway.queriesFailed
      totalTimedOut += snapshot.gateway.queriesTimedOut
      totalOomKills += snapshot.executor.oomKills
      avgLatency += snapshot.gateway.avgQueryLatencyMs
      const cacheHit = (snapshot.executor.diskCacheHitBytes + snapshot.executor.heapCacheHitBytes) /
        (snapshot.executor.diskCacheHitBytes + snapshot.executor.heapCacheHitBytes +
          snapshot.executor.diskCacheMissBytes + snapshot.executor.heapCacheMissBytes)
      avgCacheHit += cacheHit
      count++
    })

    return {
      totalQueries,
      totalFailed,
      totalTimedOut,
      totalOomKills,
      avgLatency: count > 0 ? avgLatency / count : 0,
      avgCacheHit: count > 0 ? avgCacheHit / count : 0,
      errorRate: totalQueries > 0 ? (totalFailed / totalQueries) * 100 : 0,
    }
  }, [clusterSnapshots])

  const hasIssues = issues.bottlenecks.length > 0 || issues.idleAlerts.length > 0

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div>
        <div className="text-sm font-medium mb-3">Performance Summary</div>
        <div className="grid grid-cols-6 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Queries</div>
            <div className="text-xl font-bold">{perfSummary.totalQueries}</div>
          </div>
          <div className={`border rounded-lg p-3 text-center ${perfSummary.totalFailed > 0 ? "bg-red-50 border-red-200" : ""}`}>
            <div className="text-xs text-muted-foreground">Failed</div>
            <div className={`text-xl font-bold ${perfSummary.totalFailed > 0 ? "text-red-600" : ""}`}>
              {perfSummary.totalFailed}
            </div>
          </div>
          <div className={`border rounded-lg p-3 text-center ${perfSummary.totalTimedOut > 0 ? "bg-orange-50 border-orange-200" : ""}`}>
            <div className="text-xs text-muted-foreground">Timed Out</div>
            <div className={`text-xl font-bold ${perfSummary.totalTimedOut > 0 ? "text-orange-600" : ""}`}>
              {perfSummary.totalTimedOut}
            </div>
          </div>
          <div className={`border rounded-lg p-3 text-center ${perfSummary.totalOomKills > 0 ? "bg-red-50 border-red-200" : ""}`}>
            <div className="text-xs text-muted-foreground">OOM Kills</div>
            <div className={`text-xl font-bold ${perfSummary.totalOomKills > 0 ? "text-red-600" : ""}`}>
              {perfSummary.totalOomKills}
            </div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Avg Latency</div>
            <div className="text-xl font-bold">{perfSummary.avgLatency.toFixed(0)}ms</div>
          </div>
          <div className={`border rounded-lg p-3 text-center ${perfSummary.avgCacheHit < 0.7 ? "bg-yellow-50 border-yellow-200" : ""}`}>
            <div className="text-xs text-muted-foreground">Cache Hit</div>
            <div className={`text-xl font-bold ${perfSummary.avgCacheHit < 0.7 ? "text-yellow-600" : ""}`}>
              {(perfSummary.avgCacheHit * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Active Bottlenecks */}
      {issues.bottlenecks.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Active Bottlenecks
            <Badge variant="secondary" className="text-xs">{issues.bottlenecks.length}</Badge>
          </div>
          <div className="space-y-2">
            {issues.bottlenecks.map((item, i) => {
              const colors = severityColors[item.bottleneck.severity]
              const Icon = bottleneckIcons[item.bottleneck.type] || AlertTriangle

              return (
                <div
                  key={i}
                  className={`border rounded-lg p-3 ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${colors.text} mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.cluster}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${colors.text} ${colors.border}`}
                        >
                          {item.bottleneck.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {item.bottleneck.type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-sm">{item.bottleneck.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Affecting ~{item.bottleneck.affectedQueries} queries
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Recommendation</div>
                      <div className="text-sm">{item.bottleneck.recommendation}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Idle Resources */}
      {issues.idleAlerts.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-500" />
            Idle Resources
            <Badge variant="secondary" className="text-xs">{issues.idleAlerts.length}</Badge>
          </div>
          <div className="space-y-2">
            {issues.idleAlerts.map((item, i) => (
              <div
                key={i}
                className="border rounded-lg p-3 bg-blue-50 border-blue-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">{item.cluster} / {item.alert.instance}</div>
                      <div className="text-sm text-muted-foreground">
                        Idle for {item.alert.idleDurationMinutes} minutes
                        <span className="mx-2">·</span>
                        CPU: {item.alert.cpuUsagePct.toFixed(0)}%
                        <span className="mx-2">·</span>
                        Memory: {item.alert.memUsagePct.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-blue-700 font-medium">
                      ${item.alert.potentialSavingsPerHour.toFixed(2)}/hr wasted
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Consider scaling down or terminating
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Issues */}
      {!hasIssues && (
        <div className="text-center py-8 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <div>No issues detected at this time</div>
          <div className="text-sm">All clusters are running healthy</div>
        </div>
      )}
    </div>
  )
}
