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

### E6 Engine Metrics (`io_e6x_e6engine_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`, `e6uuid`

Note: All metric names are lowercase in GreptimeDB tables.

| Metric | Description |
|--------|-------------|
| `io_e6x_e6engine_avgfilesizeinbytes` | Average file size |
| `io_e6x_e6engine_columnsplitfilesreadfromcachebytes` | Cache read bytes (column split) |
| `io_e6x_e6engine_columnsplitfilesreadfroms3bytes` | S3 read bytes (column split) |
| `io_e6x_e6engine_columnsplitfilesreadfroms3compressed` | Compressed S3 reads |
| `io_e6x_e6engine_cumulativenumberofproducernodesclosed` | Producer nodes closed |
| `io_e6x_e6engine_cumulativenumberofproducernodescreated` | Producer nodes created |
| `io_e6x_e6engine_cumulativenumberofproducernodesexception` | Producer node exceptions |
| `io_e6x_e6engine_cumulativetimetakentoclose producernodes` | Time to close producers |
| `io_e6x_e6engine_currentactivee6connections` | Active connections |
| `io_e6x_e6engine_currentactivetasks` | Active tasks | ✅ |
| `io_e6x_e6engine_currentactivetasksaborted` | Aborted tasks |
| `io_e6x_e6engine_currentactivetaskscancelled` | Cancelled tasks |
| `io_e6x_e6engine_currentactivetasksfailed` | Failed tasks |
| `io_e6x_e6engine_currentactivetasksnew` | New tasks |
| `io_e6x_e6engine_currentactivetasksrunning` | Running tasks | ✅ |
| `io_e6x_e6engine_currentactivetaskssucceeded` | Succeeded tasks |
| `io_e6x_e6engine_currentdynamicrssbytes` | Dynamic RSS bytes |
| `io_e6x_e6engine_currentexecutorallocatedmemorybytes` | Executor allocated memory | ✅ |
| `io_e6x_e6engine_currentexecutoroccupiedmemorybytes` | Executor occupied memory |
| `io_e6x_e6engine_currentexecutorusedmemorybytes` | Executor used memory | ✅ |
| `io_e6x_e6engine_currentfreerssbytes` | Free RSS bytes |
| `io_e6x_e6engine_currentmemcacheavailableslots` | Cache available slots |
| `io_e6x_e6engine_currentmemcachememorybytes` | Cache memory |
| `io_e6x_e6engine_currentmemcacheoccupiedslots` | Cache occupied slots |
| `io_e6x_e6engine_currentmemcachepinnedslots` | Cache pinned slots |
| `io_e6x_e6engine_currentmemcachereclaimedslots` | Cache reclaimed slots |
| `io_e6x_e6engine_currentmmappinnedbytes` | Mmap pinned bytes |
| `io_e6x_e6engine_currentmmaprssbytes` | Mmap RSS bytes |
| `io_e6x_e6engine_currentnumberoffilesopen` | Open files |
| `io_e6x_e6engine_currentnumberofmemcachecachereadwaiters` | Cache read waiters |
| `io_e6x_e6engine_currentparquetcachefilecount` | Parquet cache files |
| `io_e6x_e6engine_currentparquetcachefilesizebytes` | Parquet cache size |
| `io_e6x_e6engine_currentspillwriters` | Spill writers |
| `io_e6x_e6engine_currentstaticrssbytes` | Static RSS bytes |
| `io_e6x_e6engine_currenttotalrssbytes` | Total RSS bytes |
| `io_e6x_e6engine_dictionaryingestcolumnnumber` | Dictionary columns |
| `io_e6x_e6engine_dictionaryingestinflightnumber` | In-flight dictionary ingests |
| `io_e6x_e6engine_dictionaryingestsuccessnumber` | Successful dictionary ingests |
| `io_e6x_e6engine_diskcachegethitbytes` | Disk cache hit bytes | ✅ |
| `io_e6x_e6engine_diskcachegetmissbytes` | Disk cache miss bytes | ✅ |
| `io_e6x_e6engine_diskcachegettimenanos` | Disk cache get time |
| `io_e6x_e6engine_diskcachemaxspacebytes` | Disk cache max space |
| `io_e6x_e6engine_diskcachenumblocksevicted` | Evicted blocks |
| `io_e6x_e6engine_diskcachenumblocksget` | Block gets |
| `io_e6x_e6engine_diskcachenumblocksput` | Block puts |
| `io_e6x_e6engine_diskcachenumblocksputinmemory` | In-memory block puts |
| `io_e6x_e6engine_diskcacheoccupiedspacebytes` | Occupied cache space |
| `io_e6x_e6engine_diskcacheputtimenanos` | Disk cache put time |
| `io_e6x_e6engine_filesreadfromcachebytes` | Files read from cache | ✅ |
| `io_e6x_e6engine_filesreadfroms3bytes` | Files read from S3 | ✅ |
| `io_e6x_e6engine_filesreadfroms3compressed` | Compressed S3 reads |
| `io_e6x_e6engine_heapcachegethitbytes` | Heap cache hit bytes | ✅ |
| `io_e6x_e6engine_heapcachegetmissbytes` | Heap cache miss bytes |
| `io_e6x_e6engine_heapcachegettimenanos` | Heap cache get time |
| `io_e6x_e6engine_heapcachemaxspacebytes` | Heap cache max space |
| `io_e6x_e6engine_heapcachenumblocksevicted` | Evicted heap blocks |
| `io_e6x_e6engine_heapcachenumblocksget` | Heap block gets |
| `io_e6x_e6engine_heapcachenumblocksput` | Heap block puts |
| `io_e6x_e6engine_heapcacheoccupiedspacebytes` | Occupied heap cache |
| `io_e6x_e6engine_heapcacheputtimenanos` | Heap cache put time |
| `io_e6x_e6engine_numblockedthreads` | Blocked threads |
| `io_e6x_e6engine_numcachereaders` | Cache readers |
| `io_e6x_e6engine_numcolumnsread` | Columns read |
| `io_e6x_e6engine_numdeadlockedthreads` | Deadlocked threads |
| `io_e6x_e6engine_numfilesopen` | Files open |
| `io_e6x_e6engine_numfilesread` | Files read |
| `io_e6x_e6engine_numfilesreadsync` | Sync files read |
| `io_e6x_e6engine_numrowsread` | Rows read | ✅ |
| `io_e6x_e6engine_nums3readers` | S3 readers |
| `io_e6x_e6engine_numspilledbytesread` | Spilled bytes read |
| `io_e6x_e6engine_numspilledbyteswritten` | Spilled bytes written | ✅ |
| `io_e6x_e6engine_numspilledpagesread` | Spilled pages read |
| `io_e6x_e6engine_numspilledpageswritten` | Spilled pages written |
| `io_e6x_e6engine_parquetwriterows` | Parquet rows written |
| `io_e6x_e6engine_parquetwriterowscumulative` | Cumulative parquet rows |
| `io_e6x_e6engine_parquetwritesize` | Parquet write size |
| `io_e6x_e6engine_parquetwritesizecumulative` | Cumulative write size |
| `io_e6x_e6engine_parquetwritetime` | Parquet write time |
| `io_e6x_e6engine_parquetwritetimecumulative` | Cumulative write time |
| `io_e6x_e6engine_readfromcachenanos` | Cache read time |
| `io_e6x_e6engine_readfroms3nanos` | S3 read time |
| `io_e6x_e6engine_roundtriptimenanos` | Round trip time |
| `io_e6x_e6engine_servertimenanos` | Server time |
| `io_e6x_e6engine_spilledpagecompressedbytes` | Compressed spill bytes |
| `io_e6x_e6engine_spilledpageuncompressedbytes` | Uncompressed spill bytes |
| `io_e6x_e6engine_succeededrequestscount` | Succeeded requests |
| `io_e6x_e6engine_taskcumulativetimenanos` | Cumulative task time |
| `io_e6x_e6engine_tasksrun` | Tasks run |
| `io_e6x_e6engine_timetofirstbyte` | Time to first byte |
| `io_e6x_e6engine_totalbytesread` | Total bytes read | ✅ |
| `io_e6x_e6engine_uptime` | Engine uptime |

### E6 Gateway Metrics (`io_e6x_e6gateway_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`

| Metric | Description |
|--------|-------------|
| `io_e6x_e6gateway_currentactiveconnections` | Active connections | ✅ |
| `io_e6x_e6gateway_currentqueriesqueuedcount` | Queued queries |
| `io_e6x_e6gateway_currentqueriesrunningcount` | Running queries | ✅ |
| `io_e6x_e6gateway_numblockedthreads` | Blocked threads |
| `io_e6x_e6gateway_numdeadlockedthreads` | Deadlocked threads |
| `io_e6x_e6gateway_numsucceededqueries` | Succeeded queries | ✅ |
| `io_e6x_e6gateway_queuedqueriescreatedcount` | Created queued queries |
| `io_e6x_e6gateway_queuedqueriesresumedcount` | Resumed queued queries |
| `io_e6x_e6gateway_totalqueriescompletedcount` | Completed queries | ✅ |
| `io_e6x_e6gateway_totalqueriescreatedcount` | Created queries |
| `io_e6x_e6gateway_totalqueriesfailedcount` | Failed queries | ✅ |
| `io_e6x_e6gateway_uptime` | Gateway uptime | ✅ |

### E6 Queue Metrics (`io_e6x_e6queue_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `e6data_colocate`

| Metric | Description |
|--------|-------------|
| `io_e6x_e6queue_currentactiverequests` | Active requests | ✅ |
| `io_e6x_e6queue_currentactivesplits` | Active splits |
| `io_e6x_e6queue_currentactivetasks` | Active tasks | ✅ |
| `io_e6x_e6queue_currentactivetasksaborted` | Aborted tasks |
| `io_e6x_e6queue_currentactivetaskscancelled` | Cancelled tasks |
| `io_e6x_e6queue_currentactivetaskscreated` | Created tasks |
| `io_e6x_e6queue_currentactivetasksfailed` | Failed tasks |
| `io_e6x_e6queue_currentactivetasksnew` | New tasks |
| `io_e6x_e6queue_currentactivetasksrunning` | Running tasks |
| `io_e6x_e6queue_currentactivetaskssucceeded` | Succeeded tasks |
| `io_e6x_e6queue_currentnumtasks` | Current task count |
| `io_e6x_e6queue_maxcompletede6requests` | Max completed requests |
| `io_e6x_e6queue_numblockedthreads` | Blocked threads |
| `io_e6x_e6queue_numcompletede6requests` | Completed requests |
| `io_e6x_e6queue_numdeadlockedthreads` | Deadlocked threads |
| `io_e6x_e6queue_nume6requestsfailed` | Failed requests |
| `io_e6x_e6queue_nume6requestssucceeded` | Succeeded requests | ✅ |
| `io_e6x_e6queue_uptime` | Queue uptime | ✅ |

### E6 Executor Metrics (`io_e6x_e6xecutor_*`)

**Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `pools`

| Metric | Description |
|--------|-------------|
| `io_e6x_e6xecutor_numblockedthreads` | Blocked threads |
| `io_e6x_e6xecutor_numdeadlockedthreads` | Deadlocked threads |
| `io_e6x_e6xecutor_uptime` | Executor uptime | ✅ |

### E6 Schema Metrics (`io_e6x_e6schema_*`)

**Labels:** `workspace`, `namespace`, `pod`, `component` (no `cluster` label)

| Metric | Description |
|--------|-------------|
| `io_e6x_e6schema_nummultiplepartitionlistingtasksfailed` | Failed partition listing tasks |
| `io_e6x_e6schema_nummultiplepartitionlistingtasksinprogress` | In-progress partition tasks |
| `io_e6x_e6schema_nummultiplepartitionlistingtasksqueued` | Queued partition tasks |
| `io_e6x_e6schema_nummultiplepartitionlistingtaskssuccess` | Successful partition tasks |
| `io_e6x_e6schema_numtablelistingtasksfailed` | Failed table listing tasks |
| `io_e6x_e6schema_numtablelistingtasksinprogress` | In-progress table listing |
| `io_e6x_e6schema_numtablelistingtasksqueued` | Queued table listing |
| `io_e6x_e6schema_numtablelistingtaskssuccess` | Successful table listing |
| `io_e6x_e6schema_numtablemetadatareadinnertasksfailed` | Failed metadata inner tasks |
| `io_e6x_e6schema_numtablemetadatareadinnertasksinprogress` | In-progress metadata inner tasks |
| `io_e6x_e6schema_numtablemetadatareadinnertasksqueued` | Queued metadata inner tasks |
| `io_e6x_e6schema_numtablemetadatareadinnertaskssuccess` | Successful metadata inner tasks |
| `io_e6x_e6schema_numtablemetadatareadtasksfailed` | Failed metadata tasks |
| `io_e6x_e6schema_numtablemetadatareadtasksinprogress` | In-progress metadata tasks |
| `io_e6x_e6schema_numtablemetadatareadtasksqueued` | Queued metadata tasks |
| `io_e6x_e6schema_numtablemetadatareadtaskssuccess` | Successful metadata tasks |
| `io_e6x_e6schema_numthriftrequestsinprogress` | In-progress Thrift requests |
| `io_e6x_e6schema_numthriftrequestsqueued` | Queued Thrift requests |
| `io_e6x_e6schema_tablepartitionsreadtasksfailed` | Failed partition read tasks |
| `io_e6x_e6schema_tablepartitionsreadtasksinprogress` | In-progress partition reads |
| `io_e6x_e6schema_tablepartitionsreadtasksqueued` | Queued partition reads |
| `io_e6x_e6schema_tablepartitionsreadtaskssuccess` | Successful partition reads |
| `io_e6x_e6schema_tablestatsreadtasksfailed` | Failed stats read tasks |
| `io_e6x_e6schema_tablestatsreadtasksinprogress` | In-progress stats reads |
| `io_e6x_e6schema_tablestatsreadtasksqueued` | Queued stats reads |
| `io_e6x_e6schema_tablestatsreadtaskssuccess` | Successful stats reads |
| `io_e6x_e6schema_uptime` | Schema service uptime | ✅ |

### E6 Storage Metrics (`io_e6x_e6storage_*`)

**Labels:** `workspace`, `namespace`, `pod`, `component` (no `cluster` label)

| Metric | Description |
|--------|-------------|
| `io_e6x_e6storage_avgfilemetadatasize` | Average file metadata size |
| `io_e6x_e6storage_filemetadatacachesize` | File metadata cache size |
| `io_e6x_e6storage_numblockedthreads` | Blocked threads |
| `io_e6x_e6storage_numdeadlockedthreads` | Deadlocked threads |
| `io_e6x_e6storage_numpartfileandmetadatalistingtasksinprogress` | In-progress listing tasks |
| `io_e6x_e6storage_numpartfileandmetadatalistingtasksinqueue` | Queued listing tasks |
| `io_e6x_e6storage_numthriftrequestsinprogress` | In-progress Thrift requests |
| `io_e6x_e6storage_numthriftrequestsqueued` | Queued Thrift requests |
| `io_e6x_e6storage_tablemetadatarequestsinprogress` | In-progress metadata requests |
| `io_e6x_e6storage_tablepartitionfileandmetadatarequestsinprogress` | In-progress partition requests |
| `io_e6x_e6storage_tablepartitionsrequestsinprogress` | In-progress partition list requests |
| `io_e6x_e6storage_tablestatisticsrequestsinprogress` | In-progress stats requests |
| `io_e6x_e6storage_uptime` | Storage service uptime | ✅ |

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

Note: All table names are lowercase in GreptimeDB.

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
| `io_e6x_e6engine_currentactivetasks` | Workload tracking |
| `io_e6x_e6engine_currentactivetasksrunning` | Active compute |
| `io_e6x_e6engine_currentexecutorusedmemorybytes` | Engine memory usage |
| `io_e6x_e6engine_currentexecutorallocatedmemorybytes` | Engine memory allocation (for right-sizing) |
| `io_e6x_e6engine_totalbytesread` | Data scanned (analytics cost) |
| `io_e6x_e6engine_numrowsread` | Rows scanned |
| `io_e6x_e6engine_filesreadfroms3bytes` | S3 GET + egress cost |
| `io_e6x_e6engine_filesreadfromcachebytes` | Cache hits (cost savings) |
| `io_e6x_e6engine_numspilledbyteswritten` | Disk spill (SSD cost) |
| `io_e6x_e6engine_diskcachegethitbytes` | Disk cache efficiency |
| `io_e6x_e6engine_diskcachegetmissbytes` | Disk cache misses |
| `io_e6x_e6engine_heapcachegethitbytes` | Memory cache efficiency |

#### Gateway (Query Volume)
| Metric | Purpose |
|--------|---------|
| `io_e6x_e6gateway_currentactiveconnections` | Connection count |
| `io_e6x_e6gateway_currentqueriesrunningcount` | Running queries |
| `io_e6x_e6gateway_numsucceededqueries` | Successful queries |
| `io_e6x_e6gateway_totalqueriescompletedcount` | Total queries |
| `io_e6x_e6gateway_totalqueriesfailedcount` | Failed queries (wasted cost) |
| `io_e6x_e6gateway_uptime` | Service availability |

#### Queue
| Metric | Purpose |
|--------|---------|
| `io_e6x_e6queue_currentactiverequests` | Active requests |
| `io_e6x_e6queue_currentactivetasks` | Concurrent workload |
| `io_e6x_e6queue_nume6requestssucceeded` | Completed requests |
| `io_e6x_e6queue_uptime` | Service availability |

#### Component Uptime
| Metric | Purpose |
|--------|---------|
| `io_e6x_e6xecutor_uptime` | Executor availability |
| `io_e6x_e6schema_uptime` | Schema service availability |
| `io_e6x_e6storage_uptime` | Storage service availability |

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
idle_pods = pods where (io_e6x_e6engine_currentactivetasks == 0 AND io_e6x_e6gateway_currentqueriesrunningcount == 0)
```
**Metrics needed:** `io_e6x_e6engine_currentactivetasks`, `io_e6x_e6gateway_currentqueriesrunningcount`, `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`

---

## Pod Cost Calculation

OpenCost doesn't provide direct pod costs. Calculate as:

```
pod_cpu_cost = container_cpu_allocation × node_cpu_hourly_cost
pod_memory_cost = (container_memory_allocation_bytes / 1Gi) × node_ram_hourly_cost
pod_total_cost = pod_cpu_cost + pod_memory_cost
```
