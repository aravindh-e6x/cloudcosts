import {
  CostDrilldownData,
  NodeMetrics,
  E6ClusterMetrics,
  E6ComponentMetrics,
  ComponentMetrics,
  GatewayMetrics,
  ExecutorMetrics,
  QueueMetrics,
  SchemaMetrics,
  StorageMetrics,
  E6ClusterAggregatedMetrics
} from "./types"

const INSTANCE_COSTS: Record<string, number> = {
  "m5.xlarge": 4.60,
  "m5.2xlarge": 9.20,
  "m5.4xlarge": 18.40,
  "r5.2xlarge": 12.10,
  "r5.4xlarge": 22.10,
  "c5.2xlarge": 8.20,
  "c5.4xlarge": 16.40,
}

const INSTANCE_SPECS: Record<string, { cpu: number; mem: number }> = {
  "m5.xlarge": { cpu: 4, mem: 16 },
  "m5.2xlarge": { cpu: 8, mem: 32 },
  "m5.4xlarge": { cpu: 16, mem: 64 },
  "r5.2xlarge": { cpu: 8, mem: 64 },
  "r5.4xlarge": { cpu: 16, mem: 128 },
  "c5.2xlarge": { cpu: 8, mem: 16 },
  "c5.4xlarge": { cpu: 16, mem: 32 },
}

const COMPONENTS = ["executor", "gateway", "queue", "schema", "storage"]
const E6_CLUSTERS = ["e6-prod", "e6-staging", "e6-analytics", "e6-dev"]

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateGatewayMetrics(seed: number, timeFactor: number): GatewayMetrics {
  return {
    activeConnections: Math.floor(10 + seededRandom(seed) * 50 * timeFactor),
    queriesRunning: Math.floor(5 + seededRandom(seed + 1) * 20 * timeFactor),
    queriesQueued: Math.floor(seededRandom(seed + 2) * 10 * timeFactor),
    queriesSucceeded: Math.floor(100 + seededRandom(seed + 3) * 500 * timeFactor),
    queriesFailed: Math.floor(seededRandom(seed + 4) * 5),
    queriesCompleted: Math.floor(100 + seededRandom(seed + 5) * 510 * timeFactor),
  }
}

function generateExecutorMetrics(seed: number, timeFactor: number): ExecutorMetrics {
  const s3Bytes = Math.floor(1024 * 1024 * 100 * (1 + seededRandom(seed) * timeFactor))
  const cacheBytes = Math.floor(1024 * 1024 * 200 * (1 + seededRandom(seed + 1) * timeFactor))
  return {
    activeTasks: Math.floor(5 + seededRandom(seed + 2) * 30 * timeFactor),
    runningTasks: Math.floor(3 + seededRandom(seed + 3) * 20 * timeFactor),
    activeConnections: Math.floor(5 + seededRandom(seed + 4) * 25 * timeFactor),
    allocatedMemoryBytes: Math.floor(1024 * 1024 * 1024 * 4 * (0.5 + seededRandom(seed + 5) * 0.5)),
    usedMemoryBytes: Math.floor(1024 * 1024 * 1024 * 2 * (0.4 + seededRandom(seed + 6) * 0.5)),
    filesReadFromS3Bytes: s3Bytes,
    filesReadFromCacheBytes: cacheBytes,
    rowsRead: Math.floor(10000 + seededRandom(seed + 7) * 100000 * timeFactor),
    spilledBytesWritten: Math.floor(1024 * 1024 * seededRandom(seed + 8) * 50),
    diskCacheHitBytes: Math.floor(cacheBytes * 0.7),
    diskCacheMissBytes: Math.floor(cacheBytes * 0.3),
  }
}

function generateQueueMetrics(seed: number, timeFactor: number): QueueMetrics {
  const activeTasks = Math.floor(10 + seededRandom(seed) * 40 * timeFactor)
  return {
    activeRequests: Math.floor(5 + seededRandom(seed + 1) * 20 * timeFactor),
    activeTasks,
    activeSplits: activeTasks * 2,
    tasksRunning: Math.floor(activeTasks * 0.6),
    requestsSucceeded: Math.floor(50 + seededRandom(seed + 2) * 200 * timeFactor),
    requestsFailed: Math.floor(seededRandom(seed + 3) * 3),
  }
}

function generateSchemaMetrics(seed: number, timeFactor: number): SchemaMetrics {
  return {
    tableListingQueued: Math.floor(seededRandom(seed) * 5 * timeFactor),
    tableListingInProgress: Math.floor(seededRandom(seed + 1) * 3 * timeFactor),
    metadataQueued: Math.floor(seededRandom(seed + 2) * 10 * timeFactor),
    metadataInProgress: Math.floor(seededRandom(seed + 3) * 5 * timeFactor),
    thriftQueued: Math.floor(seededRandom(seed + 4) * 8 * timeFactor),
    thriftInProgress: Math.floor(seededRandom(seed + 5) * 4 * timeFactor),
  }
}

function generateStorageMetrics(seed: number, timeFactor: number): StorageMetrics {
  return {
    cacheSize: Math.floor(1024 * 1024 * 500 * (1 + seededRandom(seed) * timeFactor)),
    thriftQueued: Math.floor(seededRandom(seed + 1) * 10 * timeFactor),
    thriftInProgress: Math.floor(seededRandom(seed + 2) * 5 * timeFactor),
    metadataRequestsInProgress: Math.floor(seededRandom(seed + 3) * 8 * timeFactor),
    partitionRequestsInProgress: Math.floor(seededRandom(seed + 4) * 6 * timeFactor),
  }
}

function generateComponentMetrics(component: string, seed: number, timeFactor: number): ComponentMetrics {
  switch (component) {
    case "gateway":
      return { type: "gateway", data: generateGatewayMetrics(seed, timeFactor) }
    case "executor":
      return { type: "executor", data: generateExecutorMetrics(seed, timeFactor) }
    case "queue":
      return { type: "queue", data: generateQueueMetrics(seed, timeFactor) }
    case "schema":
      return { type: "schema", data: generateSchemaMetrics(seed, timeFactor) }
    case "storage":
      return { type: "storage", data: generateStorageMetrics(seed, timeFactor) }
    default:
      return { type: "executor", data: generateExecutorMetrics(seed, timeFactor) }
  }
}

export function generateCostDrilldownData(timestamp: Date): CostDrilldownData {
  const hour = timestamp.getHours()
  const snapshotIndex = Math.floor((hour * 60 + timestamp.getMinutes()) / 15)

  // Time factor for workload simulation (higher during business hours)
  const timeFactor = hour >= 9 && hour <= 18 ? 1.5 : hour >= 6 && hour <= 21 ? 1.0 : 0.5

  // Generate nodes
  const instanceTypes = Object.keys(INSTANCE_SPECS)
  const nodeCount = hour >= 10 && hour <= 16 ? 12 : hour >= 8 && hour <= 20 ? 8 : 5

  const nodes: NodeMetrics[] = []
  let totalCost = 0

  for (let i = 0; i < nodeCount; i++) {
    const instanceType = instanceTypes[i % instanceTypes.length]
    const specs = INSTANCE_SPECS[instanceType]
    const cost = INSTANCE_COSTS[instanceType]
    totalCost += cost

    const seed = snapshotIndex * 1000 + i
    const allocationPct = 0.4 + seededRandom(seed) * 0.5 // 40-90%

    const cpuAllocated = specs.cpu * allocationPct
    const memAllocated = specs.mem * allocationPct

    // Generate pods for this node
    const podCount = Math.floor(2 + seededRandom(seed + 1) * 4) // 2-5 pods
    const pods = []
    let remainingCpu = cpuAllocated
    let remainingMem = memAllocated

    for (let p = 0; p < podCount && remainingCpu > 0.5; p++) {
      const component = COMPONENTS[(i + p) % COMPONENTS.length]
      const podSeed = seed + p * 100

      const cpuReq = Math.min(remainingCpu, 1 + seededRandom(podSeed) * 3) // 1-4 CPU
      const memReq = Math.min(remainingMem, 2 + seededRandom(podSeed + 1) * 6) // 2-8 GB
      const utilization = 0.3 + seededRandom(podSeed + 2) * 0.6 // 30-90%

      pods.push({
        name: `${component}-${i}-${p}`,
        component,
        cpuRequested: Math.round(cpuReq * 10) / 10,
        cpuUsed: Math.round(cpuReq * utilization * 10) / 10,
        memRequestedGb: Math.round(memReq * 10) / 10,
        memUsedGb: Math.round(memReq * utilization * 10) / 10,
      })

      remainingCpu -= cpuReq
      remainingMem -= memReq
    }

    nodes.push({
      name: `node-${Math.floor(i / 10)}-${10 + (i % 10)}`,
      instanceType,
      costPerDay: cost,
      cpuCapacity: specs.cpu,
      cpuAllocated: Math.round(cpuAllocated * 10) / 10,
      memCapacityGb: specs.mem,
      memAllocatedGb: Math.round(memAllocated * 10) / 10,
      pods,
    })
  }

  // Generate E6 clusters with component-specific metrics
  const e6Clusters: E6ClusterMetrics[] = []
  const clusterCount = hour >= 9 && hour <= 18 ? 4 : 2

  for (let c = 0; c < clusterCount; c++) {
    const clusterName = E6_CLUSTERS[c]
    const clusterSeed = snapshotIndex * 100 + c

    // Cost distribution: prod gets ~60%, staging ~25%, others split rest
    const costShare = c === 0 ? 0.58 : c === 1 ? 0.24 : c === 2 ? 0.12 : 0.06
    const clusterCost = Math.round(totalCost * costShare * 100) / 100

    const components: E6ComponentMetrics[] = COMPONENTS.map((comp, idx) => {
      const compSeed = clusterSeed + idx * 10
      const podCount = comp === "executor" ? Math.floor(2 + seededRandom(compSeed) * 6) :
                       comp === "storage" ? Math.floor(2 + seededRandom(compSeed) * 2) :
                       Math.floor(1 + seededRandom(compSeed) * 2)

      const cpuPerPod = comp === "executor" ? 4 : comp === "gateway" ? 2 : comp === "storage" ? 2 : 1
      const memPerPod = comp === "executor" ? 8 : comp === "storage" ? 8 : comp === "gateway" ? 4 : 2

      const cpuRequested = podCount * cpuPerPod
      const memRequested = podCount * memPerPod
      const utilization = 0.4 + seededRandom(compSeed + 5) * 0.5 // 40-90%

      return {
        component: comp,
        podCount,
        cpuRequested,
        cpuUsed: Math.round(cpuRequested * utilization * 10) / 10,
        memRequestedGb: memRequested,
        memUsedGb: Math.round(memRequested * utilization * 10) / 10,
        componentMetrics: generateComponentMetrics(comp, compSeed + 100, timeFactor),
      }
    })

    // Aggregate cluster-level metrics from components
    const gatewayComp = components.find(c => c.component === "gateway")
    const executorComp = components.find(c => c.component === "executor")
    const queueComp = components.find(c => c.component === "queue")

    const gatewayMetrics = gatewayComp?.componentMetrics.type === "gateway" ? gatewayComp.componentMetrics.data : null
    const executorMetrics = executorComp?.componentMetrics.type === "executor" ? executorComp.componentMetrics.data : null
    const queueMetrics = queueComp?.componentMetrics.type === "queue" ? queueComp.componentMetrics.data : null

    const totalS3 = executorMetrics?.filesReadFromS3Bytes || 0
    const totalCache = executorMetrics?.filesReadFromCacheBytes || 0

    const clusterMetrics: E6ClusterAggregatedMetrics = {
      totalQueriesRunning: gatewayMetrics?.queriesRunning || 0,
      totalQueriesQueued: gatewayMetrics?.queriesQueued || 0,
      totalActiveTasks: executorMetrics?.activeTasks || 0,
      totalBytesReadS3: totalS3,
      totalBytesReadCache: totalCache,
      cacheHitRate: totalS3 + totalCache > 0 ? Math.round((totalCache / (totalS3 + totalCache)) * 100) : 0,
      totalActiveRequests: queueMetrics?.activeRequests || 0,
    }

    e6Clusters.push({
      name: clusterName,
      costPerDay: clusterCost,
      components,
      clusterMetrics,
    })
  }

  return {
    totalCostPerDay: Math.round(totalCost * 100) / 100,
    nodes,
    e6Clusters,
  }
}
