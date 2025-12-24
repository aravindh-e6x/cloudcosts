"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "laminar-ui"
import { Server, Box, DollarSign, Cloud } from "lucide-react"

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
        <div className="grid gap-4">
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
        <div className="grid gap-4">
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
        <div className="grid gap-4">
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
        <div className="grid gap-4">
          {vantageMetrics.map((metric) => (
            <MetricCard key={metric.name} metric={metric} />
          ))}
        </div>
      </section>

    </div>
  )
}
