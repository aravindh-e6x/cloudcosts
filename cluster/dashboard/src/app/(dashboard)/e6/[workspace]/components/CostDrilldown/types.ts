export interface PodMetrics {
  name: string
  component: string
  cpuRequested: number
  cpuUsed: number
  memRequestedGb: number
  memUsedGb: number
}

export interface NodeMetrics {
  name: string
  instanceType: string
  costPerDay: number
  cpuCapacity: number
  cpuAllocated: number
  memCapacityGb: number
  memAllocatedGb: number
  pods: PodMetrics[]
}

export interface E6ComponentMetrics {
  component: string
  podCount: number
  cpuRequested: number
  cpuUsed: number
  memRequestedGb: number
  memUsedGb: number
}

export interface E6ClusterMetrics {
  name: string
  costPerDay: number
  components: E6ComponentMetrics[]
}

export interface CostDrilldownData {
  totalCostPerDay: number
  nodes: NodeMetrics[]
  e6Clusters: E6ClusterMetrics[]
}
