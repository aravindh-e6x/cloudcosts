import { NodeSnapshot, TimeSnapshot } from "./types"

// Instance types with their specs
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

interface NodePoolEntry {
  name: string
  startHour: number
  endHour: number
  cpuCapacity: number
  memCapacityGb: number
  instanceType: string
}

// Generate a large node pool (100+ nodes)
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

// Generate a snapshot for a single timestamp
export function generateNodeSnapshot(timestamp: Date): TimeSnapshot {
  const hour = timestamp.getHours()
  const minute = timestamp.getMinutes()
  const timeOfDay = hour + minute / 60

  // Use timestamp to generate consistent snapshot index for variation
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

  const nodes: NodeSnapshot[] = activeNodeDefs.map((nodeDef, i) => {
    // Add variation per node and time - more spread for realistic distribution
    const variation = Math.sin(snapshotIndex * 0.15 + i * 0.7) * 0.25
    const nodeVariation = (i % 7) * 0.05 - 0.15
    const cpuPct = Math.min(0.98, Math.max(0.10, loadFactor + variation + nodeVariation))
    const memPct = Math.min(0.95, Math.max(0.15, loadFactor * 0.85 + variation * 0.6 + nodeVariation * 0.8))

    return {
      node: nodeDef.name,
      cpuAllocated: nodeDef.cpuCapacity * cpuPct,
      cpuCapacity: nodeDef.cpuCapacity,
      memAllocatedGb: nodeDef.memCapacityGb * memPct,
      memCapacityGb: nodeDef.memCapacityGb,
      podCount: Math.floor(3 + cpuPct * nodeDef.cpuCapacity * 1.5),
      instanceType: nodeDef.instanceType,
    }
  })

  return {
    timestamp: new Date(timestamp),
    nodes,
  }
}
