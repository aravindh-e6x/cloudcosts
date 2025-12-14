# CloudCosts

Central monitoring stack for collecting and visualizing cloud infrastructure costs and metrics.

## Structure

```
├── eks/                  # eksctl config for EKS cluster
├── k3s/                  # CloudFormation for k3s single-node
├── monitoring-stack/     # Central Helm chart (Grafana, GreptimeDB, exporters)
├── monitoring-agent/     # Agent Helm chart (deploy to each EKS cluster)
├── irsa/                 # IAM roles and policies for IRSA (EKS only)
├── poc-cost-exporter/    # Python exporter for POC customer metrics
└── vantage-exporter/     # Python exporter for Vantage cost data
```

## Setup

```bash
cp .env.example .env
# Edit .env with actual values
source .env
```

## Deploy Central Stack

Deploy once in a single cluster. This is the central hub that receives metrics from all agents.

```bash
cd monitoring-stack
task install    # or task upgrade
```

**Deploys:**
- GreptimeDB (time-series database with S3 backend)
- Grafana (dashboards, alerting)
- Alloy CloudWatch Exporter (AWS metrics from multiple accounts)
- Vantage Exporter (cost data from Vantage API)
- POC Cost Exporter (customer POC metrics from e6.run Grafana/Mimir)
- ALB Ingress for Grafana and GreptimeDB

**Resource Requirements:**

| Workload | CPU Request | Memory Request |
|----------|-------------|----------------|
| GreptimeDB | 500m | 2Gi |
| Grafana | 250m | 512Mi |
| CloudWatch Exporter | 100m | 256Mi |
| Vantage Exporter | 50m | 64Mi |
| POC Cost Exporter | 50m | 64Mi |
| **Total** | **950m** | **~2.9Gi** |

## Deploy Agent to EKS Clusters

Deploy to each EKS cluster you want to monitor. Agents push metrics to the central GreptimeDB.

```bash
cd monitoring-agent
task install CLUSTER_NAME=my-cluster
```

**Deploys:**
- Alloy (metrics collector)
- Kube State Metrics
- Node Exporter
- OpenCost

## Create IRSA Roles

Run once in the central cluster's AWS account.

```bash
cd irsa
task create-all
```

## POC Cost Exporter

Pulls e6data cluster metrics from customer Mimir (via Grafana datasource proxy) and writes structured data to GreptimeDB.

**Configuration:** Add customers in `monitoring-stack/values.yaml` under `pocCostExporter.customers`.

**Tables created (per customer database):**

### cluster_composition
Pod count per cluster per component.

| Field | Type | Description |
|-------|------|-------------|
| ts | TIMESTAMP | Collection timestamp |
| e6cluster | STRING | e6data cluster name |
| component | STRING | Component type (planner, executor, etc.) |
| pod_count | INT | Number of pods |

### pod_specs
CPU and memory requests per pod.

| Field | Type | Description |
|-------|------|-------------|
| ts | TIMESTAMP | Collection timestamp |
| e6cluster | STRING | e6data cluster name |
| component | STRING | Component type |
| pod | STRING | Pod name |
| node | STRING | Node where pod runs |
| cpu_cores | DOUBLE | CPU cores requested |
| memory_gi | DOUBLE | Memory requested (GiB) |

### node_packing
Aggregated resource allocation per node.

| Field | Type | Description |
|-------|------|-------------|
| ts | TIMESTAMP | Collection timestamp |
| node | STRING | Node name |
| pod_count | INT | Number of pods on node |
| total_cpu_cores | DOUBLE | Total CPU allocated |
| total_memory_gi | DOUBLE | Total memory allocated (GiB) |

### resource_usage
Actual resource consumption per pod.

| Field | Type | Description |
|-------|------|-------------|
| ts | TIMESTAMP | Collection timestamp |
| e6cluster | STRING | e6data cluster name |
| component | STRING | Component type |
| pod | STRING | Pod name |
| cpu_used_cores | DOUBLE | CPU usage (5m rate) |
| memory_used_gi | DOUBLE | Memory usage (GiB) |

### query_metrics
Query volume per workspace.

| Field | Type | Description |
|-------|------|-------------|
| ts | TIMESTAMP | Collection timestamp |
| e6cluster | STRING | e6data cluster name |
| workspace | STRING | e6data workspace name |
| query_count | DOUBLE | Queries in last 5m |

### workload_metrics
HAProxy, Flask, and cluster metrics.

| Field | Type | Description |
|-------|------|-------------|
| ts | TIMESTAMP | Collection timestamp |
| e6cluster | STRING | e6data cluster name |
| component | STRING | haproxy, flask, or cluster |
| metric_name | STRING | Metric name (e.g., haproxy_sessions, uptime_seconds) |
| metric_value | DOUBLE | Metric value |

## Vantage Exporter

Fetches cloud cost data from Vantage API and pushes to GreptimeDB via Prometheus remote write.

**Configuration:** Set `VANTAGE_API_TOKEN` in `.env`.

**Metrics pushed to GreptimeDB (database: vantage):**

### vantage_daily_cost_by_provider
Daily costs aggregated by cloud provider.

| Label | Description |
|-------|-------------|
| provider | Cloud provider (aws, azure, gcp, databricks, snowflake) |

Value: Daily cost in USD

### vantage_daily_cost_by_account
Daily costs per cloud account.

| Label | Description |
|-------|-------------|
| provider | Cloud provider |
| account_id | AWS account ID, Azure subscription, GCP project |
| account_name | Human-readable account name |

Value: Daily cost in USD

### vantage_daily_cost_by_service
Daily costs per service within each account.

| Label | Description |
|-------|-------------|
| provider | Cloud provider |
| account_id | Account identifier |
| account_name | Human-readable account name |
| service | Service name (e.g., Amazon EC2, Azure VMs) |

Value: Daily cost in USD

### vantage_cost_report
Costs from configured Vantage cost reports (for POC customers).

| Label | Description |
|-------|-------------|
| report_token | Vantage cost report token |
| report_name | Human-readable report name |
| provider | Cloud provider |

Value: Daily cost in USD

## Endpoints

- Grafana: `https://grafana.cloudcosts.in`
- GreptimeDB: `https://greptimedb.cloudcosts.in`
