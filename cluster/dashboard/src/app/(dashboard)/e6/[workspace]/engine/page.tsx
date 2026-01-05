"use client"

import { use, useMemo, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Activity, Gauge, Database, Layers, HardDrive, Server } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "e6ds"
import { useDate } from "@/components/providers"
import { getWorkspace } from "@/config/workspaces"
import { TimelineProvider, useTimeline } from "../components/TimelineContext"
import { TimelineScrubber } from "../components/TimelineScrubber"
import { generateEngineSnapshotFromWorkspace } from "../components/EngineHealth/mockData"
import { EngineSnapshot } from "../components/EngineHealth/types"
import { GatewayDetails } from "./GatewayDetails"
import { ExecutorDetails } from "./ExecutorDetails"
import { QueueDetails } from "./QueueDetails"
import { SchemaDetails } from "./SchemaDetails"
import { StorageDetails } from "./StorageDetails"
import { format } from "date-fns"

function EngineDetailsContent({ workspaceId }: { workspaceId: string }) {
  const { currentSnapshot } = useTimeline()
  const [selectedCluster, setSelectedCluster] = useState<string>("")
  const [activeTab, setActiveTab] = useState("gateway")

  // Get available E6 clusters
  const e6Clusters = useMemo(() => {
    if (!currentSnapshot) return []
    return currentSnapshot.e6Clusters.map(c => c.name)
  }, [currentSnapshot])

  // Auto-select first cluster if none selected
  useMemo(() => {
    if (e6Clusters.length > 0 && !selectedCluster) {
      setSelectedCluster(e6Clusters[0])
    }
  }, [e6Clusters, selectedCluster])

  // Generate engine snapshot for selected cluster
  const engineSnapshot = useMemo((): EngineSnapshot | null => {
    if (!currentSnapshot || !selectedCluster) return null
    const clusterIdx = e6Clusters.indexOf(selectedCluster)
    return generateEngineSnapshotFromWorkspace(currentSnapshot, selectedCluster, clusterIdx)
  }, [currentSnapshot, selectedCluster, e6Clusters])

  if (!currentSnapshot) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (e6Clusters.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-muted-foreground">No E6 clusters found in this workspace</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cluster Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Engine Metrics
            </CardTitle>
            <Select value={selectedCluster} onValueChange={setSelectedCluster}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select cluster" />
              </SelectTrigger>
              <SelectContent>
                {e6Clusters.map(cluster => (
                  <SelectItem key={cluster} value={cluster}>
                    {cluster}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {engineSnapshot && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4">
            <SummaryCard
              icon={<Gauge className="h-4 w-4" />}
              label="Gateway"
              value={`${engineSnapshot.gateway.queriesRunning} queries`}
              subValue={`${engineSnapshot.gateway.instances.length} pods`}
              isActive={activeTab === "gateway"}
              onClick={() => setActiveTab("gateway")}
            />
            <SummaryCard
              icon={<Server className="h-4 w-4" />}
              label="Executor"
              value={`${engineSnapshot.executor.runningTasks} tasks`}
              subValue={`${engineSnapshot.executor.instances.length} pods`}
              isActive={activeTab === "executor"}
              onClick={() => setActiveTab("executor")}
            />
            <SummaryCard
              icon={<Layers className="h-4 w-4" />}
              label="Queue"
              value={`${engineSnapshot.queue.activeTasks} active`}
              subValue={`${engineSnapshot.queue.instances.length} pods`}
              isActive={activeTab === "queue"}
              onClick={() => setActiveTab("queue")}
            />
            <SummaryCard
              icon={<Database className="h-4 w-4" />}
              label="Schema"
              value={`${engineSnapshot.schema.metadataInProgress} in-flight`}
              subValue={`${engineSnapshot.schema.instances.length} pods`}
              isActive={activeTab === "schema"}
              onClick={() => setActiveTab("schema")}
            />
            <SummaryCard
              icon={<HardDrive className="h-4 w-4" />}
              label="Storage"
              value={`${(engineSnapshot.storage.cacheSize / 1024 / 1024).toFixed(0)} MB`}
              subValue={`${engineSnapshot.storage.instances.length} pods`}
              isActive={activeTab === "storage"}
              onClick={() => setActiveTab("storage")}
            />
          </div>

          {/* Component Details Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="gateway" className="flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" />
                Gateway
              </TabsTrigger>
              <TabsTrigger value="executor" className="flex items-center gap-1">
                <Server className="h-3.5 w-3.5" />
                Executor
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                Queue
              </TabsTrigger>
              <TabsTrigger value="schema" className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5" />
                Storage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gateway" className="mt-4">
              <GatewayDetails metrics={engineSnapshot.gateway} />
            </TabsContent>

            <TabsContent value="executor" className="mt-4">
              <ExecutorDetails metrics={engineSnapshot.executor} />
            </TabsContent>

            <TabsContent value="queue" className="mt-4">
              <QueueDetails metrics={engineSnapshot.queue} />
            </TabsContent>

            <TabsContent value="schema" className="mt-4">
              <SchemaDetails metrics={engineSnapshot.schema} />
            </TabsContent>

            <TabsContent value="storage" className="mt-4">
              <StorageDetails metrics={engineSnapshot.storage} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  subValue,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subValue: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isActive ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{subValue}</p>
      </CardContent>
    </Card>
  )
}

export default function EngineDetailsPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: workspaceId } = use(params)
  const workspace = getWorkspace(workspaceId)

  if (!workspace) {
    notFound()
  }

  const { timeRange } = useDate()

  const dateRange = useMemo(() => {
    const from = timeRange?.from || new Date()
    const to = timeRange?.to || new Date()
    const startTs = new Date(from)
    startTs.setHours(0, 0, 0, 0)
    const endTs = new Date(to)
    endTs.setHours(23, 59, 59, 999)
    return {
      startTs: startTs.toISOString(),
      endTs: endTs.toISOString(),
    }
  }, [timeRange])

  const selectedDate = timeRange?.from
    ? format(timeRange.from, "MMM d, yyyy")
    : format(new Date(), "MMM d, yyyy")

  return (
    <TimelineProvider dateRange={dateRange}>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href={`/e6/${workspaceId}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {workspace.name}
        </Link>

        {/* Page Heading */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">Engine Details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {workspace.name} - {selectedDate}
            </p>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="sticky top-0 z-30 -mx-6 px-6 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TimelineScrubber />
        </div>

        {/* Main Content */}
        <EngineDetailsContent workspaceId={workspaceId} />
      </div>
    </TimelineProvider>
  )
}
