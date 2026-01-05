export interface ComponentInstance {
  pod: string
  // Node info
  node: string
  nodeCpuCapacity: number
  nodeMemoryCapacityGb: number
  nodeInstanceType: string
  // Pod spec (requested)
  cpuRequested: number
  memoryRequestedGb: number
  // Actual usage
  cpuUsed: number
  memoryUsedGb: number
  // Cost data
  costPerHour: number
}

// Expected configuration for a component
export interface ExpectedConfig {
  podCount: number
  cpuPerPod: number
  memoryPerPodGb: number
  instanceType: string
}

export interface ComponentMetrics {
  instances: ComponentInstance[]
  // Expected config
  expectedConfig: ExpectedConfig
  // Aggregate metrics
  totalCpuRequested: number
  totalCpuUsed: number
  totalMemoryRequestedGb: number
  totalMemoryUsedGb: number
  // Cost
  totalCostPerHour: number
}

export interface GatewayMetrics extends ComponentMetrics {
  activeConnections: number
  queriesRunning: number
  queriesQueued: number
  queriesSucceeded: number
  queriesFailed: number
  queriesCompleted: number
  // Query performance
  avgQueryLatencyMs: number
  p99QueryLatencyMs: number
  queriesTimedOut: number
}

export interface QueueMetrics extends ComponentMetrics {
  activeRequests: number
  activeTasks: number
  activeSplits: number
  tasksRunning: number
  tasksNew: number
  requestsSucceeded: number
  requestsFailed: number
  // Queue health
  avgQueueWaitMs: number
  maxQueueDepth: number
}

export interface ExecutorMetrics extends ComponentMetrics {
  activeTasks: number
  runningTasks: number
  memoryAllocatedBytes: number
  memoryUsedBytes: number
  memoryOccupiedBytes: number
  bytesReadS3: number
  bytesReadCache: number
  bytesReadTotal: number
  rowsRead: number
  diskCacheHitBytes: number
  diskCacheMissBytes: number
  heapCacheHitBytes: number
  heapCacheMissBytes: number
  spillBytesWritten: number
  spillBytesRead: number
  // Performance
  avgTaskDurationMs: number
  tasksKilled: number
  oomKills: number
}

export interface SchemaMetrics extends ComponentMetrics {
  tableListingQueued: number
  tableListingInProgress: number
  metadataQueued: number
  metadataInProgress: number
  thriftQueued: number
  thriftInProgress: number
  // Performance
  avgMetadataFetchMs: number
  cacheHitRate: number
}

export interface StorageMetrics extends ComponentMetrics {
  cacheSize: number
  thriftQueued: number
  thriftInProgress: number
  metadataRequestsInProgress: number
  partitionRequestsInProgress: number
  // Performance
  avgReadLatencyMs: number
  cacheEvictions: number
}

// Optimization recommendations
export interface RightSizingRecommendation {
  component: string
  instance: string
  currentCpu: number
  recommendedCpu: number
  currentMemGb: number
  recommendedMemGb: number
  reason: string
  savingsPerHour: number
  savingsPercent: number
}

export interface IdleResourceAlert {
  component: string
  instance: string
  idleDurationMinutes: number
  cpuUsagePct: number
  memUsagePct: number
  potentialSavingsPerHour: number
}

export interface ScalingRecommendation {
  component: string
  direction: "scale_up" | "scale_down"
  currentCount: number
  recommendedCount: number
  reason: string
  impact: string
}

export interface QueryBottleneck {
  type: "queue_wait" | "memory_pressure" | "cache_miss" | "spill" | "timeout"
  severity: "low" | "medium" | "high" | "critical"
  description: string
  affectedQueries: number
  recommendation: string
}

export interface CostBreakdown {
  component: string
  instanceCount: number
  cpuCost: number
  memoryCost: number
  totalCost: number
  percentOfTotal: number
}

export interface EngineSnapshot {
  timestamp: Date
  gateway: GatewayMetrics
  queue: QueueMetrics
  executor: ExecutorMetrics
  schema: SchemaMetrics
  storage: StorageMetrics
  // Optimization data
  rightSizingRecommendations: RightSizingRecommendation[]
  idleResourceAlerts: IdleResourceAlert[]
  scalingRecommendations: ScalingRecommendation[]
  queryBottlenecks: QueryBottleneck[]
  costBreakdown: CostBreakdown[]
  totalCostPerHour: number
  potentialSavingsPerHour: number
}

export interface ThroughputDataPoint {
  time: string
  queriesPerMin: number
  rowsPerSec: number
  bytesPerSec: number
}

export interface UtilizationDataPoint {
  time: string
  timestamp: Date
  cpuUtilPct: number
  memUtilPct: number
}
