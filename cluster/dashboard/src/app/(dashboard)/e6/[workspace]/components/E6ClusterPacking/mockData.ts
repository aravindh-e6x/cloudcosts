import { ComponentSnapshot, TimeSnapshot, WORKSPACE_COMPONENTS, CLUSTER_COMPONENTS } from "./types"

// Component base specs
const COMPONENT_SPECS: Record<string, { cpuBase: number; memBase: number; replicasBase: number }> = {
  // Workspace components
  gateway: { cpuBase: 2, memBase: 4, replicasBase: 2 },
  storage: { cpuBase: 4, memBase: 8, replicasBase: 3 },
  schema: { cpuBase: 1, memBase: 2, replicasBase: 2 },
  // Cluster components
  executor: { cpuBase: 8, memBase: 16, replicasBase: 4 },
  planner: { cpuBase: 4, memBase: 8, replicasBase: 2 },
  queue: { cpuBase: 2, memBase: 4, replicasBase: 2 },
}

// Generate a snapshot for a single timestamp
export function generateClusterSnapshot(
  timestamp: Date,
  e6Clusters: string[]
): TimeSnapshot {
  const hour = timestamp.getHours()
  const minute = timestamp.getMinutes()

  // Use timestamp to generate consistent snapshot index for variation
  const snapshotIndex = Math.floor((hour * 60 + minute) / 15)

  // Calculate load factor based on time of day
  let loadFactor: number
  if (hour >= 9 && hour <= 17) {
    loadFactor = 0.70 + Math.sin((hour - 9) * Math.PI / 8) * 0.20
  } else if (hour >= 1 && hour <= 5) {
    loadFactor = 0.85 // Night batch jobs
  } else {
    loadFactor = 0.35
  }

  // Generate workspace components
  const workspaceComponents: ComponentSnapshot[] = WORKSPACE_COMPONENTS.map((name, i) => {
    const spec = COMPONENT_SPECS[name]
    const variation = Math.sin(snapshotIndex * 0.2 + i * 1.5) * 0.15
    const utilizationPct = Math.min(0.95, Math.max(0.20, loadFactor + variation))

    return {
      name,
      namespace: "workspace",
      replicas: spec.replicasBase,
      cpuRequested: spec.cpuBase * spec.replicasBase,
      cpuAllocated: spec.cpuBase * spec.replicasBase * utilizationPct,
      memRequestedGb: spec.memBase * spec.replicasBase,
      memAllocatedGb: spec.memBase * spec.replicasBase * utilizationPct,
    }
  })

  // Generate per-cluster components
  const clusters: Record<string, ComponentSnapshot[]> = {}

  e6Clusters.forEach((clusterName, clusterIndex) => {
    // Each cluster has different load patterns
    const clusterLoadModifier = (clusterIndex % 3) * 0.1 - 0.1
    const clusterLoad = Math.min(0.95, Math.max(0.20, loadFactor + clusterLoadModifier))

    clusters[clusterName] = CLUSTER_COMPONENTS.map((name, i) => {
      const spec = COMPONENT_SPECS[name]
      const variation = Math.sin(snapshotIndex * 0.15 + i * 0.8 + clusterIndex * 2) * 0.18
      const utilizationPct = Math.min(0.98, Math.max(0.15, clusterLoad + variation))

      // Executor replicas scale with load
      let replicas = spec.replicasBase
      if (name === "executor") {
        if (hour >= 10 && hour <= 16) {
          replicas = Math.floor(spec.replicasBase * (1 + clusterLoad * 0.5))
        }
      }

      return {
        name,
        namespace: clusterName,
        replicas,
        cpuRequested: spec.cpuBase * replicas,
        cpuAllocated: spec.cpuBase * replicas * utilizationPct,
        memRequestedGb: spec.memBase * replicas,
        memAllocatedGb: spec.memBase * replicas * utilizationPct,
      }
    })
  })

  return {
    timestamp: new Date(timestamp),
    workspaceComponents,
    clusters,
  }
}
