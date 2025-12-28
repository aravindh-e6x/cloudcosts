export interface PodData {
  name: string
  component: string
  cpuRequested: number
  cpuUsed: number
  memRequestedGb: number
  memUsedGb: number
  isEmpty?: boolean
}

export interface NodeData {
  name: string
  instanceType: string
  cpuCapacity: number
  memCapacityGb: number
  pods: PodData[]
}
