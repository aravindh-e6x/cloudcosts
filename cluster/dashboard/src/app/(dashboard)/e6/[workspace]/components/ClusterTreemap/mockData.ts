import { NodeData, PodData } from "./types"

const INSTANCE_TYPES: Record<string, { cpu: number; mem: number }> = {
  "m5.xlarge": { cpu: 4, mem: 16 },
  "m5.2xlarge": { cpu: 8, mem: 32 },
  "m5.4xlarge": { cpu: 16, mem: 64 },
  "r5.2xlarge": { cpu: 8, mem: 64 },
  "r5.4xlarge": { cpu: 16, mem: 128 },
  "c5.2xlarge": { cpu: 8, mem: 16 },
  "c5.4xlarge": { cpu: 16, mem: 32 },
}

const COMPONENT_SPECS: Record<string, { cpu: number; mem: number }> = {
  executor: { cpu: 4, mem: 8 },
  planner: { cpu: 2, mem: 4 },
  queue: { cpu: 1, mem: 2 },
  gateway: { cpu: 2, mem: 4 },
  storage: { cpu: 2, mem: 8 },
  schema: { cpu: 1, mem: 2 },
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generatePodsForNode(
  nodeCapacityCpu: number,
  nodeIndex: number,
  snapshotIndex: number
): PodData[] {
  const pods: PodData[] = []
  let usedCpu = 0

  // Use seeded random for consistency across renders
  const seed = nodeIndex * 1000 + snapshotIndex
  const targetUtilization = 0.5 + seededRandom(seed) * 0.4 // 50-90%
  const targetCpu = nodeCapacityCpu * targetUtilization

  // Components to place - vary by node
  const allComponents = ["executor", "executor", "planner", "queue", "gateway", "storage"]
  const componentOffset = nodeIndex % 3
  const components = allComponents.slice(componentOffset, componentOffset + 4)

  let podIndex = 0
  for (const component of components) {
    const spec = COMPONENT_SPECS[component]
    if (!spec || usedCpu + spec.cpu > targetCpu) continue

    const utilizationSeed = seed + podIndex * 100
    const utilization = 0.3 + seededRandom(utilizationSeed) * 0.65 // 30-95%

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
    podIndex++
  }

  // Add unused space
  const unusedCpu = nodeCapacityCpu - usedCpu
  if (unusedCpu > 0.5) {
    pods.push({
      name: "unused",
      component: "unused",
      cpuRequested: unusedCpu,
      cpuUsed: 0,
      memRequestedGb: 0,
      memUsedGb: 0,
      isEmpty: true,
    })
  }

  return pods
}

export function generateMockNodeData(timestamp: Date): NodeData[] {
  const hour = timestamp.getHours()
  const minute = timestamp.getMinutes()
  const snapshotIndex = Math.floor((hour * 60 + minute) / 15)

  // Number of nodes varies by time
  let nodeCount: number
  if (hour >= 10 && hour <= 16) {
    nodeCount = 15 // Peak hours
  } else if (hour >= 8 && hour <= 20) {
    nodeCount = 10 // Business hours
  } else {
    nodeCount = 5 // Off hours
  }

  const instanceTypeKeys = Object.keys(INSTANCE_TYPES)
  const nodes: NodeData[] = []

  for (let i = 0; i < nodeCount; i++) {
    const instanceType = instanceTypeKeys[i % instanceTypeKeys.length]
    const specs = INSTANCE_TYPES[instanceType]

    nodes.push({
      name: `ip-10-0-${Math.floor(i / 10)}-${10 + (i % 10)}`,
      instanceType,
      cpuCapacity: specs.cpu,
      memCapacityGb: specs.mem,
      pods: generatePodsForNode(specs.cpu, i, snapshotIndex),
    })
  }

  return nodes
}
