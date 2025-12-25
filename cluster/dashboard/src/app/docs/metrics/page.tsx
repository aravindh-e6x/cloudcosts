"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "laminar-ui"
import { Server, Box, DollarSign, Cloud, Cpu } from "lucide-react"

interface MetricDefinition {
  name: string
  description: string
  fields: { name: string; type: string; description: string }[]
  usage: string
}

const kubernetesMetrics: MetricDefinition[] = [
  {
    name: "kube_node_info",
    description: "Information about Kubernetes nodes in the cluster",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name/identifier" },
      { name: "node", type: "string", description: "Node name" },
      { name: "internal_ip", type: "string", description: "Node internal IP address" },
      { name: "kubelet_version", type: "string", description: "Kubelet version" },
      { name: "container_runtime_version", type: "string", description: "Container runtime version" },
      { name: "os_image", type: "string", description: "OS image name" },
      { name: "provider_id", type: "string", description: "Cloud provider node ID" },
      { name: "greptime_timestamp", type: "timestamp", description: "When the metric was recorded" },
      { name: "greptime_value", type: "float", description: "Always 1 (info metric)" },
    ],
    usage: "Used to list all nodes in a cluster and track node count over time",
  },
  {
    name: "kube_pod_info",
    description: "Information about Kubernetes pods",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Pod namespace" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "node", type: "string", description: "Node the pod is scheduled on" },
      { name: "created_by_kind", type: "string", description: "Owner kind (Deployment, DaemonSet, etc.)" },
      { name: "created_by_name", type: "string", description: "Owner name" },
      { name: "host_ip", type: "string", description: "Host IP address" },
      { name: "pod_ip", type: "string", description: "Pod IP address" },
      { name: "priority_class", type: "string", description: "Pod priority class" },
      { name: "uid", type: "string", description: "Pod UID" },
      { name: "greptime_timestamp", type: "timestamp", description: "When the metric was recorded" },
      { name: "greptime_value", type: "float", description: "Always 1 (info metric)" },
    ],
    usage: "Used to list pods, track pod count, and map pods to nodes/namespaces",
  },
  {
    name: "kube_node_status_capacity",
    description: "Total capacity of resources on each node",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "resource", type: "string", description: "Resource type (cpu, memory, pods)" },
      { name: "greptime_value", type: "float", description: "Capacity value (cores for cpu, bytes for memory)" },
    ],
    usage: "Used to show total CPU/memory capacity per node",
  },
  {
    name: "kube_node_status_allocatable",
    description: "Allocatable resources on each node (capacity minus system reserved)",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "resource", type: "string", description: "Resource type (cpu, memory, pods)" },
      { name: "greptime_value", type: "float", description: "Allocatable value" },
    ],
    usage: "Used to calculate pod capacity limits and available resources",
  },
  {
    name: "kube_node_labels",
    description: "Labels attached to Kubernetes nodes",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "label_eks_amazonaws_com_capacityType", type: "string", description: "EKS capacity type (SPOT, ON_DEMAND)" },
      { name: "label_*", type: "string", description: "Other node labels as columns" },
    ],
    usage: "Used to identify spot vs on-demand nodes for cost breakdown",
  },
  {
    name: "kube_namespace_labels",
    description: "Labels attached to Kubernetes namespaces",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Namespace name" },
      { name: "label_*", type: "string", description: "Namespace labels as columns" },
    ],
    usage: "Used to group namespaces by team, environment, or other labels",
  },
  {
    name: "kube_pod_container_resource_requests",
    description: "Resource requests per container (guaranteed resources)",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Namespace" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "resource", type: "string", description: "Resource type (cpu, memory)" },
      { name: "unit", type: "string", description: "Resource unit (core, byte)" },
      { name: "uid", type: "string", description: "Pod UID" },
      { name: "greptime_value", type: "float", description: "Requested value" },
    ],
    usage: "Used for capacity planning and cost allocation based on requests",
  },
  {
    name: "kube_pod_container_resource_limits",
    description: "Resource limits per container (max allowed resources)",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Namespace" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "resource", type: "string", description: "Resource type (cpu, memory)" },
      { name: "unit", type: "string", description: "Resource unit (core, byte)" },
      { name: "uid", type: "string", description: "Pod UID" },
      { name: "greptime_value", type: "float", description: "Limit value" },
    ],
    usage: "Used to identify over-provisioned containers and potential throttling",
  },
  {
    name: "opencost_build_info",
    description: "OpenCost version and build information",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "version", type: "string", description: "OpenCost version" },
      { name: "revision", type: "string", description: "Git revision/commit hash" },
      { name: "greptime_value", type: "float", description: "Always 1 (info metric)" },
    ],
    usage: "Used to track OpenCost deployment versions across clusters",
  },
]

const containerMetrics: MetricDefinition[] = [
  {
    name: "container_cpu_allocation",
    description: "CPU cores allocated (requested) per container",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Namespace" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "greptime_timestamp", type: "timestamp", description: "When the metric was recorded" },
      { name: "greptime_value", type: "float", description: "CPU cores allocated" },
    ],
    usage: "Used to calculate CPU allocation per pod/namespace and estimate costs",
  },
  {
    name: "container_memory_allocation_bytes",
    description: "Memory bytes allocated (requested) per container",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Namespace" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "greptime_timestamp", type: "timestamp", description: "When the metric was recorded" },
      { name: "greptime_value", type: "float", description: "Memory bytes allocated" },
    ],
    usage: "Used to calculate memory allocation per pod/namespace and estimate costs",
  },
  {
    name: "container_cpu_usage_seconds_total",
    description: "Cumulative CPU seconds consumed by container (counter - must calculate rate)",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Namespace" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "greptime_timestamp", type: "timestamp", description: "When the metric was recorded" },
      { name: "greptime_value", type: "float", description: "Cumulative CPU seconds" },
    ],
    usage: "Rate calculation: (MAX - MIN) / time_elapsed gives actual CPU cores used",
  },
  {
    name: "container_memory_working_set_bytes",
    description: "Current memory working set in bytes (actual memory in use)",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "namespace", type: "string", description: "Namespace" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "greptime_timestamp", type: "timestamp", description: "When the metric was recorded" },
      { name: "greptime_value", type: "float", description: "Memory bytes in use" },
    ],
    usage: "Used to show actual memory consumption vs allocated",
  },
]

const nodeMetrics: MetricDefinition[] = [
  {
    name: "node_total_hourly_cost",
    description: "Hourly cost of the node in USD (from OpenCost)",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "instance_type", type: "string", description: "EC2 instance type (e.g., m5.xlarge)" },
      { name: "region", type: "string", description: "AWS region" },
      { name: "arch", type: "string", description: "CPU architecture (amd64, arm64)" },
      { name: "provider_id", type: "string", description: "Cloud provider node ID" },
      { name: "greptime_timestamp", type: "timestamp", description: "When the metric was recorded" },
      { name: "greptime_value", type: "float", description: "Hourly cost in USD" },
    ],
    usage: "Core metric for cost calculations - multiplied by hours to get total cost",
  },
  {
    name: "node_cpu_seconds_total",
    description: "Cumulative CPU seconds consumed at node level",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "mode", type: "string", description: "CPU mode (user, system, idle, etc.)" },
      { name: "greptime_value", type: "float", description: "Cumulative CPU seconds" },
    ],
    usage: "Rate calculation for node-level CPU utilization charts",
  },
  {
    name: "node_memory_MemTotal_bytes",
    description: "Total memory on the node in bytes",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "greptime_value", type: "float", description: "Total memory bytes" },
    ],
    usage: "Used to show total memory capacity per node",
  },
  {
    name: "node_memory_MemAvailable_bytes",
    description: "Available memory on the node in bytes",
    fields: [
      { name: "cluster", type: "string", description: "Cluster name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "greptime_value", type: "float", description: "Available memory bytes" },
    ],
    usage: "MemTotal - MemAvailable = Memory in use",
  },
]

const vantageMetrics: MetricDefinition[] = [
  {
    name: "vantage_daily_cost_by_provider",
    description: "Daily cloud costs aggregated by provider (AWS, GCP, Azure, etc.)",
    fields: [
      { name: "provider", type: "string", description: "Cloud provider name (e.g., aws, gcp)" },
      { name: "greptime_timestamp", type: "timestamp", description: "Date of the cost record" },
      { name: "greptime_value", type: "float", description: "Cost in USD for that day" },
    ],
    usage: "Used for executive summary, daily cost trends, and provider comparisons",
  },
  {
    name: "vantage_daily_cost_by_service",
    description: "Daily cloud costs broken down by service (EC2, S3, RDS, etc.)",
    fields: [
      { name: "service", type: "string", description: "Cloud service name (e.g., Amazon EC2, Amazon S3)" },
      { name: "provider", type: "string", description: "Cloud provider" },
      { name: "account_id", type: "string", description: "Cloud account ID" },
      { name: "account_name", type: "string", description: "Account display name" },
      { name: "greptime_timestamp", type: "timestamp", description: "Date of the cost record" },
      { name: "greptime_value", type: "float", description: "Cost in USD for that day" },
    ],
    usage: "Used for top services breakdown and service-level cost analysis",
  },
  {
    name: "vantage_daily_cost_by_account",
    description: "Daily cloud costs broken down by account/subscription",
    fields: [
      { name: "account_id", type: "string", description: "Cloud account ID" },
      { name: "account_name", type: "string", description: "Account display name" },
      { name: "provider", type: "string", description: "Cloud provider" },
      { name: "greptime_timestamp", type: "timestamp", description: "Date of the cost record" },
      { name: "greptime_value", type: "float", description: "Cost in USD for that day" },
    ],
    usage: "Used for account-level cost attribution and chargeback",
  },
]

const e6Metrics: MetricDefinition[] = [
  {
    name: "e6_engine_metrics",
    description: "E6 Engine performance metrics (uptime, threads, memory)",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "metric_name", type: "string", description: "Metric name (e.g., io_e6x_E6Engine_Uptime)" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used to monitor E6 engine health, uptime, and performance across clusters",
  },
  {
    name: "e6_gateway_metrics",
    description: "E6 Gateway metrics by workspace",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "workspace", type: "string", description: "Workspace name" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used to track gateway performance per workspace",
  },
  {
    name: "e6_queue_metrics",
    description: "E6 Queue metrics (query queue depths, pending tasks)",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used to monitor query queue depths and identify bottlenecks",
  },
  {
    name: "e6_executor_metrics",
    description: "E6 Executor metrics per pod/component",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "component", type: "string", description: "Component type (executor)" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used to track executor performance and identify slow/failing pods",
  },
  {
    name: "e6_schema_metrics",
    description: "E6 Schema service metrics (catalog operations, metadata reads)",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used to monitor schema/metadata service performance",
  },
  {
    name: "e6_storage_metrics",
    description: "E6 Storage service metrics (file metadata, cache stats)",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used to monitor storage service and cache performance",
  },
  {
    name: "e6_container_metrics",
    description: "E6 container-level resource metrics (CPU, memory per container)",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "component", type: "string", description: "Component type" },
      { name: "pod", type: "string", description: "Pod name" },
      { name: "container", type: "string", description: "Container name" },
      { name: "node", type: "string", description: "Node name" },
      { name: "resource_type", type: "string", description: "Resource type (cpu, memory)" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used to track resource consumption at the container level for cost allocation",
  },
  {
    name: "e6_cluster_metrics",
    description: "E6 cluster-level aggregate metrics",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Used for cluster-level health and capacity monitoring",
  },
  {
    name: "e6_generic_metrics",
    description: "Other E6 metrics not categorized elsewhere",
    fields: [
      { name: "ts", type: "timestamp", description: "When the metric was recorded" },
      { name: "cluster_name", type: "string", description: "E6 cluster name" },
      { name: "labels", type: "string", description: "JSON-encoded additional labels" },
      { name: "metric_name", type: "string", description: "Metric name" },
      { name: "metric_value", type: "float", description: "Metric value" },
    ],
    usage: "Catch-all for additional io_e6x metrics",
  },
]

function MetricCard({ metric }: { metric: MetricDefinition }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <code className="text-sm font-mono bg-muted px-2 py-1 rounded w-fit">{metric.name}</code>
        <CardDescription className="mt-2">{metric.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Fields</h4>
          <div className="space-y-1">
            {metric.fields.map((field) => (
              <div key={field.name} className="flex items-start gap-2 text-sm">
                <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono shrink-0">{field.name}</code>
                <span className="text-muted-foreground text-xs">({field.type})</span>
                <span className="text-xs">{field.description}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Usage</h4>
          <p className="text-sm text-muted-foreground">{metric.usage}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MetricsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Metrics Reference</h1>
        <p className="text-muted-foreground mt-2">
          Complete reference of all metrics tracked in GreptimeDB for cost monitoring
        </p>
      </div>

      {/* Kubernetes Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-5 w-5 text-emerald-500" />
          <h2 className="text-xl font-semibold">Kubernetes State Metrics</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          Metrics from kube-state-metrics providing information about Kubernetes objects (nodes, pods, etc.)
        </p>
        <div className="grid grid-cols-3 gap-4">
          {kubernetesMetrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </div>
      </section>

      {/* Container Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Box className="h-5 w-5 text-purple-500" />
          <h2 className="text-xl font-semibold">Container Metrics</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          Metrics from cAdvisor/OpenCost providing container-level resource allocation and usage
        </p>
        <div className="grid grid-cols-3 gap-4">
          {containerMetrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </div>
      </section>

      {/* Node Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold">Node & Cost Metrics</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          Node-level metrics and cost data from OpenCost for calculating infrastructure spend
        </p>
        <div className="grid grid-cols-3 gap-4">
          {nodeMetrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </div>
      </section>

      {/* Vantage Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Vantage Cost Metrics</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          Cloud cost data from Vantage API for multi-cloud cost visibility
        </p>
        <div className="grid grid-cols-3 gap-4">
          {vantageMetrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </div>
      </section>

      {/* E6 Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="h-5 w-5 text-cyan-500" />
          <h2 className="text-xl font-semibold">E6 Data Metrics</h2>
        </div>
        <p className="text-muted-foreground mb-4">
          E6 engine and component metrics collected from customer Mimir instances. Each customer has their own database with <code className="text-xs bg-muted px-1 py-0.5 rounded">e6_</code> prefix (e6_dev_zepto, e6_kantar, e6_tekion, e6_cndata, e6_cisco_sal, e6_swiggy).
        </p>
        <div className="grid grid-cols-3 gap-4">
          {e6Metrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </div>
      </section>

    </div>
  )
}
