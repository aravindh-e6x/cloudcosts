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

// Gateway component metrics (io_e6x_e6gateway_*)
export interface GatewayMetrics {
  activeConnections: number          // io_e6x_e6gateway_currentactiveconnections
  queriesRunning: number             // io_e6x_e6gateway_currentqueriesrunningcount
  queriesQueued: number              // io_e6x_e6gateway_currentqueriesqueuedcount
  queriesSucceeded: number           // io_e6x_e6gateway_numsucceededqueries
  queriesFailed: number              // io_e6x_e6gateway_totalqueriesfailedcount
  queriesCompleted: number           // io_e6x_e6gateway_totalqueriescompletedcount
}

// Executor/Engine component metrics (io_e6x_e6engine_*)
export interface ExecutorMetrics {
  activeTasks: number                // io_e6x_e6engine_currentactivetasks
  runningTasks: number               // io_e6x_e6engine_currentactivetasksrunning
  activeConnections: number          // io_e6x_e6engine_currentactivee6connections
  allocatedMemoryBytes: number       // io_e6x_e6engine_currentexecutorallocatedmemorybytes
  usedMemoryBytes: number            // io_e6x_e6engine_currentexecutorusedmemorybytes
  filesReadFromS3Bytes: number       // io_e6x_e6engine_filesreadfroms3bytes
  filesReadFromCacheBytes: number    // io_e6x_e6engine_filesreadfromcachebytes
  rowsRead: number                   // io_e6x_e6engine_numrowsread
  spilledBytesWritten: number        // io_e6x_e6engine_numspilledbyteswritten
  diskCacheHitBytes: number          // io_e6x_e6engine_diskcachegethitbytes
  diskCacheMissBytes: number         // io_e6x_e6engine_diskcachegetmissbytes
}

// Queue component metrics (io_e6x_e6queue_*)
export interface QueueMetrics {
  activeRequests: number             // io_e6x_e6queue_currentactiverequests
  activeTasks: number                // io_e6x_e6queue_currentactivetasks
  activeSplits: number               // io_e6x_e6queue_currentactivesplits
  tasksRunning: number               // io_e6x_e6queue_currentactivetasksrunning
  requestsSucceeded: number          // io_e6x_e6queue_nume6requestssucceeded
  requestsFailed: number             // io_e6x_e6queue_nume6requestsfailed
}

// Schema component metrics (io_e6x_e6schema_*)
export interface SchemaMetrics {
  tableListingQueued: number         // io_e6x_e6schema_numtablelistingtasksqueued
  tableListingInProgress: number     // io_e6x_e6schema_numtablelistingtasksinprogress
  metadataQueued: number             // io_e6x_e6schema_numtablemetadatareadtasksqueued
  metadataInProgress: number         // io_e6x_e6schema_numtablemetadatareadtasksinprogress
  thriftQueued: number               // io_e6x_e6schema_numthriftrequestsqueued
  thriftInProgress: number           // io_e6x_e6schema_numthriftrequestsinprogress
}

// Storage component metrics (io_e6x_e6storage_*)
export interface StorageMetrics {
  cacheSize: number                  // io_e6x_e6storage_filemetadatacachesize
  thriftQueued: number               // io_e6x_e6storage_numthriftrequestsqueued
  thriftInProgress: number           // io_e6x_e6storage_numthriftrequestsinprogress
  metadataRequestsInProgress: number // io_e6x_e6storage_tablemetadatarequestsinprogress
  partitionRequestsInProgress: number // io_e6x_e6storage_tablepartitionsrequestsinprogress
}

// Component-specific metrics union
export type ComponentMetrics =
  | { type: "gateway"; data: GatewayMetrics }
  | { type: "executor"; data: ExecutorMetrics }
  | { type: "queue"; data: QueueMetrics }
  | { type: "schema"; data: SchemaMetrics }
  | { type: "storage"; data: StorageMetrics }

// E6-specific metrics per component
export interface E6ComponentMetrics {
  component: string
  podCount: number
  cpuRequested: number
  cpuUsed: number
  memRequestedGb: number
  memUsedGb: number
  // Component-specific metrics from mock project
  componentMetrics: ComponentMetrics
}

// Cluster-level aggregated metrics (derived from component metrics)
export interface E6ClusterAggregatedMetrics {
  // From gateway
  totalQueriesRunning: number
  totalQueriesQueued: number
  // From executor
  totalActiveTasks: number
  totalBytesReadS3: number
  totalBytesReadCache: number
  cacheHitRate: number
  // From queue
  totalActiveRequests: number
}

export interface E6ClusterMetrics {
  name: string
  costPerDay: number
  components: E6ComponentMetrics[]
  clusterMetrics: E6ClusterAggregatedMetrics
}

export interface CostDrilldownData {
  totalCostPerDay: number
  nodes: NodeMetrics[]
  e6Clusters: E6ClusterMetrics[]
}
