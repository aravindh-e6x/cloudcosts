# Mock Data Generator Plan

## Overview

A Python application that generates realistic mock data for the CloudCosts dashboard, simulating multiple EKS clusters with E6 workloads.

---

## Database Design

**Single database: `kubernetes`**

All tables include `cluster` column to identify the EKS cluster (scales to 1000+ clusters).

---

## Table Schemas (Cross-Verified with Real Sources)

**Column naming:**
- `eks_cluster` - EKS cluster name (for K8s/OpenCost metrics)
- `e6_cluster` - E6 cluster name (for E6 metrics)
- `e6_workspace` - Workspace name (links E6 to EKS)
- `value` - Metric value
- `ts` - Timestamp

### OpenCost Metrics (OC)

#### `node_total_hourly_cost`
**Source:** OpenCost
**Real Labels:** `node`, `cluster`, `instance_type`, `region`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | cluster label | `condenast-prod-eks` |
| `node` | STRING | node label | `condenast-node-0` |
| `instance_type` | STRING | instance_type label | `m5.2xlarge` |
| `region` | STRING | region label | `us-east-1` |
| `value` | FLOAT64 | metric value | `0.384` ($/hr) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `node_cpu_hourly_cost`
**Source:** OpenCost
**Real Labels:** `node`, `cluster`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | cluster label | `condenast-prod-eks` |
| `node` | STRING | node label | `condenast-node-0` |
| `value` | FLOAT64 | metric value | `0.192` ($/hr for CPU) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `node_ram_hourly_cost`
**Source:** OpenCost
**Real Labels:** `node`, `cluster`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | cluster label | `condenast-prod-eks` |
| `node` | STRING | node label | `condenast-node-0` |
| `value` | FLOAT64 | metric value | `0.192` ($/hr for RAM) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `container_cpu_allocation`
**Source:** OpenCost
**Real Labels:** `container`, `namespace`, `pod`, `node`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `container` | STRING | container label | `executor` |
| `node` | STRING | node label | `condenast-node-2` |
| `value` | FLOAT64 | CPU cores allocated | `4.0` |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `container_memory_allocation_bytes`
**Source:** OpenCost
**Real Labels:** `container`, `namespace`, `pod`, `node`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `container` | STRING | container label | `executor` |
| `node` | STRING | node label | `condenast-node-2` |
| `value` | FLOAT64 | memory bytes | `8589934592` (8 GB) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

---

### kube-state-metrics (KSM)

#### `kube_node_info`
**Source:** KSM
**Real Labels:** `node`, `kernel_version`, `os_image`, `container_runtime_version`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `node` | STRING | node label | `condenast-node-0` |
| `kernel_version` | STRING | kernel_version label | `5.10.0-aws` |
| `os_image` | STRING | os_image label | `Amazon Linux 2` |
| `container_runtime_version` | STRING | container_runtime_version | `containerd://1.6.6` |
| `value` | FLOAT64 | always 1 | `1` |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `kube_node_labels`
**Source:** KSM
**Real Labels:** `node`, `label_*` (dynamic)

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `node` | STRING | node label | `condenast-node-0` |
| `label_node_kubernetes_io_instance_type` | STRING | instance type label | `m5.2xlarge` |
| `label_topology_kubernetes_io_region` | STRING | region label | `us-east-1` |
| `label_topology_kubernetes_io_zone` | STRING | zone label | `us-east-1a` |
| `value` | FLOAT64 | always 1 | `1` |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `kube_node_status_allocatable`
**Source:** KSM
**Real Labels:** `node`, `resource`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `node` | STRING | node label | `condenast-node-0` |
| `resource` | STRING | resource label | `cpu` or `memory` |
| `value` | FLOAT64 | allocatable value | `8` (cores) or `34359738368` (32GB) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `kube_pod_info`
**Source:** KSM
**Real Labels:** `pod`, `namespace`, `node`, `created_by_kind`, `created_by_name`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `node` | STRING | node label | `condenast-node-2` |
| `created_by_kind` | STRING | created_by_kind label | `StatefulSet` |
| `created_by_name` | STRING | created_by_name label | `executor` |
| `value` | FLOAT64 | always 1 | `1` |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `kube_pod_labels`
**Source:** KSM
**Real Labels:** `pod`, `namespace`, `label_*` (dynamic)

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `label_component` | STRING | component label | `executor` |
| `label_app` | STRING | app label | `e6data` |
| `value` | FLOAT64 | always 1 | `1` |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `kube_pod_container_resource_requests`
**Source:** KSM
**Real Labels:** `pod`, `namespace`, `container`, `resource`, `unit`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `container` | STRING | container label | `executor` |
| `resource` | STRING | resource label | `cpu` or `memory` |
| `unit` | STRING | unit label | `core` or `byte` |
| `value` | FLOAT64 | request value | `4` (cores) or `8589934592` (8GB) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

---

### cAdvisor Metrics (CA)

#### `container_cpu_usage_seconds_total`
**Source:** cAdvisor
**Real Labels:** `pod`, `namespace`, `container`, `node`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `container` | STRING | container label | `executor` |
| `node` | STRING | node label | `condenast-node-2` |
| `value` | FLOAT64 | counter (seconds) | `12345.67` (cumulative) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

**Note:** This is a counter that increases over time. Rate = (current - previous) / interval.

#### `container_memory_working_set_bytes`
**Source:** cAdvisor
**Real Labels:** `pod`, `namespace`, `container`, `node`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `container` | STRING | container label | `executor` |
| `node` | STRING | node label | `condenast-node-2` |
| `value` | FLOAT64 | bytes | `5368709120` (5 GB) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `container_network_receive_bytes_total`
**Source:** cAdvisor
**Real Labels:** `pod`, `namespace`, `container`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `value` | FLOAT64 | counter (bytes) | `1073741824` (1 GB cumulative) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `container_network_transmit_bytes_total`
**Source:** cAdvisor
**Real Labels:** `pod`, `namespace`, `container`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `eks_cluster` | STRING | added for multi-cluster | `condenast-prod-eks` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `value` | FLOAT64 | counter (bytes) | `536870912` (512 MB cumulative) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

---

### E6 Gateway Metrics

#### `io_e6x_E6Gateway_TotalQueriesCompletedCount`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label (e6 cluster name) | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `workspace` |
| `pod` | STRING | pod label | `gateway-workspace-0` |
| `component` | STRING | component label | `gateway` |
| `value` | FLOAT64 | counter | `12450` (cumulative) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Gateway_NumSucceededQueries`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `workspace` |
| `pod` | STRING | pod label | `gateway-workspace-0` |
| `component` | STRING | component label | `gateway` |
| `value` | FLOAT64 | counter | `12180` |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Gateway_TotalQueriesFailedCount`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `workspace` |
| `pod` | STRING | pod label | `gateway-workspace-0` |
| `component` | STRING | component label | `gateway` |
| `value` | FLOAT64 | counter | `270` |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Gateway_CurrentQueriesRunningCount`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `workspace` |
| `pod` | STRING | pod label | `gateway-workspace-0` |
| `component` | STRING | component label | `gateway` |
| `value` | FLOAT64 | gauge | `8` (current) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Gateway_CurrentActiveConnections`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `workspace` |
| `pod` | STRING | pod label | `gateway-workspace-0` |
| `component` | STRING | component label | `gateway` |
| `value` | FLOAT64 | gauge | `42` (current) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

---

### E6 Engine Metrics

#### `io_e6x_E6Engine_CurrentActiveTasks`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`, `e6uuid`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `component` | STRING | component label | `executor` |
| `value` | FLOAT64 | gauge | `24` (current) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Engine_CurrentActiveTasksRunning`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`, `e6uuid`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `component` | STRING | component label | `executor` |
| `value` | FLOAT64 | gauge | `18` (current) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Engine_FilesReadFromS3Bytes`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`, `e6uuid`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `component` | STRING | component label | `executor` |
| `value` | FLOAT64 | counter (bytes) | `1288490188800` (1.2 TB cumulative) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Engine_TotalBytesRead`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`, `e6uuid`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `component` | STRING | component label | `executor` |
| `value` | FLOAT64 | counter (bytes) | `2306867225600` (2.1 TB cumulative) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

#### `io_e6x_E6Engine_NumRowsRead`
**Source:** E6 JMX
**Real Labels:** `cluster`, `workspace`, `namespace`, `pod`, `component`, `container`, `e6uuid`

| Column | Type | Real Source | Mock Value |
|--------|------|-------------|------------|
| `e6_cluster` | STRING | cluster label | `analytics` |
| `e6_workspace` | STRING | workspace label | `condenast` |
| `namespace` | STRING | namespace label | `analytics` |
| `pod` | STRING | pod label | `executor-analytics-0` |
| `component` | STRING | component label | `executor` |
| `value` | FLOAT64 | counter | `48200000000` (48.2 billion rows) |
| `ts` | TIMESTAMP | scrape time | `2024-12-26 10:00:00` |

---

## Label Mapping Summary

| Source | Real Label | Mock Column | Description |
|--------|------------|-------------|-------------|
| OpenCost | `cluster` | `eks_cluster` | EKS cluster name (e.g., `condenast-prod-eks`) |
| KSM | (none, added) | `eks_cluster` | EKS cluster name |
| cAdvisor | (none, added) | `eks_cluster` | EKS cluster name |
| E6 Metrics | `cluster` | `e6_cluster` | E6 cluster name (e.g., `analytics`) |
| E6 Metrics | `workspace` | `e6_workspace` | Workspace name (e.g., `condenast`) |

**Important:**
- K8s/OpenCost metrics use `eks_cluster` for the EKS cluster name
- E6 metrics use `e6_cluster` for E6 cluster name and `e6_workspace` to identify the workspace
- To link E6 metrics to K8s metrics, join on `e6_workspace` = workspace name (which maps to EKS cluster)

---

## Configuration

### config.yaml

```yaml
workspaces:
  - name: condenast
    eks_cluster: condenast-prod-eks
    region: us-east-1
    account_id: "123456789012"
    e6_clusters:
      - analytics
      - reporting

  - name: cisco
    eks_cluster: cisco-prod-eks
    region: eu-west-1
    account_id: "234567890123"
    e6_clusters:
      - emea
      - apac

  - name: freshworks
    eks_cluster: freshworks-eks
    region: us-west-2
    account_id: "345678901234"
    e6_clusters:
      - prod

  - name: swiggy
    eks_cluster: swiggy-eks
    region: ap-south-1
    account_id: "456789012345"
    e6_clusters:
      - main
      - batch
      - realtime

generation:
  start_date: "2024-12-20"
  end_date: "2024-12-26"
  interval_minutes: 5

greptimedb:
  host: localhost
  port: 4000
  user: e6data
  password: cloudcosts
  database: kubernetes
```

---

## Constants

### Instance Types

| Type | vCPU | Memory | Cost/hr | CPU Cost/hr | RAM Cost/hr |
|------|------|--------|---------|-------------|-------------|
| m5.xlarge | 4 | 16 GB | $0.192 | $0.096 | $0.096 |
| m5.2xlarge | 8 | 32 GB | $0.384 | $0.192 | $0.192 |
| m5.4xlarge | 16 | 64 GB | $0.768 | $0.384 | $0.384 |
| r5.xlarge | 4 | 32 GB | $0.252 | $0.084 | $0.168 |
| r5.2xlarge | 8 | 64 GB | $0.504 | $0.168 | $0.336 |
| c5.xlarge | 4 | 8 GB | $0.170 | $0.136 | $0.034 |
| c5.2xlarge | 8 | 16 GB | $0.340 | $0.272 | $0.068 |

### Component Specs

| Component | CPU Request | Memory Request | Namespace |
|-----------|-------------|----------------|-----------|
| gateway | 2 | 4 GB | workspace |
| schema | 1 | 2 GB | workspace |
| storage | 2 | 4 GB | workspace |
| executor | 4 | 8 GB | e6_cluster |
| queue | 1 | 2 GB | e6_cluster |
| planner | 1 | 2 GB | e6_cluster |

### Pod Counts (Dynamic)

| Component | Location | Count |
|-----------|----------|-------|
| Gateway | workspace namespace | 1-3 (scales with e6_cluster count) |
| Schema | workspace namespace | 1-2 |
| Storage | workspace namespace | 1-2 |
| Executor | e6_cluster namespace | 2-8 per cluster |
| Queue | e6_cluster namespace | 1-2 per cluster |
| Planner | e6_cluster namespace | 1 per cluster |

---

## Expected Output

### Data Volume

| Metric | Per Workspace/Day | 4 Workspaces × 7 Days |
|--------|-------------------|----------------------|
| Node metrics | ~2,880 (8 nodes × 288 intervals × 6 tables) | ~80,640 |
| Pod metrics | ~14,400 (25 pods × 288 × 2 tables) | ~403,200 |
| Container metrics | ~43,200 (25 pods × 288 × 6 tables) | ~1,209,600 |
| E6 metrics | ~5,760 (2 clusters × 288 × 10 tables) | ~161,280 |
| **Total** | **~66,240** | **~1.85M records** |
