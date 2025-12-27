# CloudCosts Simulation Plan

## Config

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
```

## Hierarchy

```
EKS Cluster = Workspace (1:1)
  │
  ├── Namespace: workspace (shared workspace-level components)
  │     ├── Gateway pod(s)
  │     ├── Schema pod(s)
  │     └── Storage pod(s)
  │
  ├── Namespace: <e6_cluster_1> (E6 cluster level)
  │     ├── Executor pod(s)
  │     ├── Queue pod(s)
  │     └── Planner pod(s)
  │
  └── Namespace: <e6_cluster_2>
        ├── Executor pod(s)
        ├── Queue pod(s)
        └── Planner pod(s)
```

---

## Metrics to Track

Track all metrics marked with ✅ in `METRICS.md`.

### Questions to Answer

**Packing** - Bin packing efficiency
**Sizing** - Sized correctly during usage
**Gaps** - No usage, are we releasing back / scaling down

1. Number of clusters and number of pods for each component in cluster
2. Spec of each pod in cluster - and packing in node
3. Is the spec appropriate for the volume of queries / workload



# Dashboar

  ┌─────────────────────────────────────────────────────────────────────┐
  │  condenast-prod-eks          us-east-1          Account: 123456789 │
  │  Dec 25, 2024                                                      │
  ├─────────────────────────────────────────────────────────────────────┤
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
  │  │ $1,084   │  │ 8        │  │ 26       │  │ 2 E6 Clusters    │   │
  │  │ today    │  │ nodes    │  │ pods     │  │ analytics        │   │
  │  │ $45/hr → │  │ click →  │  │ click →  │  │ reporting        │   │
  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
  └─────────────────────────────────────────────────────────────────────┘

  Metrics:
  | Card       | Metric                                              |
  |------------|-----------------------------------------------------|
  | Cost       | `node_total_hourly_cost` (sum)                      |
  | Nodes      | `kube_node_info` (count)                            |
  | Pods       | `kube_pod_info` (count)                             |
  | E6 Clusters| Namespaces from `kube_pod_labels`                   |


  ┌─────────────────────────────────────────────────────────────────────┐
  │  NODE PACKING                                                       │
  ├─────────────────────────────────────────────────────────────────────┤
  │  TODAY AVG: 67%                              NOW: 71%               │
  ├─────────────────────────────────────────────────────────────────────┤
  │  CURRENT NODE UTILIZATION                                          │
  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
  │  │ 92%│ │ 85%│ │ 78%│ │ 71%│ │ 65%│ │ 58%│ │ 45%│ │ 38%│          │
  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │
  │  node-1 node-2 node-3 node-4 node-5 node-6 node-7 node-8          │
  ├─────────────────────────────────────────────────────────────────────┤
  │  Click node for time-series                                        │
  └─────────────────────────────────────────────────────────────────────┘

  | Metric     | Value                                                  |
  |------------|--------------------------------------------------------|
  | Today Avg  | Average packing % across all nodes for the day         |
  | Now        | Current packing % (latest data point)                  |
  | Node grid  | Shows current state per node                           |
  | Click node | Opens time-series for that node's packing over the day |

  The grid shows "now", the summary shows both "today avg" and "now".

  Metrics:
  | Row        | Metric                                              |
  |------------|-----------------------------------------------------|
  | Packing %  | `container_cpu_allocation` / `kube_node_status_allocatable{resource="cpu"}` |
  | Per node   | Same formula, grouped by node                       |

  Sizing (Right-Sizing Analysis)

  ┌─────────────────────────────────────────────────┐
  │  RIGHT-SIZING                                   │
  ├─────────────────────────────────────────────────┤
  │  CPU                          Memory            │
  │  Requested ████████████ 32    Requested ████ 64GB│
  │  Actual    ██████░░░░░░ 18    Actual    ██░░ 28GB│
  │            56% utilized                 44%     │
  ├─────────────────────────────────────────────────┤
  │  BY COMPONENT                                   │
  │  Gateway   ████████░░ 82%    ████████░░ 78%    │
  │  Schema    ██████░░░░ 61%    █████░░░░░ 52%    │
  │  Storage   ███████░░░ 74%    ██████░░░░ 65%    │
  │  Executor  █████░░░░░ 48%    ████░░░░░░ 38%    │
  │  Queue     ████████░░ 85%    ███████░░░ 72%    │
  │  Planner   ██████░░░░ 58%    █████░░░░░ 51%    │
  └─────────────────────────────────────────────────┘

  Metrics:
  | Row            | Metric                                          |
  |----------------|-------------------------------------------------|
  | CPU Requested  | `kube_pod_container_resource_requests{resource="cpu"}` |
  | CPU Actual     | `container_cpu_usage_seconds_total` (rate)      |
  | Mem Requested  | `kube_pod_container_resource_requests{resource="memory"}` |
  | Mem Actual     | `container_memory_working_set_bytes`            |

  Gaps/Idle (Idle Detection)

  ┌─────────────────────────────────────────────────┐
  │  ACTIVITY & IDLE DETECTION                      │
  ├─────────────────────────────────────────────────┤
  │  E6 CLUSTER      QUERIES/HR   EXECUTORS  STATUS │
  │  ─────────────────────────────────────────────  │
  │  analytics       156          4 pods     ✅ Active│
  │  reporting       0            2 pods     ⚠️ Idle │
  │                                                 │
  │  IDLE PODS (0 CPU in last hour)                │
  │  • executor-reporting-0                         │
  │  • executor-reporting-1                         │
  │  • queue-reporting-0                            │
  └─────────────────────────────────────────────────┘

  Metrics:
  | Row          | Metric                                            |
  |--------------|---------------------------------------------------|
  | Queries/hr   | `io_e6x_E6Gateway_TotalQueriesCompletedCount` (rate) |
  | Executors    | `kube_pod_info` (count where component=executor)  |
  | Idle Pods    | Pods where `container_cpu_usage_seconds_total` ≈ 0 |

  Cost Breakdown

  ┌─────────────────────────────────────────────────┐
  │  COST BREAKDOWN                    $45.20/hr   │
  ├─────────────────────────────────────────────────┤
  │  BY COMPONENT                                   │
  │  Executor  ████████████████████ $28.40    63%  │
  │  Gateway   ██████               $4.20      9%  │
  │  Storage   █████                $3.80      8%  │
  │  Schema    ████                 $2.10      5%  │
  │  Queue     ███                  $1.90      4%  │
  │  Planner   ██                   $1.20      3%  │
  │  System    ████                 $3.60      8%  │
  │                                                 │
  │  BY E6 CLUSTER                                 │
  │  analytics   $32.50/hr (72%)                   │
  │  reporting   $8.90/hr  (20%)                   │
  │  workspace   $3.80/hr  (8%)                    │
  └─────────────────────────────────────────────────┘

  Metrics:
  | Row              | Metric                                          |
  |------------------|-------------------------------------------------|
  | Component cost   | `container_cpu_allocation` × `node_cpu_hourly_cost` + `container_memory_allocation_bytes` × `node_ram_hourly_cost` |
  | By E6 Cluster    | Same formula, grouped by namespace              |

  ┌─────────────────────────────────────────────────────────────────────┐
  │  IO & DATA TRANSFER                                                 │
  ├─────────────────────────────────────────────────────────────────────┤
  │  TODAY                                          NOW (rate/hr)       │
  ├─────────────────────────────────────────────────────────────────────┤
  │  S3 READS                                                          │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │  ████████████████████████████  1.2 TB           │  45 GB/hr  │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  │                                                                     │
  │  NETWORK                                                           │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │  Ingress (↓)  ████████████░░░░░░░░  850 GB      │  32 GB/hr  │  │
  │  │  Egress (↑)   ██████░░░░░░░░░░░░░░  420 GB      │  18 GB/hr  │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  │                                                                     │
  │  DATA PROCESSED                                                    │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │  Bytes Read   ████████████████████  2.1 TB      │  85 GB/hr  │  │
  │  │  Rows Read    ████████████████████  48.2 B      │  1.9 B/hr  │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  ├─────────────────────────────────────────────────────────────────────┤
  │  BY E6 CLUSTER                                                     │
  │  ┌────────────┬──────────┬──────────┬─────────────────┐            │
  │  │ Cluster    │ S3 Reads │ Network  │ Data Processed  │            │
  │  ├────────────┼──────────┼──────────┼─────────────────┤            │
  │  │ analytics  │ 980 GB   │ 1.1 TB   │ 1.8 TB          │            │
  │  │ reporting  │ 220 GB   │ 170 GB   │ 300 GB          │            │
  │  └────────────┴──────────┴──────────┴─────────────────┘            │
  └─────────────────────────────────────────────────────────────────────┘

  Metrics:
  | Row            | Metric                                          |
  |----------------|-------------------------------------------------|
  | S3 Reads       | `io_e6x_E6Engine_FilesReadFromS3Bytes`          |
  | Network In     | `container_network_receive_bytes_total`         |
  | Network Out    | `container_network_transmit_bytes_total`        |
  | Bytes Read     | `io_e6x_E6Engine_TotalBytesRead`                |
  | Rows Read      | `io_e6x_E6Engine_NumRowsRead`                   |

  ┌─────────────────────────────────────────────────────────────────────┐
  │  E6 ENGINE USAGE                                                    │
  ├─────────────────────────────────────────────────────────────────────┤
  │  TODAY                                          NOW                 │
  ├─────────────────────────────────────────────────────────────────────┤
  │  QUERIES                                                           │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │  Completed     ████████████████████  12,450     │  156/hr    │  │
  │  │  Succeeded     ████████████████████  12,180     │  152/hr    │  │
  │  │  Failed        █░░░░░░░░░░░░░░░░░░░  270        │  4/hr      │  │
  │  │  Running       ─────────────────────            │  8         │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  │                                                                     │
  │  TASKS                                                             │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │  Active        ─────────────────────            │  24        │  │
  │  │  Running       ─────────────────────            │  18        │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  │                                                                     │
  │  CONNECTIONS                                                       │
  │  ┌──────────────────────────────────────────────────────────────┐  │
  │  │  Active        ─────────────────────            │  42        │  │
  │  └──────────────────────────────────────────────────────────────┘  │
  ├─────────────────────────────────────────────────────────────────────┤
  │  BY E6 CLUSTER                                                     │
  │  ┌────────────┬──────────┬──────────┬──────────┬─────────────────┐ │
  │  │ Cluster    │ Queries  │ Failed   │ Tasks    │ Connections     │ │
  │  ├────────────┼──────────┼──────────┼──────────┼─────────────────┤ │
  │  │ analytics  │ 10,200   │ 180      │ 20       │ 35              │ │
  │  │ reporting  │ 2,250    │ 90       │ 4        │ 7               │ │
  │  └────────────┴──────────┴──────────┴──────────┴─────────────────┘ │
  └─────────────────────────────────────────────────────────────────────┘

  Metrics used:

  | Row                | Metric                                      |
  |--------------------|---------------------------------------------|
  | Queries Completed  | io_e6x_E6Gateway_TotalQueriesCompletedCount |
  | Queries Succeeded  | io_e6x_E6Gateway_NumSucceededQueries        |
  | Queries Failed     | io_e6x_E6Gateway_TotalQueriesFailedCount    |
  | Queries Running    | io_e6x_E6Gateway_CurrentQueriesRunningCount |
  | Tasks Active       | io_e6x_E6Engine_CurrentActiveTasks          |
  | Tasks Running      | io_e6x_E6Engine_CurrentActiveTasksRunning   |
  | Connections Active | io_e6x_E6Gateway_CurrentActiveConnections   |