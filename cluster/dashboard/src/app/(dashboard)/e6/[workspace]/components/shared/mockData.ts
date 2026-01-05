import {
  WorkspaceSnapshot,
  NodeSnapshot,
  PodSnapshot,
  E6ClusterSnapshot,
  E6ComponentMetrics,
  ExpectedConfig,
} from "./types"

// Seeded random for consistency
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Instance types with costs
const INSTANCE_TYPES = [
  { type: "m5.large", cpu: 2, mem: 8, costPerHour: 0.096 },
  { type: "m5.xlarge", cpu: 4, mem: 16, costPerHour: 0.192 },
  { type: "m5.2xlarge", cpu: 8, mem: 32, costPerHour: 0.384 },
  { type: "m5.4xlarge", cpu: 16, mem: 64, costPerHour: 0.768 },
  { type: "r5.2xlarge", cpu: 8, mem: 64, costPerHour: 0.504 },
  { type: "r5.4xlarge", cpu: 16, mem: 128, costPerHour: 1.008 },
  { type: "c5.2xlarge", cpu: 8, mem: 16, costPerHour: 0.34 },
  { type: "c5.4xlarge", cpu: 16, mem: 32, costPerHour: 0.68 },
]

// E6 cluster names
const E6_CLUSTERS = ["analytics", "reporting", "ml-training"]

// Expected configs per component
const EXPECTED_CONFIGS: Record<string, ExpectedConfig> = {
  gateway: { podCount: 2, cpuPerPod: 2, memoryPerPodGb: 4, instanceType: "m5.large" },
  queue: { podCount: 1, cpuPerPod: 4, memoryPerPodGb: 8, instanceType: "m5.xlarge" },
  executor: { podCount: 4, cpuPerPod: 8, memoryPerPodGb: 32, instanceType: "r5.2xlarge" },
  schema: { podCount: 1, cpuPerPod: 2, memoryPerPodGb: 4, instanceType: "m5.large" },
  storage: { podCount: 2, cpuPerPod: 2, memoryPerPodGb: 8, instanceType: "m5.large" },
}

// Component specs for pod generation
const COMPONENT_SPECS: Record<string, { cpu: number; mem: number }> = {
  executor: { cpu: 8, mem: 32 },
  gateway: { cpu: 2, mem: 4 },
  queue: { cpu: 4, mem: 8 },
  schema: { cpu: 2, mem: 4 },
  storage: { cpu: 2, mem: 8 },
}

interface NodePoolEntry {
  name: string
  startHour: number
  endHour: number
  cpuCapacity: number
  memCapacityGb: number
  instanceType: string
  costPerHour: number
}

// Generate node pool (same for all snapshots)
function generateNodePool(): NodePoolEntry[] {
  const pool: NodePoolEntry[] = []

  // Core nodes - always running (30 nodes)
  for (let i = 0; i < 30; i++) {
    const inst = INSTANCE_TYPES[i % INSTANCE_TYPES.length]
    pool.push({
      name: `ip-10-0-1-${10 + i}`,
      startHour: 0,
      endHour: 24,
      cpuCapacity: inst.cpu,
      memCapacityGb: inst.mem,
      instanceType: inst.type,
      costPerHour: inst.costPerHour,
    })
  }

  // Morning scale-up (8:00-20:00) - 40 nodes
  for (let i = 0; i < 40; i++) {
    const inst = INSTANCE_TYPES[(i + 2) % INSTANCE_TYPES.length]
    pool.push({
      name: `ip-10-0-2-${10 + i}`,
      startHour: 8,
      endHour: 20,
      cpuCapacity: inst.cpu,
      memCapacityGb: inst.mem,
      instanceType: inst.type,
      costPerHour: inst.costPerHour,
    })
  }

  // Peak hours burst (10:00-16:00) - 30 nodes
  for (let i = 0; i < 30; i++) {
    const inst = INSTANCE_TYPES[(i + 4) % INSTANCE_TYPES.length]
    pool.push({
      name: `ip-10-0-3-${10 + i}`,
      startHour: 10,
      endHour: 16,
      cpuCapacity: inst.cpu,
      memCapacityGb: inst.mem,
      instanceType: inst.type,
      costPerHour: inst.costPerHour,
    })
  }

  // Mid-day peak (11:00-15:00) - 20 nodes
  for (let i = 0; i < 20; i++) {
    const inst = INSTANCE_TYPES[(i + 1) % INSTANCE_TYPES.length]
    pool.push({
      name: `ip-10-0-4-${10 + i}`,
      startHour: 11,
      endHour: 15,
      cpuCapacity: inst.cpu,
      memCapacityGb: inst.mem,
      instanceType: inst.type,
      costPerHour: inst.costPerHour,
    })
  }

  // Late afternoon (14:00-22:00) - 25 nodes
  for (let i = 0; i < 25; i++) {
    const inst = INSTANCE_TYPES[(i + 5) % INSTANCE_TYPES.length]
    pool.push({
      name: `ip-10-0-6-${10 + i}`,
      startHour: 14,
      endHour: 22,
      cpuCapacity: inst.cpu,
      memCapacityGb: inst.mem,
      instanceType: inst.type,
      costPerHour: inst.costPerHour,
    })
  }

  // Night batch (1:00-5:00) - 10 large nodes
  for (let i = 0; i < 10; i++) {
    pool.push({
      name: `ip-10-0-7-${10 + i}`,
      startHour: 1,
      endHour: 5,
      cpuCapacity: 32,
      memCapacityGb: 128,
      instanceType: "r5.8xlarge",
      costPerHour: 2.016,
    })
  }

  return pool
}

const NODE_POOL = generateNodePool()

// Generate pods for a node
function generatePodsForNode(
  nodeDef: NodePoolEntry,
  nodeIndex: number,
  snapshotIndex: number,
  loadFactor: number
): PodSnapshot[] {
  const pods: PodSnapshot[] = []
  let usedCpu = 0
  let usedMem = 0

  const seed = nodeIndex * 1000 + snapshotIndex
  const variation = Math.sin(snapshotIndex * 0.15 + nodeIndex * 0.7) * 0.25
  const nodeVariation = (nodeIndex % 7) * 0.05 - 0.15
  const targetUtilization = Math.min(0.95, Math.max(0.15, loadFactor + variation + nodeVariation))

  const targetCpu = nodeDef.cpuCapacity * targetUtilization
  const targetMem = nodeDef.memCapacityGb * targetUtilization * 0.85

  // Assign pods to E6 clusters
  const clusterIndex = nodeIndex % E6_CLUSTERS.length
  const namespace = E6_CLUSTERS[clusterIndex]

  // Components to place on this node - vary by node
  const allComponents = ["executor", "gateway", "queue", "schema", "storage", "executor", "executor"]
  const componentOffset = nodeIndex % 5
  const components = allComponents.slice(componentOffset)

  let podIndex = 0
  for (const component of components) {
    const spec = COMPONENT_SPECS[component]
    if (!spec) continue
    if (usedCpu + spec.cpu > targetCpu) continue
    if (usedMem + spec.mem > targetMem) continue

    const utilizationSeed = seed + podIndex * 100
    const utilization = 0.4 + seededRandom(utilizationSeed) * 0.55

    pods.push({
      name: `${component}-${nodeIndex}-${podIndex}`,
      component,
      namespace,
      cpuRequested: spec.cpu,
      cpuUsed: spec.cpu * utilization,
      memRequestedGb: spec.mem,
      memUsedGb: spec.mem * utilization,
    })
    usedCpu += spec.cpu
    usedMem += spec.mem
    podIndex++
  }

  return pods
}

// Build E6 cluster metrics from pods
function buildE6ClusterMetrics(
  clusterName: string,
  allNodes: NodeSnapshot[],
  snapshotIndex: number
): E6ClusterSnapshot {
  // Collect all pods for this cluster
  const clusterPods: { pod: PodSnapshot; node: NodeSnapshot }[] = []
  for (const node of allNodes) {
    for (const pod of node.pods) {
      if (pod.namespace === clusterName) {
        clusterPods.push({ pod, node })
      }
    }
  }

  // Group by component
  const componentGroups: Record<string, { pod: PodSnapshot; node: NodeSnapshot }[]> = {
    gateway: [],
    queue: [],
    executor: [],
    schema: [],
    storage: [],
  }

  for (const { pod, node } of clusterPods) {
    if (componentGroups[pod.component]) {
      componentGroups[pod.component].push({ pod, node })
    }
  }

  // Build metrics for each component
  function buildComponentMetrics(component: string): E6ComponentMetrics {
    const pods = componentGroups[component] || []
    const instances = pods.map(({ pod, node }) => ({
      pod: pod.name,
      node: node.name,
      nodeInstanceType: node.instanceType,
      nodeCpuCapacity: node.cpuCapacity,
      nodeMemCapacityGb: node.memCapacityGb,
      cpuRequested: pod.cpuRequested,
      cpuUsed: pod.cpuUsed,
      memRequestedGb: pod.memRequestedGb,
      memUsedGb: pod.memUsedGb,
      costPerHour: (pod.cpuRequested / node.cpuCapacity) * node.costPerHour,
    }))

    return {
      component,
      expectedConfig: EXPECTED_CONFIGS[component],
      instances,
      totalCpuRequested: instances.reduce((sum, i) => sum + i.cpuRequested, 0),
      totalCpuUsed: instances.reduce((sum, i) => sum + i.cpuUsed, 0),
      totalMemRequestedGb: instances.reduce((sum, i) => sum + i.memRequestedGb, 0),
      totalMemUsedGb: instances.reduce((sum, i) => sum + i.memUsedGb, 0),
      totalCostPerHour: instances.reduce((sum, i) => sum + i.costPerHour, 0),
    }
  }

  const gateway = buildComponentMetrics("gateway")
  const queue = buildComponentMetrics("queue")
  const executor = buildComponentMetrics("executor")
  const schema = buildComponentMetrics("schema")
  const storage = buildComponentMetrics("storage")

  // Simulate query metrics based on time
  const seed = snapshotIndex + clusterName.length * 100
  const loadFactor = 0.5 + seededRandom(seed) * 0.4

  return {
    name: clusterName,
    gateway,
    queue,
    executor,
    schema,
    storage,
    queriesRunning: Math.floor(5 + loadFactor * 25 + seededRandom(seed + 1) * 10),
    queriesQueued: Math.floor(loadFactor * 8 + seededRandom(seed + 2) * 5),
    queriesSucceeded: Math.floor(100 + loadFactor * 400 + seededRandom(seed + 3) * 50),
    queriesFailed: Math.floor(seededRandom(seed + 4) * 5),
    totalCostPerHour: gateway.totalCostPerHour + queue.totalCostPerHour +
      executor.totalCostPerHour + schema.totalCostPerHour + storage.totalCostPerHour,
    totalPods: gateway.instances.length + queue.instances.length +
      executor.instances.length + schema.instances.length + storage.instances.length,
  }
}

// Generate complete workspace snapshot
export function generateWorkspaceSnapshot(timestamp: Date): WorkspaceSnapshot {
  const hour = timestamp.getHours()
  const minute = timestamp.getMinutes()
  const timeOfDay = hour + minute / 60
  const snapshotIndex = Math.floor((hour * 60 + minute) / 15)

  // Get active nodes for this time
  const activeNodeDefs = NODE_POOL.filter((n) => {
    if (n.startHour < n.endHour) {
      return timeOfDay >= n.startHour && timeOfDay < n.endHour
    } else {
      return timeOfDay >= n.startHour || timeOfDay < n.endHour
    }
  })

  // Calculate load factor based on time of day
  let loadFactor: number
  if (hour >= 9 && hour <= 17) {
    loadFactor = 0.70 + Math.sin((hour - 9) * Math.PI / 8) * 0.18
  } else if (hour >= 1 && hour <= 5) {
    loadFactor = 0.88
  } else {
    loadFactor = 0.40
  }

  // Generate nodes with pods
  const nodes: NodeSnapshot[] = activeNodeDefs.map((nodeDef, i) => ({
    name: nodeDef.name,
    instanceType: nodeDef.instanceType,
    cpuCapacity: nodeDef.cpuCapacity,
    memCapacityGb: nodeDef.memCapacityGb,
    costPerHour: nodeDef.costPerHour,
    pods: generatePodsForNode(nodeDef, i, snapshotIndex, loadFactor),
  }))

  // Build E6 cluster snapshots
  const e6Clusters = E6_CLUSTERS.map((name) =>
    buildE6ClusterMetrics(name, nodes, snapshotIndex)
  )

  // Calculate aggregates
  let totalCpuCapacity = 0
  let totalCpuUsed = 0
  let totalMemCapacity = 0
  let totalMemUsed = 0
  let totalCost = 0
  let totalPods = 0

  for (const node of nodes) {
    totalCpuCapacity += node.cpuCapacity
    totalMemCapacity += node.memCapacityGb
    totalCost += node.costPerHour
    for (const pod of node.pods) {
      totalCpuUsed += pod.cpuUsed
      totalMemUsed += pod.memUsedGb
      totalPods++
    }
  }

  return {
    timestamp,
    nodes,
    e6Clusters,
    totalNodes: nodes.length,
    totalPods,
    totalCpuCapacity,
    totalCpuUsed,
    totalMemCapacityGb: totalMemCapacity,
    totalMemUsedGb: totalMemUsed,
    totalCostPerHour: totalCost,
  }
}

export { E6_CLUSTERS }
