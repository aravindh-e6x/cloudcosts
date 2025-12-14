# GreptimeDB Metrics Reference

This document describes all metrics flowing into the central GreptimeDB instance.

## Databases

| Database | Source | Description |
|----------|--------|-------------|
| `vantage` | Vantage Exporter | Cloud cost data from Vantage API |
| `kubernetes` | Monitoring Agent | K8s metrics from EKS clusters |
| `poc`  | POC Cost Exporter | POC customer metrics |

---

## Vantage Database

Cloud cost metrics collected from Vantage API (90 days historical).

**Providers:** aws, gcp, azure, snowflake, databricks

### vantage_daily_cost_by_provider

Daily cost aggregated by cloud provider.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| provider | String | TAG |
| greptime_value | Float64 | FIELD (cost in USD) |

### vantage_daily_cost_by_account

Daily cost aggregated by provider and account.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| provider | String | TAG |
| account_id | String | TAG |
| account_name | String | TAG |
| greptime_value | Float64 | FIELD (cost in USD) |

### vantage_daily_cost_by_service

Daily cost aggregated by provider, account, and service.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| provider | String | TAG |
| account_id | String | TAG |
| account_name | String | TAG |
| service | String | TAG |
| greptime_value | Float64 | FIELD (cost in USD) |

---

## Kubernetes Database

Metrics collected from EKS clusters via monitoring-agent (Alloy).

**Clusters:** laminar-dev, laminar-demo

### container_cpu_usage_seconds_total

Cumulative CPU time consumed by containers.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| pod | String | TAG |
| container | String | TAG |
| node | String | TAG |
| cpu | String | TAG |
| id | String | TAG |
| image | String | TAG |
| instance | String | TAG |
| job | String | TAG |
| name | String | TAG |
| greptime_value | Float64 | FIELD (seconds) |

### container_memory_working_set_bytes

Current working set memory usage by containers.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| pod | String | TAG |
| container | String | TAG |
| node | String | TAG |
| greptime_value | Float64 | FIELD (bytes) |

### container_cpu_allocation

CPU allocation for containers (from OpenCost).

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| pod | String | TAG |
| container | String | TAG |
| node | String | TAG |
| greptime_value | Float64 | FIELD (cores) |

### container_memory_allocation_bytes

Memory allocation for containers (from OpenCost).

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| pod | String | TAG |
| container | String | TAG |
| node | String | TAG |
| greptime_value | Float64 | FIELD (bytes) |

### kube_pod_info

Information about pods.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| pod | String | TAG |
| node | String | TAG |
| host_ip | String | TAG |
| pod_ip | String | TAG |
| uid | String | TAG |
| created_by_kind | String | TAG |
| created_by_name | String | TAG |
| priority_class | String | TAG |
| host_network | String | TAG |
| greptime_value | Float64 | FIELD |

### kube_node_info

Information about nodes.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| internal_ip | String | TAG |
| provider_id | String | TAG |
| kubelet_version | String | TAG |
| container_runtime_version | String | TAG |
| kernel_version | String | TAG |
| os_image | String | TAG |
| greptime_value | Float64 | FIELD |

### kube_node_status_capacity

Node capacity for resources.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| resource | String | TAG |
| unit | String | TAG |
| greptime_value | Float64 | FIELD |

### kube_node_status_allocatable

Node allocatable resources.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| resource | String | TAG |
| unit | String | TAG |
| greptime_value | Float64 | FIELD |

### kube_pod_container_resource_requests

Pod container resource requests.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| pod | String | TAG |
| container | String | TAG |
| node | String | TAG |
| resource | String | TAG |
| unit | String | TAG |
| greptime_value | Float64 | FIELD |

### kube_pod_container_resource_limits

Pod container resource limits.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| pod | String | TAG |
| container | String | TAG |
| node | String | TAG |
| resource | String | TAG |
| unit | String | TAG |
| greptime_value | Float64 | FIELD |

### node_cpu_seconds_total

Total CPU seconds consumed by node.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| cpu | String | TAG |
| mode | String | TAG |
| greptime_value | Float64 | FIELD (seconds) |

### node_memory_MemTotal_bytes

Total memory on node.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| greptime_value | Float64 | FIELD (bytes) |

### node_memory_MemAvailable_bytes

Available memory on node.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| greptime_value | Float64 | FIELD (bytes) |

### node_total_hourly_cost

Hourly cost of node (from OpenCost).

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| instance_type | String | TAG |
| region | String | TAG |
| arch | String | TAG |
| provider_id | String | TAG |
| greptime_value | Float64 | FIELD (USD/hour) |

### kube_namespace_labels

Namespace labels.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| namespace | String | TAG |
| label_* | String | TAG (dynamic) |
| greptime_value | Float64 | FIELD |

### kube_node_labels

Node labels.

| Column | Type | Semantic |
|--------|------|----------|
| greptime_timestamp | TimestampMillisecond | TIMESTAMP |
| cluster | String | TAG |
| node | String | TAG |
| label_* | String | TAG (dynamic) |
| greptime_value | Float64 | FIELD |

---

## POC Database 

Metrics collected from POC customer Grafana instances.

### cluster_composition

Pod count by cluster and component.

| Column | Type | Semantic |
|--------|------|----------|
| ts | TimestampMillisecond | TIMESTAMP |
| e6cluster | String | TAG |
| component | String | TAG |
| pod_count | Int32 | FIELD |

### pod_specs

Pod resource specifications.

| Column | Type | Semantic |
|--------|------|----------|
| ts | TimestampMillisecond | TIMESTAMP |
| e6cluster | String | TAG |
| component | String | TAG |
| pod | String | TAG |
| node | String | FIELD |
| cpu_cores | Float64 | FIELD |
| memory_gi | Float64 | FIELD |

### resource_usage

Actual resource usage by pods.

| Column | Type | Semantic |
|--------|------|----------|
| ts | TimestampMillisecond | TIMESTAMP |
| e6cluster | String | TAG |
| component | String | TAG |
| pod | String | TAG |
| cpu_used_cores | Float64 | FIELD |
| memory_used_gi | Float64 | FIELD |

### node_packing

Node resource allocation.

| Column | Type | Semantic |
|--------|------|----------|
| ts | TimestampMillisecond | TIMESTAMP |
| node | String | TAG |
| pod_count | Int32 | FIELD |
| total_cpu_cores | Float64 | FIELD |
| total_memory_gi | Float64 | FIELD |

### workload_metrics

Application-level metrics.

| Column | Type | Semantic |
|--------|------|----------|
| ts | TimestampMillisecond | TIMESTAMP |
| e6cluster | String | TAG |
| component | String | TAG |
| metric_name | String | TAG |
| metric_value | Float64 | FIELD |

**Metric names:** uptime_seconds, flask_request_count, flask_request_duration_sum, haproxy_active_servers, haproxy_current_sessions, haproxy_responses, haproxy_sessions

### query_metrics

Query execution metrics per workspace.

| Column | Type | Semantic |
|--------|------|----------|
| ts | TimestampMillisecond | TIMESTAMP |
| e6cluster | String | TAG |
| workspace | String | TAG |
| query_count | Int32 | FIELD |
