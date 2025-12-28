import { NodeData, PodData } from "./types"

// Same instance types as NodePacking
const INSTANCE_TYPES = [
  { type: "m5.large", cpu: 2, mem: 8 },
  { type: "m5.xlarge", cpu: 4, mem: 16 },
  { type: "m5.2xlarge", cpu: 8, mem: 32 },
  { type: "m5.4xlarge", cpu: 16, mem: 64 },
  { type: "r5.2xlarge", cpu: 8, mem: 64 },
  { type: "r5.4xlarge", cpu: 16, mem: 128 },
  { type: "c5.2xlarge", cpu: 8, mem: 16 },
  { type: "c5.4xlarge", cpu: 16, mem: 32 },
]

const COMPONENT_SPECS: Record<string, { cpu: number; mem: number }> = {
  executor: { cpu: 4, mem: 8 },
  planner: { cpu: 2, mem: 4 },
  queue: { cpu: 1, mem: 2 },
  gateway: { cpu: 2, mem: 4 },
  storage: { cpu: 2, mem: 8 },
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

interface NodePoolEntry {
  name: string
  startHour: number
  endHour: number
  cpuCapacity: number
  memCapacityGb: number
  instanceType: string
}

// Same node pool structure as NodePacking
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
    })
  }

  // Lunch peak (12:00-14:00) - 15 nodes
  for (let i = 0; i < 15; i++) {
    const inst = INSTANCE_TYPES[(i + 3) % INSTANCE_TYPES.length]
    pool.push({
      name: `ip-10-0-5-${10 + i}`,
      startHour: 12,
      endHour: 14,
      cpuCapacity: inst.cpu,
      memCapacityGb: inst.mem,
      instanceType: inst.type,
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
    })
  }

  return pool
}

const NODE_POOL = generateNodePool()

function generatePodsForNode(
  nodeCpu: number,
  nodeMem: number,
  nodeIndex: number,
  snapshotIndex: number,
  loadFactor: number
): PodData[] {
  const pods: PodData[] = []
  let usedCpu = 0
  let usedMem = 0

  const seed = nodeIndex * 1000 + snapshotIndex
  const variation = Math.sin(snapshotIndex * 0.15 + nodeIndex * 0.7) * 0.25
  const nodeVariation = (nodeIndex % 7) * 0.05 - 0.15
  const targetUtilization = Math.min(0.95, Math.max(0.15, loadFactor + variation + nodeVariation))

  const targetCpu = nodeCpu * targetUtilization
  const targetMem = nodeMem * targetUtilization * 0.85

  // Components to place - vary by node
  const allComponents = ["executor", "executor", "planner", "queue", "gateway", "storage", "executor"]
  const componentOffset = nodeIndex % 4
  const components = allComponents.slice(componentOffset)

  let podIndex = 0
  for (const component of components) {
    const spec = COMPONENT_SPECS[component]
    if (!spec) continue
    if (usedCpu + spec.cpu > targetCpu) continue
    if (usedMem + spec.mem > targetMem) continue

    const utilizationSeed = seed + podIndex * 100
    const utilization = 0.3 + seededRandom(utilizationSeed) * 0.65

    pods.push({
      name: `${component}-${podIndex}`,
      component,
      cpuRequested: spec.cpu,
      cpuUsed: spec.cpu * utilization,
      memRequestedGb: spec.mem,
      memUsedGb: spec.mem * utilization,
      isEmpty: false,
    })
    usedCpu += spec.cpu
    usedMem += spec.mem
    podIndex++
  }

  // Add unused space as a virtual pod
  const unusedCpu = nodeCpu - usedCpu
  const unusedMem = nodeMem - usedMem
  if (unusedCpu > 0.5) {
    pods.push({
      name: "unused",
      component: "unused",
      cpuRequested: unusedCpu,
      cpuUsed: 0,
      memRequestedGb: unusedMem,
      memUsedGb: 0,
      isEmpty: true,
    })
  }

  return pods
}

export function generateMockNodeData(timestamp: Date): NodeData[] {
  const hour = timestamp.getHours()
  const minute = timestamp.getMinutes()
  const timeOfDay = hour + minute / 60
  const snapshotIndex = Math.floor((hour * 60 + minute) / 15)

  // Get active nodes for this time (same logic as NodePacking)
  const activeNodeDefs = NODE_POOL.filter((n) => {
    if (n.startHour < n.endHour) {
      return timeOfDay >= n.startHour && timeOfDay < n.endHour
    } else {
      return timeOfDay >= n.startHour || timeOfDay < n.endHour
    }
  })

  // Calculate load factor based on time of day (same as NodePacking)
  let loadFactor: number
  if (hour >= 9 && hour <= 17) {
    loadFactor = 0.70 + Math.sin((hour - 9) * Math.PI / 8) * 0.18
  } else if (hour >= 1 && hour <= 5) {
    loadFactor = 0.88
  } else {
    loadFactor = 0.40
  }

  const nodes: NodeData[] = activeNodeDefs.map((nodeDef, i) => ({
    name: nodeDef.name,
    instanceType: nodeDef.instanceType,
    cpuCapacity: nodeDef.cpuCapacity,
    memCapacityGb: nodeDef.memCapacityGb,
    pods: generatePodsForNode(
      nodeDef.cpuCapacity,
      nodeDef.memCapacityGb,
      i,
      snapshotIndex,
      loadFactor
    ),
  }))

  return nodes
}
