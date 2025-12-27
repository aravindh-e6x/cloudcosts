# CloudCosts Agent - Available Metrics

Total metrics collected: **1141**

Select which metrics to keep by updating the Alloy config filter.

---

## E6 Metrics (io_e6x_*)

### Gateway (io_e6x_e6gateway_*)
- `io_e6x_e6gateway_currentactiveconnections`
- `io_e6x_e6gateway_currentqueriesqueuedcount`
- `io_e6x_e6gateway_currentqueriesrunningcount`
- `io_e6x_e6gateway_numblockedthreads`
- `io_e6x_e6gateway_numdeadlockedthreads`
- `io_e6x_e6gateway_numsucceededqueries_total`
- `io_e6x_e6gateway_queuedqueriescreatedcount_total`
- `io_e6x_e6gateway_queuedqueriesresumedcount_total`
- `io_e6x_e6gateway_totalqueriescompletedcount_total`
- `io_e6x_e6gateway_totalqueriescreatedcount_total`
- `io_e6x_e6gateway_totalqueriesfailedcount_total`
- `io_e6x_e6gateway_uptime`

### Engine (io_e6x_e6engine_*)
- `io_e6x_e6engine_currentactivetasks`
- `io_e6x_e6engine_currentactivetasksrunning`
- `io_e6x_e6engine_currentactivetaskssucceeded`
- `io_e6x_e6engine_currentactivetasksfailed`
- `io_e6x_e6engine_currentexecutorallocatedmemorybytes`
- `io_e6x_e6engine_currentexecutorusedmemorybytes`
- `io_e6x_e6engine_currentmemcachememorybytes`
- `io_e6x_e6engine_currenttotalrssbytes`
- `io_e6x_e6engine_filesreadfromcachebytes_total`
- `io_e6x_e6engine_filesreadfroms3bytes_total`
- `io_e6x_e6engine_numrowsread_total`
- `io_e6x_e6engine_numfilesread_total`
- `io_e6x_e6engine_totalbytesread_total`
- `io_e6x_e6engine_tasksrun_total`
- `io_e6x_e6engine_uptime`
- ... (70+ more engine metrics)

### Queue (io_e6x_e6queue_*)
- `io_e6x_e6queue_currentactiverequests`
- `io_e6x_e6queue_currentactivetasks`
- `io_e6x_e6queue_currentnumtasks`
- `io_e6x_e6queue_numcompletede6requests_total`
- `io_e6x_e6queue_nume6requestsfailed_total`
- `io_e6x_e6queue_nume6requestssucceeded_total`
- `io_e6x_e6queue_uptime`

### Schema (io_e6x_e6schema_*)
- `io_e6x_e6schema_numtablelistingtasksinprogress`
- `io_e6x_e6schema_numtablelistingtaskssuccess_total`
- `io_e6x_e6schema_tablepartitionsreadtasksinprogress`
- `io_e6x_e6schema_tablepartitionsreadtaskssuccess_total`
- `io_e6x_e6schema_uptime`

### Executor (io_e6x_e6xecutor_*)
- `io_e6x_e6xecutor_numblockedthreads`
- `io_e6x_e6xecutor_numdeadlockedthreads`
- `io_e6x_e6xecutor_uptime`

---

## Container Metrics (container_*)

### CPU
- `container_cpu_usage_seconds_total` ✅ ESSENTIAL
- `container_cpu_allocation` ✅ ESSENTIAL
- `container_cpu_cfs_throttled_seconds_total`
- `container_cpu_system_seconds_total`
- `container_cpu_user_seconds_total`

### Memory
- `container_memory_working_set_bytes` ✅ ESSENTIAL
- `container_memory_allocation_bytes` ✅ ESSENTIAL
- `container_memory_usage_bytes`
- `container_memory_rss`
- `container_memory_cache`

### Network
- `container_network_receive_bytes_total`
- `container_network_transmit_bytes_total`
- `container_network_receive_errors_total`
- `container_network_transmit_errors_total`

### Filesystem
- `container_fs_usage_bytes`
- `container_fs_limit_bytes`
- `container_fs_reads_bytes_total`
- `container_fs_writes_bytes_total`

### Other
- `container_gpu_allocation`
- `container_oom_events_total`
- `container_start_time_seconds`

---

## Kube State Metrics (kube_*)

### Pod
- `kube_pod_info` ✅ ESSENTIAL
- `kube_pod_labels` ✅ ESSENTIAL
- `kube_pod_status_phase` ✅ ESSENTIAL
- `kube_pod_owner`
- `kube_pod_created`
- `kube_pod_start_time`
- `kube_pod_container_resource_requests` ✅ ESSENTIAL
- `kube_pod_container_resource_limits` ✅ ESSENTIAL
- `kube_pod_container_status_running`
- `kube_pod_container_status_restarts_total`

### Node
- `kube_node_info` ✅ ESSENTIAL
- `kube_node_labels` ✅ ESSENTIAL
- `kube_node_status_capacity` ✅ ESSENTIAL
- `kube_node_status_allocatable` ✅ ESSENTIAL
- `kube_node_status_condition`
- `kube_node_role`

### Deployment
- `kube_deployment_spec_replicas`
- `kube_deployment_status_replicas`
- `kube_deployment_status_replicas_available`

### StatefulSet
- `kube_statefulset_replicas`
- `kube_statefulset_status_replicas`
- `kube_statefulset_status_replicas_ready`

### Namespace
- `kube_namespace_labels`
- `kube_namespace_status_phase`

### PVC
- `kube_persistentvolumeclaim_resource_requests_storage_bytes`
- `kube_persistentvolumeclaim_status_phase`

---

## Node Exporter Metrics (node_*)

### CPU
- `node_cpu_seconds_total` ✅ ESSENTIAL

### Memory
- `node_memory_MemTotal_bytes` ✅ ESSENTIAL
- `node_memory_MemAvailable_bytes` ✅ ESSENTIAL
- `node_memory_MemFree_bytes`
- `node_memory_Buffers_bytes`
- `node_memory_Cached_bytes`

### Filesystem
- `node_filesystem_size_bytes`
- `node_filesystem_avail_bytes`
- `node_filesystem_free_bytes`

### Network
- `node_network_receive_bytes_total`
- `node_network_transmit_bytes_total`

### Disk
- `node_disk_read_bytes_total`
- `node_disk_written_bytes_total`
- `node_disk_io_time_seconds_total`

---

## OpenCost Metrics (opencost_* / kubecost_* / node_*_cost)

### Cost
- `node_total_hourly_cost` ✅ ESSENTIAL
- `node_cpu_hourly_cost`
- `node_ram_hourly_cost`
- `node_gpu_hourly_cost`
- `pv_hourly_cost`

### Kubecost
- `kubecost_cluster_info`
- `kubecost_cluster_management_cost`
- `kubecost_node_is_spot`
- `kubecost_network_internet_egress_cost`
- `kubecost_network_region_egress_cost`
- `kubecost_network_zone_egress_cost`

### OpenCost
- `opencost_build_info`

---

## Kubelet Metrics (kubelet_*)

- `kubelet_running_pods`
- `kubelet_running_containers`
- `kubelet_active_pods`
- `kubelet_volume_stats_available_bytes`
- `kubelet_volume_stats_capacity_bytes`

---

## Skip These (not needed for cost analysis)

- `go_*` - Go runtime metrics (220+ metrics)
- `apiserver_*` - API server internals
- `authentication_*` - Auth metrics
- `process_*` - Process metrics
- `rest_client_*` - REST client metrics
- `workqueue_*` - Work queue metrics
- `scrape_*` - Scrape metrics
- `up` - Target up metric

---

## Recommended Filter

For cost analysis, keep these metric prefixes:
```
container_cpu_usage_seconds_total
container_memory_working_set_bytes
container_cpu_allocation
container_memory_allocation_bytes
container_gpu_allocation
container_network_.*
container_fs_usage_bytes
kube_pod_.*
kube_node_.*
kube_namespace_labels
kube_deployment_.*
kube_statefulset_.*
node_cpu_seconds_total
node_memory_Mem.*
node_filesystem_.*
node_total_hourly_cost
node_cpu_hourly_cost
node_ram_hourly_cost
opencost_.*
kubecost_.*
io_e6x_.*
```

This reduces ~1141 metrics to ~200-300 essential metrics.
