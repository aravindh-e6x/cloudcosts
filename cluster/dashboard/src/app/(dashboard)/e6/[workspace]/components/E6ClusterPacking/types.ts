export interface ComponentSnapshot {
  name: string           // "executor", "planner", "queue", "gateway", "storage", "schema"
  namespace: string      // cluster namespace or "workspace" for shared components
  replicas: number
  cpuAllocated: number
  cpuRequested: number
  memAllocatedGb: number
  memRequestedGb: number
}

export interface TimeSnapshot {
  timestamp: Date
  workspaceComponents: ComponentSnapshot[]
  clusters: Record<string, ComponentSnapshot[]>  // keyed by namespace
}

export interface E6ClusterPackingSectionProps {
  eksCluster: string
  e6Clusters: string[]   // list of E6 cluster namespaces
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

// Workspace-level components (shared)
export const WORKSPACE_COMPONENTS = ["gateway", "storage", "schema"]

// Per-cluster components
export const CLUSTER_COMPONENTS = ["executor", "planner", "queue"]

// Utility functions for consistent coloring
export function getPackingColor(pct: number): string {
  if (pct >= 80) return "bg-green-500"
  if (pct >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

export function getPackingBgColor(pct: number): string {
  if (pct >= 80) return "border-green-200 bg-green-50"
  if (pct >= 50) return "border-yellow-200 bg-yellow-50"
  return "border-red-200 bg-red-50"
}

export function getPackingTextColor(pct: number): string {
  if (pct >= 80) return "text-green-600"
  if (pct >= 50) return "text-yellow-600"
  return "text-red-600"
}
