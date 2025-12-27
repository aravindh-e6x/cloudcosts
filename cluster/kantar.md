# Kantar Prometheus Metrics

**Data Source:** `kantar-prometheus` (UID: `bec964fd-90f8-43ca-b368-836d1d505711`)
**Status:** Active with data in last 7 days
**Total Metrics:** 463

## E6 Container Metrics

| Metric | Description |
|--------|-------------|
| `e6data_container_cpu_usage_seconds_total` | Container CPU usage |
| `e6data_container_cpu_usage_seconds_total_avg` | Average CPU usage |
| `e6data_container_memory_usage_bytes` | Container memory usage |
| `e6data_container_memory_usage_bytes_avg` | Average memory usage |
| `e6data_container_memory_cache` | Memory cache |
| `e6data_container_network_receive_bytes_total` | Network bytes received |
| `e6data_container_network_transmit_bytes_total` | Network bytes transmitted |
| `e6data_container_restart_count` | Container restart count |
| `e6data_container_requests` | Container requests |
| `e6data_container_spec_cpu_period` | CPU period spec |
| `e6data_container_spec_cpu_quota` | CPU quota spec |

## E6 Cluster Metrics

| Metric | Description |
|--------|-------------|
| `e6data_cluster_uptime` | Cluster uptime |
| `e6data_component_cores_total` | Total component cores |
| `e6data_component_cores_created` | Component cores created |

## E6 Engine (Planner) Metrics

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Engine_AggregatedNumQueries` | Total queries |
| `io_e6x_E6Engine_AggregatedSuccesfulQueries` | Successful queries |
| `io_e6x_E6Engine_AggregatedFailedQueries` | Failed queries |
| `io_e6x_E6Engine_AggregatedCancelledQueries` | Cancelled queries |
| `io_e6x_E6Engine_AggregatedTimedoutQueries` | Timed out queries |
| `io_e6x_E6Engine_AggregatedNumCachedQueries` | Cached queries |
| `io_e6x_E6Engine_AggregatedNumQueriesUsingHep` | Queries using HEP |
| `io_e6x_E6Engine_AggregatedNumQueriesUsingMultiJoin` | Queries using multi-join |
| `io_e6x_E6Engine_AggregatedNumQueriesUsingVolcano` | Queries using Volcano |
| `io_e6x_E6Engine_NumQueriesInProgress` | Queries in progress |
| `io_e6x_E6Engine_NumQueriesQueued` | Queries queued |
| `io_e6x_E6Engine_NumQueriesTotalInProgress` | Total queries in progress |
| `io_e6x_E6Engine_NumQueriesExecutingInProgress` | Executing queries |
| `io_e6x_E6Engine_NumQueriesPlanningInProgress` | Planning queries |
| `io_e6x_E6Engine_NumQueriesResultsFetchingInProgress` | Results fetching |
| `io_e6x_E6Engine_NumExecutorClients` | Executor clients |
| `io_e6x_E6Engine_Uptime` | Engine uptime |
| `io_e6x_E6Engine_FallbackRoutedQueries` | Fallback routed queries |
| `io_e6x_E6Engine_FallbackSuccessfulQueries` | Fallback successful |
| `io_e6x_E6Engine_FallbackFailedQueries` | Fallback failed |

## E6 Queue Metrics

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Queue_NumExecutors` | Number of executors |
| `io_e6x_E6Queue_NumPlanners` | Number of planners |
| `io_e6x_E6Queue_NumSchedulableExecutors` | Schedulable executors |
| `io_e6x_E6Queue_NumExecutingQueries` | Executing queries |
| `io_e6x_E6Queue_NumExecutionQueuedQueries` | Execution queued queries |
| `io_e6x_E6Queue_NumPlanningQueuedQueries` | Planning queued queries |
| `io_e6x_E6Queue_TotalQueuedTasks` | Total queued tasks |
| `io_e6x_E6Queue_TotalPipelineStages` | Total pipeline stages |
| `io_e6x_E6Queue_QpsBasedOnWindowArrivalRate` | QPS based on arrival rate |
| `io_e6x_E6Queue_ExecutionPercentileTimeMillis` | Execution percentile time |
| `io_e6x_E6Queue_PlanningPercentileTimeMillis` | Planning percentile time |
| `io_e6x_E6Queue_QueueingPercentileTimeMillis` | Queueing percentile time |
| `io_e6x_E6Queue_TotalPercentileTimeMillis` | Total percentile time |
| `io_e6x_E6Queue_TotalSpotInterruptions` | Spot interruptions |
| `io_e6x_E6Queue_QueriesImpactedBySpot` | Queries impacted by spot |
| `io_e6x_E6Queue_TasksImpactedBySpot` | Tasks impacted by spot |
| `io_e6x_E6Queue_QueryRetriesDueToSpot` | Query retries due to spot |
| `io_e6x_E6Queue_TotalIdleDetections` | Idle detections |
| `io_e6x_E6Queue_TotalIdleTimeMillis` | Total idle time |
| `io_e6x_E6Queue_Uptime` | Queue uptime |

## E6 Executor Metrics

| Metric | Description |
|--------|-------------|
| `io_e6x_E6xecutor_AggregatedQueryCount` | Aggregated query count |
| `io_e6x_E6xecutor_ExecutionInProgressQueries` | Execution in progress |
| `io_e6x_E6xecutor_CacheHitRate` | Cache hit rate |
| `io_e6x_E6xecutor_MemCacheHitRate` | Memory cache hit rate |
| `io_e6x_E6xecutor_DiskCacheHitRate` | Disk cache hit rate |
| `io_e6x_E6xecutor_FooterCacheHitRate` | Footer cache hit rate |
| `io_e6x_E6xecutor_BloomIndexCacheHitRate` | Bloom index cache hit rate |
| `io_e6x_E6xecutor_RangeIndexCacheHitRate` | Range index cache hit rate |
| `io_e6x_E6xecutor_DecompressedParquetPageCacheHitRate` | Parquet page cache hit rate |
| `io_e6x_E6xecutor_SizeOfCachedPagesInMb` | Cached pages size (MB) |
| `io_e6x_E6xecutor_SizeOfDiskCacheInMb` | Disk cache size (MB) |
| `io_e6x_E6xecutor_ExecutorDisk_free` | Executor disk free |
| `io_e6x_E6xecutor_ExecutorDisk_used` | Executor disk used |
| `io_e6x_E6xecutor_DiskUsageForOperatorsInMb` | Disk usage for operators |
| `io_e6x_E6xecutor_BloomFilterMemUsageInMB` | Bloom filter memory |
| `io_e6x_E6xecutor_FooterMemUsageInMB` | Footer memory |
| `io_e6x_E6xecutor_RangeFilterMemUsageInMB` | Range filter memory |
| `io_e6x_E6xecutor_QueueLength` | Queue length |
| `io_e6x_E6xecutor_ActiveTaskCount` | Active task count |
| `io_e6x_E6xecutor_TotalTasksPerQuery` | Total tasks per query |
| `io_e6x_E6xecutor_MaxTasksPerQuery` | Max tasks per query |
| `io_e6x_E6xecutor_ThreadCount` | Thread count |
| `io_e6x_E6xecutor_NumRunningThreads` | Running threads |
| `io_e6x_E6xecutor_Uptime` | Executor uptime |

## E6 Schema Metrics

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Schema_NumDBListingTasksInProgress` | DB listing tasks in progress |
| `io_e6x_E6Schema_NumDBListingTasksQueued` | DB listing tasks queued |
| `io_e6x_E6Schema_NumDBListingTasksSuccess` | DB listing tasks success |
| `io_e6x_E6Schema_NumDBListingTasksFailed` | DB listing tasks failed |
| `io_e6x_E6Schema_NumTableListingTasksInProgress` | Table listing in progress |
| `io_e6x_E6Schema_NumTableListingTasksSuccess` | Table listing success |
| `io_e6x_E6Schema_NumTableMetadataReadTasksInProgress` | Table metadata read in progress |
| `io_e6x_E6Schema_NumTableMetadataReadTasksSuccess` | Table metadata read success |
| `io_e6x_E6Schema_NumThriftRequestsInProgress` | Thrift requests in progress |
| `io_e6x_E6Schema_NumThriftRequestsQueued` | Thrift requests queued |
| `io_e6x_E6Schema_Uptime` | Schema uptime |

## E6 Storage Metrics

| Metric | Description |
|--------|-------------|
| `io_e6x_E6Storage_FileMetadataCacheSize` | File metadata cache size |
| `io_e6x_E6Storage_AvgFileMetadataSize` | Avg file metadata size |
| `io_e6x_E6Storage_NumThriftRequestsInProgress` | Thrift requests in progress |
| `io_e6x_E6Storage_NumThriftRequestsQueued` | Thrift requests queued |
| `io_e6x_E6Storage_TableMetadataRequestsInProgress` | Table metadata requests |
| `io_e6x_E6Storage_TablePartitionsRequestsInProgress` | Table partitions requests |
| `io_e6x_E6Storage_NumThreads` | Number of threads |
| `io_e6x_E6Storage_NumBlockedThreads` | Blocked threads |
| `io_e6x_E6Storage_Uptime` | Storage uptime |

## HAProxy Metrics

| Metric | Description |
|--------|-------------|
| `haproxy_active_planners` | Active planners |
| `haproxy_backend_active_servers` | Backend active servers |
| `haproxy_backend_current_sessions` | Backend current sessions |
| `haproxy_backend_sessions_total` | Backend total sessions |
| `haproxy_backend_http_responses_total` | Backend HTTP responses |
| `haproxy_backend_status` | Backend status |
| `haproxy_frontend_current_sessions` | Frontend current sessions |
| `haproxy_frontend_connections_total` | Frontend connections |
| `haproxy_frontend_status` | Frontend status |
| `haproxy_server_status` | Server status |
| `haproxy_server_current_sessions` | Server current sessions |
| `haproxy_health_status` | Health status |
| `total_k8s_healthy_planners` | Healthy K8s planners |
| `total_k8s_unhealthy_planners` | Unhealthy K8s planners |
| `total_k8s_total_planners` | Total K8s planners |

## JVM/Java Metrics

| Metric | Description |
|--------|-------------|
| `java_lang_Memory_HeapMemoryUsage_used` | Heap memory used |
| `java_lang_Memory_HeapMemoryUsage_max` | Heap memory max |
| `java_lang_Memory_HeapMemoryUsage_committed` | Heap memory committed |
| `java_lang_Memory_NonHeapMemoryUsage_used` | Non-heap memory used |
| `java_lang_Threading_ThreadCount` | Thread count |
| `java_lang_Threading_DaemonThreadCount` | Daemon thread count |
| `java_lang_Threading_PeakThreadCount` | Peak thread count |
| `java_lang_OperatingSystem_CpuLoad` | CPU load |
| `java_lang_OperatingSystem_ProcessCpuLoad` | Process CPU load |
| `java_lang_OperatingSystem_SystemLoadAverage` | System load average |
| `java_lang_G1_Young_Generation_CollectionCount` | G1 young gen GC count |
| `java_lang_G1_Young_Generation_CollectionTime` | G1 young gen GC time |
| `java_lang_G1_Old_Generation_CollectionCount` | G1 old gen GC count |
| `jvm_memory_used_bytes` | JVM memory used |
| `jvm_gc_collection_seconds_count` | GC collection count |
| `jvm_gc_collection_seconds_sum` | GC collection time |
| `jvm_threads_current` | Current threads |
| `jvm_threads_daemon` | Daemon threads |

## RabbitMQ Metrics

| Metric | Description |
|--------|-------------|
| `rabbitmq_queue_messages_ready` | Messages ready |
| `rabbitmq_queue_messages_unacked` | Messages unacked |
| `rabbitmq_queue_messages_published_total` | Messages published |
| `rabbitmq_queue_messages_delivered_total` | Messages delivered |
| `rabbitmq_queue_messages_delivered_ack_total` | Messages delivered ack |
| `rabbitmq_queue_messages_redelivered_total` | Messages redelivered |

## Input/Output Metrics

| Metric | Description |
|--------|-------------|
| `input_connection_up` | Input connection up |
| `input_connection_failed` | Input connection failed |
| `input_connection_lost` | Input connection lost |
| `input_received` | Input received |
| `input_latency_ns` | Input latency (ns) |
| `output_sent` | Output sent |
| `output_error` | Output error |
| `output_latency_ns` | Output latency (ns) |
| `output_connection_up` | Output connection up |

## System Metrics

| Metric | Description |
|--------|-------------|
| `up` | Target up/down |
| `scrape_duration_seconds` | Scrape duration |
| `scrape_samples_scraped` | Samples scraped |
| `process_cpu_seconds_total` | Process CPU time |
| `process_resident_memory_bytes` | Process resident memory |
| `process_open_fds` | Open file descriptors |
