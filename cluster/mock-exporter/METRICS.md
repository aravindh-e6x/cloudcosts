# CloudCosts Metrics Reference

Complete reference of all metrics available for cost attribution and monitoring.

---

## Part 1: E6 Metrics (from Grafana/Mimir)

E6 metrics are pulled from customer-specific Grafana datasources and written to GreptimeDB.

### E6 Container Metrics (`e6data_container_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `container`, `component`, `node`, `id`, `image`, `name`

| Metric | Description |
|--------|-------------|
| `e6data_container_cpu_cfs_periods_total` | Total CFS periods |
| `e6data_container_cpu_cfs_throttled_periods_total` | Throttled CFS periods |
| `e6data_container_cpu_cfs_throttled_seconds_total` | Throttled seconds |
| `e6data_container_cpu_system_seconds_total` | System CPU seconds |
| `e6data_container_cpu_usage_seconds_total` | Total CPU usage seconds | ✅ |
| `e6data_container_cpu_user_seconds_total` | User CPU seconds |
| `e6data_container_file_descriptors` | Open file descriptors |
| `e6data_container_fs_inodes_free` | Free inodes |
| `e6data_container_fs_inodes_total` | Total inodes |
| `e6data_container_fs_io_current` | Current I/O operations |
| `e6data_container_fs_io_time_seconds_total` | I/O time |
| `e6data_container_fs_io_time_weighted_seconds_total` | Weighted I/O time |
| `e6data_container_fs_limit_bytes` | Filesystem limit |
| `e6data_container_fs_read_seconds_total` | Read seconds |
| `e6data_container_fs_reads_bytes_total` | Bytes read |
| `e6data_container_fs_reads_merged_total` | Merged reads |
| `e6data_container_fs_reads_total` | Total reads |
| `e6data_container_fs_sector_reads_total` | Sector reads |
| `e6data_container_fs_sector_writes_total` | Sector writes |
| `e6data_container_fs_usage_bytes` | Filesystem usage |
| `e6data_container_fs_write_seconds_total` | Write seconds |
| `e6data_container_fs_writes_bytes_total` | Bytes written |
| `e6data_container_fs_writes_merged_total` | Merged writes |
| `e6data_container_fs_writes_total` | Total writes |
| `e6data_container_last_seen` | Last seen timestamp |
| `e6data_container_memory_cache` | Memory cache |
| `e6data_container_memory_failcnt` | Memory fail count |
| `e6data_container_memory_failures_total` | Memory failures |
| `e6data_container_memory_mapped_file` | Mapped file memory |
| `e6data_container_memory_max_usage_bytes` | Max memory usage |
| `e6data_container_memory_rss` | RSS memory |
| `e6data_container_memory_swap` | Swap memory |
| `e6data_container_memory_usage_bytes` | Memory usage |
| `e6data_container_memory_working_set_bytes` | Working set memory | ✅ |
| `e6data_container_network_receive_bytes_total` | Network bytes received | ✅ |
| `e6data_container_network_receive_errors_total` | Network receive errors |
| `e6data_container_network_receive_packets_dropped_total` | Dropped receive packets |
| `e6data_container_network_receive_packets_total` | Received packets |
| `e6data_container_network_transmit_bytes_total` | Network bytes transmitted | ✅ |
| `e6data_container_network_transmit_errors_total` | Network transmit errors |
| `e6data_container_network_transmit_packets_dropped_total` | Dropped transmit packets |
| `e6data_container_network_transmit_packets_total` | Transmitted packets |
| `e6data_container_oom_events_total` | OOM events |
| `e6data_container_processes` | Running processes |
| `e6data_container_sockets` | Open sockets |
| `e6data_container_spec_cpu_period` | CPU period spec |
| `e6data_container_spec_cpu_quota` | CPU quota spec | ✅ |
| `e6data_container_spec_cpu_shares` | CPU shares spec |
| `e6data_container_spec_memory_limit_bytes` | Memory limit spec | ✅ |
| `e6data_container_spec_memory_reservation_limit_bytes` | Memory reservation |
| `e6data_container_spec_memory_swap_limit_bytes` | Swap limit spec |
| `e6data_container_start_time_seconds` | Container start time |
| `e6data_container_tasks_state` | Task state |
| `e6data_container_threads` | Thread count |
| `e6data_container_threads_max` | Max threads |
| `e6data_container_ulimits_soft` | Soft ulimits |

### E6 Engine Metrics (`io_e6x_E6Engine_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`, `e6uuid`

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Engine_AvgFileSizeInBytes` | Average file size |
| `io_e6x_E6Engine_ColumnSplitFilesReadFromCacheBytes` | Cache read bytes (column split) |
| `io_e6x_E6Engine_ColumnSplitFilesReadFromS3Bytes` | S3 read bytes (column split) |
| `io_e6x_E6Engine_ColumnSplitFilesReadFromS3Compressed` | Compressed S3 reads |
| `io_e6x_E6Engine_CumulativeNumberOfProducerNodesClosed` | Producer nodes closed |
| `io_e6x_E6Engine_CumulativeNumberOfProducerNodesCreated` | Producer nodes created |
| `io_e6x_E6Engine_CumulativeNumberOfProducerNodesException` | Producer node exceptions |
| `io_e6x_E6Engine_CumulativeTimeTakenToCloseProducerNodes` | Time to close producers |
| `io_e6x_E6Engine_CurrentActiveE6Connections` | Active connections |
| `io_e6x_E6Engine_CurrentActiveTasks` | Active tasks | ✅ |
| `io_e6x_E6Engine_CurrentActiveTasksAborted` | Aborted tasks |
| `io_e6x_E6Engine_CurrentActiveTasksCancelled` | Cancelled tasks |
| `io_e6x_E6Engine_CurrentActiveTasksFailed` | Failed tasks |
| `io_e6x_E6Engine_CurrentActiveTasksNew` | New tasks |
| `io_e6x_E6Engine_CurrentActiveTasksRunning` | Running tasks | ✅ |
| `io_e6x_E6Engine_CurrentActiveTasksSucceeded` | Succeeded tasks |
| `io_e6x_E6Engine_CurrentDynamicRssBytes` | Dynamic RSS bytes |
| `io_e6x_E6Engine_CurrentExecutorAllocatedMemoryBytes` | Executor allocated memory | ✅ |
| `io_e6x_E6Engine_CurrentExecutorOccupiedMemoryBytes` | Executor occupied memory |
| `io_e6x_E6Engine_CurrentExecutorUsedMemoryBytes` | Executor used memory | ✅ |
| `io_e6x_E6Engine_CurrentFreeRssBytes` | Free RSS bytes |
| `io_e6x_E6Engine_CurrentMemCacheAvailableSlots` | Cache available slots |
| `io_e6x_E6Engine_CurrentMemCacheMemoryBytes` | Cache memory |
| `io_e6x_E6Engine_CurrentMemCacheOccupiedSlots` | Cache occupied slots |
| `io_e6x_E6Engine_CurrentMemCachePinnedSlots` | Cache pinned slots |
| `io_e6x_E6Engine_CurrentMemCacheReclaimedSlots` | Cache reclaimed slots |
| `io_e6x_E6Engine_CurrentMmapPinnedBytes` | Mmap pinned bytes |
| `io_e6x_E6Engine_CurrentMmapRssBytes` | Mmap RSS bytes |
| `io_e6x_E6Engine_CurrentNumberOfFilesOpen` | Open files |
| `io_e6x_E6Engine_CurrentNumberOfMemCacheCacheReadWaiters` | Cache read waiters |
| `io_e6x_E6Engine_CurrentParquetCacheFileCount` | Parquet cache files |
| `io_e6x_E6Engine_CurrentParquetCacheFileSizeBytes` | Parquet cache size |
| `io_e6x_E6Engine_CurrentSpillWriters` | Spill writers |
| `io_e6x_E6Engine_CurrentStaticRssBytes` | Static RSS bytes |
| `io_e6x_E6Engine_CurrentTotalRssBytes` | Total RSS bytes |
| `io_e6x_E6Engine_DictionaryIngestColumnNumber` | Dictionary columns |
| `io_e6x_E6Engine_DictionaryIngestInFlightNumber` | In-flight dictionary ingests |
| `io_e6x_E6Engine_DictionaryIngestSuccessNumber` | Successful dictionary ingests |
| `io_e6x_E6Engine_DiskCacheGetHitBytes` | Disk cache hit bytes | ✅ |
| `io_e6x_E6Engine_DiskCacheGetMissBytes` | Disk cache miss bytes | ✅ |
| `io_e6x_E6Engine_DiskCacheGetTimeNanos` | Disk cache get time |
| `io_e6x_E6Engine_DiskCacheMaxSpaceBytes` | Disk cache max space |
| `io_e6x_E6Engine_DiskCacheNumBlocksEvicted` | Evicted blocks |
| `io_e6x_E6Engine_DiskCacheNumBlocksGet` | Block gets |
| `io_e6x_E6Engine_DiskCacheNumBlocksPut` | Block puts |
| `io_e6x_E6Engine_DiskCacheNumBlocksPutInMemory` | In-memory block puts |
| `io_e6x_E6Engine_DiskCacheOccupiedSpaceBytes` | Occupied cache space |
| `io_e6x_E6Engine_DiskCachePutTimeNanos` | Disk cache put time |
| `io_e6x_E6Engine_FilesReadFromCacheBytes` | Files read from cache | ✅ |
| `io_e6x_E6Engine_FilesReadFromS3Bytes` | Files read from S3 | ✅ |
| `io_e6x_E6Engine_FilesReadFromS3Compressed` | Compressed S3 reads |
| `io_e6x_E6Engine_HeapCacheGetHitBytes` | Heap cache hit bytes | ✅ |
| `io_e6x_E6Engine_HeapCacheGetMissBytes` | Heap cache miss bytes |
| `io_e6x_E6Engine_HeapCacheGetTimeNanos` | Heap cache get time |
| `io_e6x_E6Engine_HeapCacheMaxSpaceBytes` | Heap cache max space |
| `io_e6x_E6Engine_HeapCacheNumBlocksEvicted` | Evicted heap blocks |
| `io_e6x_E6Engine_HeapCacheNumBlocksGet` | Heap block gets |
| `io_e6x_E6Engine_HeapCacheNumBlocksPut` | Heap block puts |
| `io_e6x_E6Engine_HeapCacheOccupiedSpaceBytes` | Occupied heap cache |
| `io_e6x_E6Engine_HeapCachePutTimeNanos` | Heap cache put time |
| `io_e6x_E6Engine_NumBlockedThreads` | Blocked threads |
| `io_e6x_E6Engine_NumCacheReaders` | Cache readers |
| `io_e6x_E6Engine_NumColumnsRead` | Columns read |
| `io_e6x_E6Engine_NumDeadlockedThreads` | Deadlocked threads |
| `io_e6x_E6Engine_NumFilesOpen` | Files open |
| `io_e6x_E6Engine_NumFilesRead` | Files read |
| `io_e6x_E6Engine_NumFilesReadSync` | Sync files read |
| `io_e6x_E6Engine_NumRowsRead` | Rows read | ✅ |
| `io_e6x_E6Engine_NumS3Readers` | S3 readers |
| `io_e6x_E6Engine_NumSpilledBytesRead` | Spilled bytes read |
| `io_e6x_E6Engine_NumSpilledBytesWritten` | Spilled bytes written | ✅ |
| `io_e6x_E6Engine_NumSpilledPagesRead` | Spilled pages read |
| `io_e6x_E6Engine_NumSpilledPagesWritten` | Spilled pages written |
| `io_e6x_E6Engine_ParquetWriteRows` | Parquet rows written |
| `io_e6x_E6Engine_ParquetWriteRowsCumulative` | Cumulative parquet rows |
| `io_e6x_E6Engine_ParquetWriteSize` | Parquet write size |
| `io_e6x_E6Engine_ParquetWriteSizeCumulative` | Cumulative write size |
| `io_e6x_E6Engine_ParquetWriteTime` | Parquet write time |
| `io_e6x_E6Engine_ParquetWriteTimeCumulative` | Cumulative write time |
| `io_e6x_E6Engine_ReadFromCacheNanos` | Cache read time |
| `io_e6x_E6Engine_ReadFromS3Nanos` | S3 read time |
| `io_e6x_E6Engine_RoundTripTimeNanos` | Round trip time |
| `io_e6x_E6Engine_ServerTimeNanos` | Server time |
| `io_e6x_E6Engine_SpilledPageCompressedBytes` | Compressed spill bytes |
| `io_e6x_E6Engine_SpilledPageUncompressedBytes` | Uncompressed spill bytes |
| `io_e6x_E6Engine_SucceededRequestsCount` | Succeeded requests |
| `io_e6x_E6Engine_TaskCumulativeTimeNanos` | Cumulative task time |
| `io_e6x_E6Engine_TasksRun` | Tasks run |
| `io_e6x_E6Engine_TimeToFirstByte` | Time to first byte |
| `io_e6x_E6Engine_TotalBytesRead` | Total bytes read | ✅ |
| `io_e6x_E6Engine_Uptime` | Engine uptime |

### E6 Gateway Metrics (`io_e6x_E6Gateway_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Gateway_CurrentActiveConnections` | Active connections | ✅ |
| `io_e6x_E6Gateway_CurrentQueriesQueuedCount` | Queued queries |
| `io_e6x_E6Gateway_CurrentQueriesRunningCount` | Running queries | ✅ |
| `io_e6x_E6Gateway_NumBlockedThreads` | Blocked threads |
| `io_e6x_E6Gateway_NumDeadlockedThreads` | Deadlocked threads |
| `io_e6x_E6Gateway_NumSucceededQueries` | Succeeded queries | ✅ |
| `io_e6x_E6Gateway_QueuedQueriesCreatedCount` | Created queued queries |
| `io_e6x_E6Gateway_QueuedQueriesResumedCount` | Resumed queued queries |
| `io_e6x_E6Gateway_TotalQueriesCompletedCount` | Completed queries | ✅ |
| `io_e6x_E6Gateway_TotalQueriesCreatedCount` | Created queries |
| `io_e6x_E6Gateway_TotalQueriesFailedCount` | Failed queries | ✅ |
| `io_e6x_E6Gateway_Uptime` | Gateway uptime | ✅ |

### E6 Queue Metrics (`io_e6x_E6Queue_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `e6data_colocate`

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Queue_CurrentActiveRequests` | Active requests | ✅ |
| `io_e6x_E6Queue_CurrentActiveSplits` | Active splits |
| `io_e6x_E6Queue_CurrentActiveTasks` | Active tasks | ✅ |
| `io_e6x_E6Queue_CurrentActiveTasksAborted` | Aborted tasks |
| `io_e6x_E6Queue_CurrentActiveTasksCancelled` | Cancelled tasks |
| `io_e6x_E6Queue_CurrentActiveTasksCreated` | Created tasks |
| `io_e6x_E6Queue_CurrentActiveTasksFailed` | Failed tasks |
| `io_e6x_E6Queue_CurrentActiveTasksNew` | New tasks |
| `io_e6x_E6Queue_CurrentActiveTasksRunning` | Running tasks |
| `io_e6x_E6Queue_CurrentActiveTasksSucceeded` | Succeeded tasks |
| `io_e6x_E6Queue_CurrentNumTasks` | Current task count |
| `io_e6x_E6Queue_MaxCompletedE6Requests` | Max completed requests |
| `io_e6x_E6Queue_NumBlockedThreads` | Blocked threads |
| `io_e6x_E6Queue_NumCompletedE6Requests` | Completed requests |
| `io_e6x_E6Queue_NumDeadlockedThreads` | Deadlocked threads |
| `io_e6x_E6Queue_NumE6RequestsFailed` | Failed requests |
| `io_e6x_E6Queue_NumE6RequestsSucceeded` | Succeeded requests | ✅ |
| `io_e6x_E6Queue_Uptime` | Queue uptime | ✅ |

### E6 Executor Metrics (`io_e6x_E6xecutor_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `pools`

| Metric | Description |
|--------|-------------|
| `io_e6x_E6xecutor_NumBlockedThreads` | Blocked threads |
| `io_e6x_E6xecutor_NumDeadlockedThreads` | Deadlocked threads |
| `io_e6x_E6xecutor_Uptime` | Executor uptime | ✅ |

### E6 Schema Metrics (`io_e6x_E6Schema_*`)

**Labels:** `workspace`, `namespace`, `pod`, `component` (no `cluster` label)

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Schema_NumMultiplePartitionListingTasksFailed` | Failed partition listing tasks |
| `io_e6x_E6Schema_NumMultiplePartitionListingTasksInProgress` | In-progress partition tasks |
| `io_e6x_E6Schema_NumMultiplePartitionListingTasksQueued` | Queued partition tasks |
| `io_e6x_E6Schema_NumMultiplePartitionListingTasksSuccess` | Successful partition tasks |
| `io_e6x_E6Schema_NumTableListingTasksFailed` | Failed table listing tasks |
| `io_e6x_E6Schema_NumTableListingTasksInProgress` | In-progress table listing |
| `io_e6x_E6Schema_NumTableListingTasksQueued` | Queued table listing |
| `io_e6x_E6Schema_NumTableListingTasksSuccess` | Successful table listing |
| `io_e6x_E6Schema_NumTableMetadataReadInnerTasksFailed` | Failed metadata inner tasks |
| `io_e6x_E6Schema_NumTableMetadataReadInnerTasksInProgress` | In-progress metadata inner tasks |
| `io_e6x_E6Schema_NumTableMetadataReadInnerTasksQueued` | Queued metadata inner tasks |
| `io_e6x_E6Schema_NumTableMetadataReadInnerTasksSuccess` | Successful metadata inner tasks |
| `io_e6x_E6Schema_NumTableMetadataReadTasksFailed` | Failed metadata tasks |
| `io_e6x_E6Schema_NumTableMetadataReadTasksInProgress` | In-progress metadata tasks |
| `io_e6x_E6Schema_NumTableMetadataReadTasksQueued` | Queued metadata tasks |
| `io_e6x_E6Schema_NumTableMetadataReadTasksSuccess` | Successful metadata tasks |
| `io_e6x_E6Schema_NumThriftRequestsInProgress` | In-progress Thrift requests |
| `io_e6x_E6Schema_NumThriftRequestsQueued` | Queued Thrift requests |
| `io_e6x_E6Schema_TablePartitionsReadTasksFailed` | Failed partition read tasks |
| `io_e6x_E6Schema_TablePartitionsReadTasksInProgress` | In-progress partition reads |
| `io_e6x_E6Schema_TablePartitionsReadTasksQueued` | Queued partition reads |
| `io_e6x_E6Schema_TablePartitionsReadTasksSuccess` | Successful partition reads |
| `io_e6x_E6Schema_TableStatsReadTasksFailed` | Failed stats read tasks |
| `io_e6x_E6Schema_TableStatsReadTasksInProgress` | In-progress stats reads |
| `io_e6x_E6Schema_TableStatsReadTasksQueued` | Queued stats reads |
| `io_e6x_E6Schema_TableStatsReadTasksSuccess` | Successful stats reads |
| `io_e6x_E6Schema_Uptime` | Schema service uptime | ✅ |

### E6 Storage Metrics (`io_e6x_E6Storage_*`)

**Labels:** `workspace`, `namespace`, `pod`, `component` (no `cluster` label)

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Storage_AvgFileMetadataSize` | Average file metadata size |
| `io_e6x_E6Storage_FileMetadataCacheSize` | File metadata cache size |
| `io_e6x_E6Storage_NumBlockedThreads` | Blocked threads |
| `io_e6x_E6Storage_NumDeadlockedThreads` | Deadlocked threads |
| `io_e6x_E6Storage_NumPartFileAndMetadataListingTasksInProgress` | In-progress listing tasks |
| `io_e6x_E6Storage_NumPartFileAndMetadataListingTasksInQueue` | Queued listing tasks |
| `io_e6x_E6Storage_NumThriftRequestsInProgress` | In-progress Thrift requests |
| `io_e6x_E6Storage_NumThriftRequestsQueued` | Queued Thrift requests |
| `io_e6x_E6Storage_TableMetadataRequestsInProgress` | In-progress metadata requests |
| `io_e6x_E6Storage_TablePartitionFileAndMetadataRequestsInProgress` | In-progress partition requests |
| `io_e6x_E6Storage_TablePartitionsRequestsInProgress` | In-progress partition list requests |
| `io_e6x_E6Storage_TableStatisticsRequestsInProgress` | In-progress stats requests |
| `io_e6x_E6Storage_Uptime` | Storage service uptime | ✅ |

### E6 JVM/Process Metrics

| Metric | Description |
|--------|-------------|
| `java_lang_Memory_HeapMemoryUsage_committed` | Committed heap memory |
| `java_lang_Memory_HeapMemoryUsage_max` | Max heap memory |
| `java_lang_Memory_HeapMemoryUsage_used` | Used heap memory |
| `process_cpu_seconds_total` | Total CPU seconds |
| `process_max_fds` | Max file descriptors |
| `process_open_fds` | Open file descriptors |
| `process_resident_memory_bytes` | Resident memory |
| `process_start_time_seconds` | Process start time |
| `process_virtual_memory_bytes` | Virtual memory |

---

## Part 2: Kubernetes Metrics (from Monitoring Agent)

Collected via Alloy from kube-state-metrics, node-exporter, cAdvisor, and OpenCost.

### OpenCost Metrics

#### Node Cost Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `node_total_hourly_cost` | Total hourly cost per node | node, cluster, instance_type, region | ✅ |
| `node_cpu_hourly_cost` | CPU component of hourly cost | node, cluster | ✅ |
| `node_ram_hourly_cost` | RAM component of hourly cost | node, cluster | ✅ |
| `node_gpu_hourly_cost` | GPU component of hourly cost | node, cluster |
| `pv_hourly_cost` | Persistent volume hourly cost | persistentvolume, cluster |

#### Container/Pod Allocation Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `container_cpu_allocation` | CPU cores allocated | container, namespace, pod, node | ✅ |
| `container_memory_allocation_bytes` | Memory bytes allocated | container, namespace, pod, node | ✅ |
| `container_gpu_allocation` | GPU units allocated | container, namespace, pod, node |
| `pod_pvc_allocation` | PVC storage bytes allocated | pod, namespace, persistentvolumeclaim |

#### OpenCost Info Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `opencost_build_info` | Build info | version |
| `opencost_cluster_info` | Cluster info | cluster_id, cluster_name |
| `opencost_cluster_management_cost` | Cluster management cost | cluster_id |
| `opencost_node_is_spot` | 1 if node is spot instance | node, cluster_id |

### kube-state-metrics (KSM)

#### Pod Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `kube_pod_info` | Pod metadata (value=1) | pod, namespace, node, created_by_kind, created_by_name | ✅ |
| `kube_pod_labels` | Pod labels | pod, namespace, label_* | ✅ |
| `kube_pod_status_phase` | Pod phase | pod, namespace, phase |
| `kube_pod_owner` | Pod owner reference | pod, namespace, owner_kind, owner_name |
| `kube_pod_created` | Pod creation timestamp | pod, namespace |
| `kube_pod_start_time` | Pod start timestamp | pod, namespace |
| `kube_pod_container_status_running` | Container running status | pod, namespace, container |
| `kube_pod_container_status_waiting` | Container waiting status | pod, namespace, container, reason |
| `kube_pod_container_status_terminated` | Container terminated status | pod, namespace, container, reason |
| `kube_pod_container_resource_requests` | Container resource requests | pod, namespace, container, resource, unit | ✅ |
| `kube_pod_container_resource_limits` | Container resource limits | pod, namespace, container, resource, unit | ✅ |

#### Node Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `kube_node_info` | Node metadata (value=1) | node, kernel_version, os_image, container_runtime_version | ✅ |
| `kube_node_labels` | Node labels | node, label_* | ✅ |
| `kube_node_status_capacity` | Node capacity | node, resource (cpu/memory/pods) | ✅ |
| `kube_node_status_allocatable` | Node allocatable resources | node, resource (cpu/memory/pods) | ✅ |
| `kube_node_status_condition` | Node conditions | node, condition, status |

#### Namespace Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `kube_namespace_labels` | Namespace labels | namespace, label_* |
| `kube_resourcequota` | Resource quotas | namespace, resourcequota, resource, type |

#### Workload Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `kube_deployment_status_replicas` | Current deployment replicas | deployment, namespace |
| `kube_deployment_status_replicas_available` | Available deployment replicas | deployment, namespace |
| `kube_deployment_spec_replicas` | Desired deployment replicas | deployment, namespace |
| `kube_statefulset_status_replicas` | Current statefulset replicas | statefulset, namespace |
| `kube_statefulset_replicas` | Desired statefulset replicas | statefulset, namespace |

### cAdvisor Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `container_cpu_usage_seconds_total` | CPU usage counter (seconds) | pod, namespace, container, node | ✅ |
| `container_memory_working_set_bytes` | Memory working set bytes | pod, namespace, container, node | ✅ |
| `container_fs_usage_bytes` | Filesystem usage bytes | pod, namespace, container | ✅ |
| `container_network_receive_bytes_total` | Network bytes received | pod, namespace, container | ✅ |
| `container_network_transmit_bytes_total` | Network bytes transmitted | pod, namespace, container | ✅ |

### node-exporter Metrics

| Metric | Description | Labels |
|--------|-------------|--------|
| `node_cpu_seconds_total` | CPU usage counter (seconds) | node, cpu, mode | ✅ |
| `node_memory_MemTotal_bytes` | Total memory bytes | node | ✅ |
| `node_memory_MemAvailable_bytes` | Available memory bytes | node | ✅ |
| `node_filesystem_size_bytes` | Filesystem size bytes | node, device, mountpoint, fstype |
| `node_filesystem_avail_bytes` | Filesystem available bytes | node, device, mountpoint, fstype |
| `node_network_receive_bytes_total` | Network bytes received | node, device | ✅ |
| `node_network_transmit_bytes_total` | Network bytes transmitted | node, device | ✅ |

---

## Part 3: Implementation - Metrics to Track

Only these metrics need to be collected and stored for the CloudCosts dashboard.

### E6 Metrics (from Grafana/Mimir)

#### Container Resource Usage
| Metric | Purpose |
|--------|---------|
| `e6data_container_cpu_usage_seconds_total` | CPU cost attribution |
| `e6data_container_memory_working_set_bytes` | Memory cost attribution |
| `e6data_container_network_receive_bytes_total` | Network ingress cost |
| `e6data_container_network_transmit_bytes_total` | Network egress cost |
| `e6data_container_spec_cpu_quota` | CPU limit (for right-sizing) |
| `e6data_container_spec_memory_limit_bytes` | Memory limit (for right-sizing) |

#### Engine Performance
| Metric | Purpose |
|--------|---------|
| `io_e6x_E6Engine_CurrentActiveTasks` | Workload tracking |
| `io_e6x_E6Engine_CurrentActiveTasksRunning` | Active compute |
| `io_e6x_E6Engine_CurrentExecutorUsedMemoryBytes` | Engine memory usage |
| `io_e6x_E6Engine_CurrentExecutorAllocatedMemoryBytes` | Engine memory allocation (for right-sizing) |
| `io_e6x_E6Engine_TotalBytesRead` | Data scanned (analytics cost) |
| `io_e6x_E6Engine_NumRowsRead` | Rows scanned |
| `io_e6x_E6Engine_FilesReadFromS3Bytes` | S3 GET + egress cost |
| `io_e6x_E6Engine_FilesReadFromCacheBytes` | Cache hits (cost savings) |
| `io_e6x_E6Engine_NumSpilledBytesWritten` | Disk spill (SSD cost) |
| `io_e6x_E6Engine_DiskCacheGetHitBytes` | Disk cache efficiency |
| `io_e6x_E6Engine_DiskCacheGetMissBytes` | Disk cache misses |
| `io_e6x_E6Engine_HeapCacheGetHitBytes` | Memory cache efficiency |

#### Gateway (Query Volume)
| Metric | Purpose |
|--------|---------|
| `io_e6x_E6Gateway_CurrentActiveConnections` | Connection count |
| `io_e6x_E6Gateway_CurrentQueriesRunningCount` | Running queries |
| `io_e6x_E6Gateway_NumSucceededQueries` | Successful queries |
| `io_e6x_E6Gateway_TotalQueriesCompletedCount` | Total queries |
| `io_e6x_E6Gateway_TotalQueriesFailedCount` | Failed queries (wasted cost) |
| `io_e6x_E6Gateway_Uptime` | Service availability |

#### Queue
| Metric | Purpose |
|--------|---------|
| `io_e6x_E6Queue_CurrentActiveRequests` | Active requests |
| `io_e6x_E6Queue_CurrentActiveTasks` | Concurrent workload |
| `io_e6x_E6Queue_NumE6RequestsSucceeded` | Completed requests |
| `io_e6x_E6Queue_Uptime` | Service availability |

#### Component Uptime
| Metric | Purpose |
|--------|---------|
| `io_e6x_E6xecutor_Uptime` | Executor availability |
| `io_e6x_E6Schema_Uptime` | Schema service availability |
| `io_e6x_E6Storage_Uptime` | Storage service availability |

### Kubernetes Metrics (from Monitoring Agent)

#### OpenCost (Required for Cost Calculation)
| Metric | Purpose |
|--------|---------|
| `node_total_hourly_cost` | Node cost |
| `node_cpu_hourly_cost` | CPU cost rate |
| `node_ram_hourly_cost` | Memory cost rate |
| `container_cpu_allocation` | Pod CPU allocation (for bin packing) |
| `container_memory_allocation_bytes` | Pod memory allocation (for bin packing) |

#### KSM (Required for Context)
| Metric | Purpose |
|--------|---------|
| `kube_pod_info` | Pod metadata |
| `kube_pod_labels` | Pod labels (for attribution) |
| `kube_node_info` | Node metadata |
| `kube_node_labels` | Node labels (instance type, spot/on-demand) |
| `kube_node_status_allocatable` | Node capacity (for bin packing) |
| `kube_pod_container_resource_requests` | Pod requests (for right-sizing) |
| `kube_pod_container_resource_limits` | Pod limits (for right-sizing) |

#### cAdvisor (Required for Usage)
| Metric | Purpose |
|--------|---------|
| `container_cpu_usage_seconds_total` | Actual CPU usage |
| `container_memory_working_set_bytes` | Actual memory usage |

---

## Cost Optimization Analysis

These metrics answer the three key questions:

### 1. Packing (Bin Packing Efficiency)
Are pods efficiently packed on nodes?
```
packing_efficiency = sum(container_cpu_allocation) / sum(kube_node_status_allocatable{resource="cpu"})
```
**Metrics needed:** `container_cpu_allocation`, `container_memory_allocation_bytes`, `kube_node_status_allocatable`

### 2. Sizing (Right-sizing)
Are pods sized correctly during usage?
```
cpu_efficiency = rate(container_cpu_usage_seconds_total) / container_cpu_allocation
memory_efficiency = container_memory_working_set_bytes / container_memory_allocation_bytes
```
**Metrics needed:** `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, `container_cpu_allocation`, `container_memory_allocation_bytes`, `kube_pod_container_resource_requests`, `kube_pod_container_resource_limits`

### 3. Gaps (Idle Detection / Scale Down)
Are we releasing resources when not in use?
```
idle_pods = pods where (io_e6x_E6Engine_CurrentActiveTasks == 0 AND io_e6x_E6Gateway_CurrentQueriesRunningCount == 0)
```
**Metrics needed:** `io_e6x_E6Engine_CurrentActiveTasks`, `io_e6x_E6Gateway_CurrentQueriesRunningCount`, `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`

---

## Pod Cost Calculation

OpenCost doesn't provide direct pod costs. Calculate as:

```
pod_cpu_cost = container_cpu_allocation × node_cpu_hourly_cost
pod_memory_cost = (container_memory_allocation_bytes / 1Gi) × node_ram_hourly_cost
pod_total_cost = pod_cpu_cost + pod_memory_cost
```
