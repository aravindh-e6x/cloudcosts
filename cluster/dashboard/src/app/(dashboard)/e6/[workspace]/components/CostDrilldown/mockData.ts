import { CostDrilldownData, NodeMetrics, E6ClusterMetrics } from "./types"

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

const COMPONENTS = ["executor", "planner", "queue", "gateway", "storage", "schema"]
const E6_CLUSTERS = ["e6-prod", "e6-staging", "e6-analytics", "e6-dev"]

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function generateCostDrilldownData(timestamp: Date): CostDrilldownData {
  const hour = timestamp.getHours()
  const snapshotIndex = Math.floor((hour * 60 + timestamp.getMinutes()) / 15)

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

  // Generate E6 clusters by aggregating components
  const e6Clusters: E6ClusterMetrics[] = []
  const clusterCount = hour >= 9 && hour <= 18 ? 4 : 2

  for (let c = 0; c < clusterCount; c++) {
    const clusterName = E6_CLUSTERS[c]
    const clusterSeed = snapshotIndex * 100 + c

    // Cost distribution: prod gets ~60%, staging ~25%, others split rest
    const costShare = c === 0 ? 0.58 : c === 1 ? 0.24 : c === 2 ? 0.12 : 0.06
    const clusterCost = Math.round(totalCost * costShare * 100) / 100

    const components = COMPONENTS.map((comp, idx) => {
      const compSeed = clusterSeed + idx * 10
      const podCount = comp === "executor" ? Math.floor(2 + seededRandom(compSeed) * 6) :
                       comp === "storage" ? Math.floor(2 + seededRandom(compSeed) * 2) :
                       Math.floor(1 + seededRandom(compSeed) * 2)

      const cpuPerPod = comp === "executor" ? 4 : comp === "planner" ? 2 : comp === "storage" ? 2 : 1
      const memPerPod = comp === "executor" ? 8 : comp === "storage" ? 8 : comp === "planner" ? 4 : 2

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
      }
    })

    e6Clusters.push({
      name: clusterName,
      costPerDay: clusterCost,
      components,
    })
  }

  return {
    totalCostPerDay: Math.round(totalCost * 100) / 100,
    nodes,
    e6Clusters,
  }
}
