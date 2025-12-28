export interface NodeSnapshot {
  node: string
  cpuAllocated: number
  cpuCapacity: number
  memAllocatedGb: number
  memCapacityGb: number
  podCount: number
  instanceType: string
}

export interface TimeSnapshot {
  timestamp: Date
  nodes: NodeSnapshot[]
}

export interface NodePackingSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
  selectedDate: string
}

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

export function getHeatColor(pct: number): string {
  if (pct >= 80) return "bg-green-500"
  if (pct >= 60) return "bg-yellow-500"
  if (pct >= 40) return "bg-orange-500"
  return "bg-red-500"
}
