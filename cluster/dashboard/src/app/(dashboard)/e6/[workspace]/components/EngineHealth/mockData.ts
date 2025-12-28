import {
  EngineSnapshot,
  GatewayMetrics,
  QueueMetrics,
  ExecutorMetrics,
  SchemaMetrics,
  StorageMetrics,
  ThroughputDataPoint,
  ComponentInstance,
  RightSizingRecommendation,
  IdleResourceAlert,
  ScalingRecommendation,
  QueryBottleneck,
  CostBreakdown,
} from "./types"

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Cost per CPU core per hour (approximate AWS pricing)
const CPU_COST_PER_HOUR = 0.05
// Cost per GB memory per hour
const MEM_COST_PER_GB_HOUR = 0.01

// Node types available in the cluster
const NODE_TYPES = [
  { type: "m5.xlarge", cpu: 4, memGb: 16 },
  { type: "m5.2xlarge", cpu: 8, memGb: 32 },
  { type: "m5.4xlarge", cpu: 16, memGb: 64 },
  { type: "r5.2xlarge", cpu: 8, memGb: 64 },
  { type: "r5.4xlarge", cpu: 16, memGb: 128 },
  { type: "c5.2xlarge", cpu: 8, memGb: 16 },
  { type: "c5.4xlarge", cpu: 16, memGb: 32 },
]

function generateInstances(
  componentName: string,
  count: number,
  seed: number,
  cpuPerInstance: number,
  memPerInstanceGb: number,
  loadFactor: number,
  clusterOffset: number = 0
): { instances: ComponentInstance[]; totals: { cpuReq: number; cpuUsed: number; memReq: number; memUsed: number; cost: number } } {
  const instances: ComponentInstance[] = []
  let totalCpuReq = 0
  let totalCpuUsed = 0
  let totalMemReq = 0
  let totalMemUsed = 0
  let totalCost = 0

  // Generate a pool of nodes for this cluster
  const nodeCount = Math.max(3, Math.ceil(count / 2)) // Rough estimate of nodes needed
  const clusterNodes: { name: string; type: typeof NODE_TYPES[0] }[] = []
  for (let n = 0; n < nodeCount; n++) {
    const nodeSeed = seed + clusterOffset * 500 + n * 50
    // Pick node type based on component requirements
    let suitableTypes = NODE_TYPES.filter(t => t.cpu >= cpuPerInstance && t.memGb >= memPerInstanceGb)
    if (suitableTypes.length === 0) suitableTypes = NODE_TYPES.slice(-2) // Use largest if none fit
    const nodeType = suitableTypes[Math.floor(seededRandom(nodeSeed) * suitableTypes.length)]
    clusterNodes.push({
      name: `node-${String.fromCharCode(97 + clusterOffset)}-${n + 1}`,
      type: nodeType,
    })
  }

  for (let i = 0; i < count; i++) {
    const instanceSeed = seed + i * 100
    const cpuRequested = cpuPerInstance
    const memRequested = memPerInstanceGb

    // Assign to a node (round-robin with some randomness)
    const nodeIdx = Math.floor(seededRandom(instanceSeed + 77) * clusterNodes.length)
    const assignedNode = clusterNodes[nodeIdx]

    // Usage varies between 40-95% of requested based on load
    const usagePct = 0.4 + loadFactor * 0.5 + seededRandom(instanceSeed) * 0.15
    const cpuUsed = cpuRequested * usagePct
    const memUsed = memRequested * (0.5 + loadFactor * 0.4 + seededRandom(instanceSeed + 1) * 0.1)
    const costPerHour = cpuRequested * CPU_COST_PER_HOUR + memRequested * MEM_COST_PER_GB_HOUR

    instances.push({
      pod: `${componentName}-${i}`,
      // Node info
      node: assignedNode.name,
      nodeCpuCapacity: assignedNode.type.cpu,
      nodeMemoryCapacityGb: assignedNode.type.memGb,
      nodeInstanceType: assignedNode.type.type,
      // Pod spec
      cpuRequested,
      memoryRequestedGb: memRequested,
      // Actual usage
      cpuUsed,
      memoryUsedGb: Math.min(memUsed, memRequested),
      costPerHour,
    })

    totalCpuReq += cpuRequested
    totalCpuUsed += cpuUsed
    totalMemReq += memRequested
    totalMemUsed += Math.min(memUsed, memRequested)
    totalCost += costPerHour
  }

  return {
    instances,
    totals: { cpuReq: totalCpuReq, cpuUsed: totalCpuUsed, memReq: totalMemReq, memUsed: totalMemUsed, cost: totalCost },
  }
}

function generateRightSizingRecommendations(
  gateway: GatewayMetrics,
  queue: QueueMetrics,
  executor: ExecutorMetrics,
  schema: SchemaMetrics,
  storage: StorageMetrics,
  seed: number
): RightSizingRecommendation[] {
  const recommendations: RightSizingRecommendation[] = []

  // Check each executor instance for over-provisioning
  executor.instances.forEach((inst) => {
    const cpuUtil = inst.cpuUsed / inst.cpuRequested
    const memUtil = inst.memoryUsedGb / inst.memoryRequestedGb

    if (cpuUtil < 0.5 && memUtil < 0.6) {
      const recommendedCpu = Math.max(2, Math.ceil(inst.cpuUsed * 1.3))
      const recommendedMem = Math.max(8, Math.ceil(inst.memoryUsedGb * 1.3))
      const currentCost = inst.costPerHour
      const newCost = recommendedCpu * CPU_COST_PER_HOUR + recommendedMem * MEM_COST_PER_GB_HOUR
      const savings = currentCost - newCost

      if (savings > 0.01) {
        recommendations.push({
          component: "executor",
          instance: inst.pod,
          currentCpu: inst.cpuRequested,
          recommendedCpu,
          currentMemGb: inst.memoryRequestedGb,
          recommendedMemGb: recommendedMem,
          reason: `CPU at ${(cpuUtil * 100).toFixed(0)}%, Memory at ${(memUtil * 100).toFixed(0)}%`,
          savingsPerHour: savings,
          savingsPercent: (savings / currentCost) * 100,
        })
      }
    }
  })

  // Check gateway instances
  gateway.instances.forEach((inst) => {
    const cpuUtil = inst.cpuUsed / inst.cpuRequested
    if (cpuUtil < 0.4) {
      recommendations.push({
        component: "gateway",
        instance: inst.pod,
        currentCpu: inst.cpuRequested,
        recommendedCpu: Math.max(1, Math.ceil(inst.cpuUsed * 1.5)),
        currentMemGb: inst.memoryRequestedGb,
        recommendedMemGb: Math.max(2, Math.ceil(inst.memoryUsedGb * 1.3)),
        reason: `Low CPU utilization (${(cpuUtil * 100).toFixed(0)}%)`,
        savingsPerHour: inst.costPerHour * 0.3,
        savingsPercent: 30,
      })
    }
  })

  return recommendations.slice(0, 5) // Limit to top 5
}

function generateIdleResourceAlerts(
  gateway: GatewayMetrics,
  queue: QueueMetrics,
  executor: ExecutorMetrics,
  schema: SchemaMetrics,
  storage: StorageMetrics,
  seed: number,
  timeFactor: number
): IdleResourceAlert[] {
  const alerts: IdleResourceAlert[] = []

  // During low-traffic periods, some executors might be idle
  if (timeFactor < 0.5) {
    executor.instances.forEach((inst, idx) => {
      const cpuUtil = (inst.cpuUsed / inst.cpuRequested) * 100
      const memUtil = (inst.memoryUsedGb / inst.memoryRequestedGb) * 100

      if (cpuUtil < 20 && seededRandom(seed + idx) > 0.5) {
        alerts.push({
          component: "executor",
          instance: inst.pod,
          idleDurationMinutes: Math.floor(15 + seededRandom(seed + idx + 100) * 45),
          cpuUsagePct: cpuUtil,
          memUsagePct: memUtil,
          potentialSavingsPerHour: inst.costPerHour,
        })
      }
    })
  }

  return alerts.slice(0, 3)
}

function generateScalingRecommendations(
  gateway: GatewayMetrics,
  queue: QueueMetrics,
  executor: ExecutorMetrics,
  timeFactor: number,
  seed: number
): ScalingRecommendation[] {
  const recommendations: ScalingRecommendation[] = []

  // Check if executors are overloaded
  const avgExecutorCpuUtil = executor.totalCpuUsed / executor.totalCpuRequested
  const avgExecutorMemUtil = executor.totalMemoryUsedGb / executor.totalMemoryRequestedGb

  if (avgExecutorCpuUtil > 0.85 || avgExecutorMemUtil > 0.85) {
    recommendations.push({
      component: "executor",
      direction: "scale_up",
      currentCount: executor.instances.length,
      recommendedCount: executor.instances.length + Math.ceil(executor.instances.length * 0.5),
      reason: `High utilization: CPU ${(avgExecutorCpuUtil * 100).toFixed(0)}%, Memory ${(avgExecutorMemUtil * 100).toFixed(0)}%`,
      impact: "Reduce query latency and prevent OOM kills",
    })
  } else if (avgExecutorCpuUtil < 0.4 && avgExecutorMemUtil < 0.5 && executor.instances.length > 2) {
    recommendations.push({
      component: "executor",
      direction: "scale_down",
      currentCount: executor.instances.length,
      recommendedCount: Math.max(2, executor.instances.length - 1),
      reason: `Low utilization: CPU ${(avgExecutorCpuUtil * 100).toFixed(0)}%, Memory ${(avgExecutorMemUtil * 100).toFixed(0)}%`,
      impact: `Save ~$${(executor.instances[0]?.costPerHour || 0.5).toFixed(2)}/hr per instance`,
    })
  }

  // Check queue depth
  if (gateway.queriesQueued > 10) {
    recommendations.push({
      component: "executor",
      direction: "scale_up",
      currentCount: executor.instances.length,
      recommendedCount: executor.instances.length + 2,
      reason: `High queue depth: ${gateway.queriesQueued} queries waiting`,
      impact: "Reduce queue wait time from ~${queue.avgQueueWaitMs}ms",
    })
  }

  return recommendations
}

function generateQueryBottlenecks(
  gateway: GatewayMetrics,
  queue: QueueMetrics,
  executor: ExecutorMetrics,
  seed: number
): QueryBottleneck[] {
  const bottlenecks: QueryBottleneck[] = []

  // Queue wait bottleneck
  if (queue.avgQueueWaitMs > 500) {
    bottlenecks.push({
      type: "queue_wait",
      severity: queue.avgQueueWaitMs > 2000 ? "critical" : queue.avgQueueWaitMs > 1000 ? "high" : "medium",
      description: `Average queue wait time is ${queue.avgQueueWaitMs}ms`,
      affectedQueries: gateway.queriesQueued,
      recommendation: "Scale up executors or optimize long-running queries",
    })
  }

  // Memory pressure
  const memUtil = executor.totalMemoryUsedGb / executor.totalMemoryRequestedGb
  if (memUtil > 0.85 || executor.oomKills > 0) {
    bottlenecks.push({
      type: "memory_pressure",
      severity: executor.oomKills > 0 ? "critical" : memUtil > 0.9 ? "high" : "medium",
      description: `Memory at ${(memUtil * 100).toFixed(0)}%${executor.oomKills > 0 ? `, ${executor.oomKills} OOM kills` : ""}`,
      affectedQueries: Math.floor(gateway.queriesRunning * 0.3),
      recommendation: "Increase executor memory or add more executors",
    })
  }

  // Cache miss
  const cacheHitRate = (executor.diskCacheHitBytes + executor.heapCacheHitBytes) /
    (executor.diskCacheHitBytes + executor.heapCacheHitBytes + executor.diskCacheMissBytes + executor.heapCacheMissBytes)
  if (cacheHitRate < 0.7) {
    bottlenecks.push({
      type: "cache_miss",
      severity: cacheHitRate < 0.5 ? "high" : "medium",
      description: `Cache hit rate is only ${(cacheHitRate * 100).toFixed(0)}%`,
      affectedQueries: Math.floor(gateway.queriesRunning * (1 - cacheHitRate)),
      recommendation: "Increase cache size or optimize query patterns",
    })
  }

  // Spill to disk
  if (executor.spillBytesWritten > 100 * 1024 * 1024) {
    bottlenecks.push({
      type: "spill",
      severity: executor.spillBytesWritten > 500 * 1024 * 1024 ? "high" : "medium",
      description: `Spilling ${(executor.spillBytesWritten / (1024 * 1024)).toFixed(0)}MB to disk`,
      affectedQueries: Math.floor(gateway.queriesRunning * 0.2),
      recommendation: "Increase executor memory to reduce disk spill",
    })
  }

  // Timeouts
  if (gateway.queriesTimedOut > 0) {
    bottlenecks.push({
      type: "timeout",
      severity: gateway.queriesTimedOut > 5 ? "critical" : "high",
      description: `${gateway.queriesTimedOut} queries timed out`,
      affectedQueries: gateway.queriesTimedOut,
      recommendation: "Investigate slow queries or increase timeout threshold",
    })
  }

  return bottlenecks
}

function generateCostBreakdown(
  gateway: GatewayMetrics,
  queue: QueueMetrics,
  executor: ExecutorMetrics,
  schema: SchemaMetrics,
  storage: StorageMetrics
): CostBreakdown[] {
  const totalCost = gateway.totalCostPerHour + queue.totalCostPerHour +
    executor.totalCostPerHour + schema.totalCostPerHour + storage.totalCostPerHour

  return [
    {
      component: "Executor",
      instanceCount: executor.instances.length,
      cpuCost: executor.totalCpuRequested * CPU_COST_PER_HOUR,
      memoryCost: executor.totalMemoryRequestedGb * MEM_COST_PER_GB_HOUR,
      totalCost: executor.totalCostPerHour,
      percentOfTotal: (executor.totalCostPerHour / totalCost) * 100,
    },
    {
      component: "Gateway",
      instanceCount: gateway.instances.length,
      cpuCost: gateway.totalCpuRequested * CPU_COST_PER_HOUR,
      memoryCost: gateway.totalMemoryRequestedGb * MEM_COST_PER_GB_HOUR,
      totalCost: gateway.totalCostPerHour,
      percentOfTotal: (gateway.totalCostPerHour / totalCost) * 100,
    },
    {
      component: "Queue",
      instanceCount: queue.instances.length,
      cpuCost: queue.totalCpuRequested * CPU_COST_PER_HOUR,
      memoryCost: queue.totalMemoryRequestedGb * MEM_COST_PER_GB_HOUR,
      totalCost: queue.totalCostPerHour,
      percentOfTotal: (queue.totalCostPerHour / totalCost) * 100,
    },
    {
      component: "Schema",
      instanceCount: schema.instances.length,
      cpuCost: schema.totalCpuRequested * CPU_COST_PER_HOUR,
      memoryCost: schema.totalMemoryRequestedGb * MEM_COST_PER_GB_HOUR,
      totalCost: schema.totalCostPerHour,
      percentOfTotal: (schema.totalCostPerHour / totalCost) * 100,
    },
    {
      component: "Storage",
      instanceCount: storage.instances.length,
      cpuCost: storage.totalCpuRequested * CPU_COST_PER_HOUR,
      memoryCost: storage.totalMemoryRequestedGb * MEM_COST_PER_GB_HOUR,
      totalCost: storage.totalCostPerHour,
      percentOfTotal: (storage.totalCostPerHour / totalCost) * 100,
    },
  ].sort((a, b) => b.totalCost - a.totalCost)
}

export function generateEngineSnapshot(timestamp: Date, clusterOffset: number = 0): EngineSnapshot {
  const hour = timestamp.getHours()
  const minute = timestamp.getMinutes()
  const seed = hour * 60 + minute + (clusterOffset * 1000)

  // Time factor - higher during business hours
  let timeFactor: number
  if (hour >= 9 && hour <= 17) {
    timeFactor = 0.7 + Math.sin((hour - 9) * Math.PI / 8) * 0.25
  } else if (hour >= 1 && hour <= 5) {
    timeFactor = 0.85 // batch jobs
  } else {
    timeFactor = 0.3
  }

  // Number of instances per component (varies by cluster and time)
  const baseExecutorCount = 3 + Math.floor(seededRandom(seed + clusterOffset) * 3) // 3-5 executors
  const executorCount = Math.max(2, Math.floor(baseExecutorCount * (0.6 + timeFactor * 0.6)))
  const gatewayCount = 2
  const queueCount = 1
  const schemaCount = 1
  const storageCount = 2

  // Gateway instances (2 CPU, 4GB each)
  const gatewayInstances = generateInstances("gateway", gatewayCount, seed + 100, 2, 4, timeFactor, clusterOffset)
  const gateway: GatewayMetrics = {
    instances: gatewayInstances.instances,
    totalCpuRequested: gatewayInstances.totals.cpuReq,
    totalCpuUsed: gatewayInstances.totals.cpuUsed,
    totalMemoryRequestedGb: gatewayInstances.totals.memReq,
    totalMemoryUsedGb: gatewayInstances.totals.memUsed,
    totalCostPerHour: gatewayInstances.totals.cost,
    activeConnections: Math.floor(20 + timeFactor * 60 + seededRandom(seed) * 20),
    queriesRunning: Math.floor(5 + timeFactor * 25 + seededRandom(seed + 1) * 10),
    queriesQueued: Math.floor(timeFactor * 8 + seededRandom(seed + 2) * 5),
    queriesSucceeded: Math.floor(100 + timeFactor * 400 + seededRandom(seed + 3) * 50),
    queriesFailed: Math.floor(seededRandom(seed + 4) * 5),
    queriesCompleted: Math.floor(100 + timeFactor * 410 + seededRandom(seed + 5) * 50),
    avgQueryLatencyMs: Math.floor(50 + (1 - timeFactor) * 100 + seededRandom(seed + 6) * 50),
    p99QueryLatencyMs: Math.floor(200 + (1 - timeFactor) * 500 + seededRandom(seed + 7) * 200),
    queriesTimedOut: timeFactor > 0.8 ? Math.floor(seededRandom(seed + 8) * 3) : 0,
  }

  // Queue instances (4 CPU, 8GB each)
  const queueInstances = generateInstances("queue", queueCount, seed + 200, 4, 8, timeFactor, clusterOffset)
  const queue: QueueMetrics = {
    instances: queueInstances.instances,
    totalCpuRequested: queueInstances.totals.cpuReq,
    totalCpuUsed: queueInstances.totals.cpuUsed,
    totalMemoryRequestedGb: queueInstances.totals.memReq,
    totalMemoryUsedGb: queueInstances.totals.memUsed,
    totalCostPerHour: queueInstances.totals.cost,
    activeRequests: Math.floor(10 + timeFactor * 30 + seededRandom(seed + 10) * 10),
    activeTasks: Math.floor(20 + timeFactor * 60 + seededRandom(seed + 11) * 20),
    activeSplits: Math.floor(40 + timeFactor * 120 + seededRandom(seed + 12) * 40),
    tasksRunning: Math.floor(15 + timeFactor * 45 + seededRandom(seed + 13) * 15),
    tasksNew: Math.floor(5 + timeFactor * 15 + seededRandom(seed + 14) * 5),
    requestsSucceeded: Math.floor(50 + timeFactor * 200 + seededRandom(seed + 15) * 30),
    requestsFailed: Math.floor(seededRandom(seed + 16) * 3),
    avgQueueWaitMs: Math.floor(20 + timeFactor * 200 + seededRandom(seed + 17) * 100),
    maxQueueDepth: Math.floor(5 + timeFactor * 20 + seededRandom(seed + 18) * 10),
  }

  // Executor instances (8 CPU, 32GB each)
  const executorInstances = generateInstances("executor", executorCount, seed + 300, 8, 32, timeFactor, clusterOffset)
  const memoryAllocated = executorCount * 32 * 1024 * 1024 * 1024
  const memoryUsedPct = 0.5 + timeFactor * 0.35 + seededRandom(seed + 20) * 0.1
  const executor: ExecutorMetrics = {
    instances: executorInstances.instances,
    totalCpuRequested: executorInstances.totals.cpuReq,
    totalCpuUsed: executorInstances.totals.cpuUsed,
    totalMemoryRequestedGb: executorInstances.totals.memReq,
    totalMemoryUsedGb: executorInstances.totals.memUsed,
    totalCostPerHour: executorInstances.totals.cost,
    activeTasks: Math.floor(15 + timeFactor * 50 + seededRandom(seed + 21) * 15),
    runningTasks: Math.floor(12 + timeFactor * 40 + seededRandom(seed + 22) * 12),
    memoryAllocatedBytes: memoryAllocated,
    memoryUsedBytes: Math.floor(memoryAllocated * memoryUsedPct),
    memoryOccupiedBytes: Math.floor(memoryAllocated * memoryUsedPct * 0.9),
    bytesReadS3: Math.floor((50 + timeFactor * 150) * 1024 * 1024 + seededRandom(seed + 23) * 50 * 1024 * 1024),
    bytesReadCache: Math.floor((100 + timeFactor * 400) * 1024 * 1024 + seededRandom(seed + 24) * 100 * 1024 * 1024),
    bytesReadTotal: 0,
    rowsRead: Math.floor((50000 + timeFactor * 200000) + seededRandom(seed + 25) * 50000),
    diskCacheHitBytes: Math.floor((80 + timeFactor * 300) * 1024 * 1024),
    diskCacheMissBytes: Math.floor((20 + timeFactor * 60) * 1024 * 1024),
    heapCacheHitBytes: Math.floor((40 + timeFactor * 150) * 1024 * 1024),
    heapCacheMissBytes: Math.floor((5 + timeFactor * 20) * 1024 * 1024),
    spillBytesWritten: Math.floor(timeFactor * 30 * 1024 * 1024 + seededRandom(seed + 26) * 10 * 1024 * 1024),
    spillBytesRead: Math.floor(timeFactor * 25 * 1024 * 1024 + seededRandom(seed + 27) * 8 * 1024 * 1024),
    avgTaskDurationMs: Math.floor(100 + timeFactor * 500 + seededRandom(seed + 28) * 200),
    tasksKilled: timeFactor > 0.85 ? Math.floor(seededRandom(seed + 29) * 2) : 0,
    oomKills: memoryUsedPct > 0.9 ? Math.floor(seededRandom(seed + 30) * 2) : 0,
  }
  executor.bytesReadTotal = executor.bytesReadS3 + executor.bytesReadCache

  // Schema instances (2 CPU, 4GB each)
  const schemaInstances = generateInstances("schema", schemaCount, seed + 400, 2, 4, timeFactor, clusterOffset)
  const schema: SchemaMetrics = {
    instances: schemaInstances.instances,
    totalCpuRequested: schemaInstances.totals.cpuReq,
    totalCpuUsed: schemaInstances.totals.cpuUsed,
    totalMemoryRequestedGb: schemaInstances.totals.memReq,
    totalMemoryUsedGb: schemaInstances.totals.memUsed,
    totalCostPerHour: schemaInstances.totals.cost,
    tableListingQueued: Math.floor(timeFactor * 8 + seededRandom(seed + 30) * 4),
    tableListingInProgress: Math.floor(timeFactor * 4 + seededRandom(seed + 31) * 2),
    metadataQueued: Math.floor(timeFactor * 12 + seededRandom(seed + 32) * 6),
    metadataInProgress: Math.floor(timeFactor * 6 + seededRandom(seed + 33) * 3),
    thriftQueued: Math.floor(timeFactor * 10 + seededRandom(seed + 34) * 5),
    thriftInProgress: Math.floor(timeFactor * 5 + seededRandom(seed + 35) * 3),
    avgMetadataFetchMs: Math.floor(10 + seededRandom(seed + 36) * 30),
    cacheHitRate: 0.7 + seededRandom(seed + 37) * 0.25,
  }

  // Storage instances (2 CPU, 8GB each)
  const storageInstances = generateInstances("storage", storageCount, seed + 500, 2, 8, timeFactor, clusterOffset)
  const storage: StorageMetrics = {
    instances: storageInstances.instances,
    totalCpuRequested: storageInstances.totals.cpuReq,
    totalCpuUsed: storageInstances.totals.cpuUsed,
    totalMemoryRequestedGb: storageInstances.totals.memReq,
    totalMemoryUsedGb: storageInstances.totals.memUsed,
    totalCostPerHour: storageInstances.totals.cost,
    cacheSize: Math.floor((500 + timeFactor * 1500) * 1024 * 1024),
    thriftQueued: Math.floor(timeFactor * 8 + seededRandom(seed + 40) * 4),
    thriftInProgress: Math.floor(timeFactor * 4 + seededRandom(seed + 41) * 2),
    metadataRequestsInProgress: Math.floor(timeFactor * 10 + seededRandom(seed + 42) * 5),
    partitionRequestsInProgress: Math.floor(timeFactor * 8 + seededRandom(seed + 43) * 4),
    avgReadLatencyMs: Math.floor(5 + seededRandom(seed + 44) * 15),
    cacheEvictions: Math.floor(timeFactor * 50 + seededRandom(seed + 45) * 30),
  }

  // Generate optimization data
  const rightSizingRecommendations = generateRightSizingRecommendations(gateway, queue, executor, schema, storage, seed)
  const idleResourceAlerts = generateIdleResourceAlerts(gateway, queue, executor, schema, storage, seed, timeFactor)
  const scalingRecommendations = generateScalingRecommendations(gateway, queue, executor, timeFactor, seed)
  const queryBottlenecks = generateQueryBottlenecks(gateway, queue, executor, seed)
  const costBreakdown = generateCostBreakdown(gateway, queue, executor, schema, storage)

  const totalCostPerHour = costBreakdown.reduce((sum, c) => sum + c.totalCost, 0)
  const potentialSavingsPerHour = rightSizingRecommendations.reduce((sum, r) => sum + r.savingsPerHour, 0) +
    idleResourceAlerts.reduce((sum, a) => sum + a.potentialSavingsPerHour, 0)

  return {
    timestamp,
    gateway,
    queue,
    executor,
    schema,
    storage,
    rightSizingRecommendations,
    idleResourceAlerts,
    scalingRecommendations,
    queryBottlenecks,
    costBreakdown,
    totalCostPerHour,
    potentialSavingsPerHour,
  }
}

export function generateThroughputHistory(timestamp: Date): ThroughputDataPoint[] {
  const data: ThroughputDataPoint[] = []

  for (let i = 9; i >= 0; i--) {
    const offsetSeconds = i * 30
    const time = new Date(timestamp.getTime() - offsetSeconds * 1000)
    const seed = time.getHours() * 3600 + time.getMinutes() * 60 + time.getSeconds()

    const hour = time.getHours()
    let timeFactor: number
    if (hour >= 9 && hour <= 17) {
      timeFactor = 0.7 + Math.sin((hour - 9) * Math.PI / 8) * 0.25
    } else if (hour >= 1 && hour <= 5) {
      timeFactor = 0.85
    } else {
      timeFactor = 0.3
    }

    data.push({
      time: `${time.getMinutes()}:${time.getSeconds().toString().padStart(2, "0")}`,
      queriesPerMin: Math.floor(30 + timeFactor * 80 + seededRandom(seed) * 20),
      rowsPerSec: Math.floor(50000 + timeFactor * 150000 + seededRandom(seed + 1) * 30000),
      bytesPerSec: Math.floor((100 + timeFactor * 400) * 1024 * 1024 + seededRandom(seed + 2) * 50 * 1024 * 1024),
    })
  }

  return data
}
