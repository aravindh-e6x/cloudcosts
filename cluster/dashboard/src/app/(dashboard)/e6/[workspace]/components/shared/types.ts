// Unified data model for the entire workspace

export interface PodSnapshot {
  name: string
  component: string  // gateway, queue, executor, schema, storage
  namespace: string  // E6 cluster name (e.g., "analytics", "reporting")
  // Resources
  cpuRequested: number
  cpuUsed: number
  memRequestedGb: number
  memUsedGb: number
}

export interface NodeSnapshot {
  name: string
  instanceType: string
  cpuCapacity: number
  memCapacityGb: number
  costPerHour: number
  pods: PodSnapshot[]
}

// Expected configuration per component type
export interface ExpectedConfig {
  podCount: number
  cpuPerPod: number
  memoryPerPodGb: number
  instanceType: string
}

// E6 cluster component metrics (derived from pods)
export interface E6ComponentMetrics {
  component: string
  expectedConfig: ExpectedConfig
  instances: {
    pod: string
    node: string
    nodeInstanceType: string
    nodeCpuCapacity: number
    nodeMemCapacityGb: number
    cpuRequested: number
    cpuUsed: number
    memRequestedGb: number
    memUsedGb: number
    costPerHour: number
  }[]
  // Totals
  totalCpuRequested: number
  totalCpuUsed: number
  totalMemRequestedGb: number
  totalMemUsedGb: number
  totalCostPerHour: number
}

// E6 cluster snapshot (derived from pods grouped by namespace)
export interface E6ClusterSnapshot {
  name: string
  gateway: E6ComponentMetrics
  queue: E6ComponentMetrics
  executor: E6ComponentMetrics
  schema: E6ComponentMetrics
  storage: E6ComponentMetrics
  // Query metrics (simulated)
  queriesRunning: number
  queriesQueued: number
  queriesSucceeded: number
  queriesFailed: number
  // Totals
  totalCostPerHour: number
  totalPods: number
}

// Complete workspace snapshot at a point in time
export interface WorkspaceSnapshot {
  timestamp: Date
  nodes: NodeSnapshot[]
  e6Clusters: E6ClusterSnapshot[]
  // Aggregates
  totalNodes: number
  totalPods: number
  totalCpuCapacity: number
  totalCpuUsed: number
  totalMemCapacityGb: number
  totalMemUsedGb: number
  totalCostPerHour: number
}
