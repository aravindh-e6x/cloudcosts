"use client"

import { useState } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Position,
  EdgeProps,
  getBezierPath,
  ReactFlowProvider,
  MarkerType,
  Handle,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

// ============================================
// METRICS DATA TYPES
// ============================================

interface MetricField {
  name: string
  type: string
  description: string
}

interface MetricDefinition {
  name: string
  description: string
  fields: MetricField[]
  usage: string
}

interface NodeMetricData {
  title: string
  description: string
  database?: string
  interval?: string
  metrics: MetricDefinition[]
}

// ============================================
// DETAILED METRICS FOR EACH NODE
// ============================================

const nodeMetricsData: Record<string, NodeMetricData> = {
  "aws": {
    title: "AWS CloudWatch",
    description: "Metrics collected from AWS CloudWatch across multiple accounts",
    metrics: [
      {
        name: "EC2 Metrics",
        description: "EC2 instance performance metrics",
        fields: [
          { name: "CPUUtilization", type: "float", description: "CPU usage percentage" },
          { name: "NetworkIn", type: "float", description: "Bytes received" },
          { name: "NetworkOut", type: "float", description: "Bytes sent" },
          { name: "DiskReadBytes", type: "float", description: "Disk read bytes" },
          { name: "DiskWriteBytes", type: "float", description: "Disk write bytes" },
        ],
        usage: "Track EC2 instance performance and identify underutilized resources",
      },
      {
        name: "RDS Metrics",
        description: "RDS database performance metrics",
        fields: [
          { name: "CPUUtilization", type: "float", description: "Database CPU usage" },
          { name: "DatabaseConnections", type: "int", description: "Active connections" },
          { name: "FreeStorageSpace", type: "float", description: "Available storage bytes" },
          { name: "ReadIOPS", type: "float", description: "Read operations per second" },
          { name: "WriteIOPS", type: "float", description: "Write operations per second" },
          { name: "FreeableMemory", type: "float", description: "Available RAM bytes" },
        ],
        usage: "Monitor database health and plan capacity",
      },
      {
        name: "S3 Metrics",
        description: "S3 bucket storage metrics",
        fields: [
          { name: "BucketSizeBytes", type: "float", description: "Total bucket size" },
          { name: "NumberOfObjects", type: "int", description: "Object count" },
        ],
        usage: "Track storage costs and growth trends",
      },
      {
        name: "MSK Metrics",
        description: "Managed Kafka metrics",
        fields: [
          { name: "CpuUser", type: "float", description: "Broker CPU usage" },
          { name: "MemoryUsed", type: "float", description: "Broker memory usage" },
          { name: "KafkaDataLogsDiskUsed", type: "float", description: "Disk usage for data logs" },
        ],
        usage: "Monitor Kafka broker health and capacity",
      },
    ],
  },
  "vantage": {
    title: "Vantage API",
    description: "Multi-cloud cost data aggregated from Vantage",
    metrics: [
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
    ],
  },
  "poc-grafana": {
    title: "POC Grafana (Mimir)",
    description: "E6 cluster metrics from existing Mimir/Grafana setup",
    metrics: [
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
        name: "e6_container_metrics",
        description: "E6 container-level resource metrics (CPU, memory per container)",
        fields: [
          { name: "ts", type: "timestamp", description: "When the metric was recorded" },
          { name: "cluster_name", type: "string", description: "E6 cluster name" },
          { name: "component", type: "string", description: "Component type" },
          { name: "pod", type: "string", description: "Pod name" },
          { name: "container", type: "string", description: "Container name" },
          { name: "resource_type", type: "string", description: "Resource type (cpu, memory)" },
          { name: "metric_value", type: "float", description: "Metric value" },
        ],
        usage: "Used to track resource consumption at the container level for cost allocation",
      },
    ],
  },
  "alloy-cloudwatch": {
    title: "Alloy CloudWatch Exporter",
    description: "Scrapes CloudWatch metrics and writes to GreptimeDB",
    database: "aws",
    interval: "5 minutes",
    metrics: [
      {
        name: "Configuration",
        description: "Exporter configuration and behavior",
        fields: [
          { name: "scrape_interval", type: "duration", description: "5 minutes" },
          { name: "target_database", type: "string", description: "aws" },
          { name: "aws_account_id", type: "label", description: "Added to all metrics" },
          { name: "aws_account_name", type: "label", description: "Added to all metrics" },
        ],
        usage: "Scrapes CloudWatch API and writes metrics to GreptimeDB aws database",
      },
    ],
  },
  "vantage-exporter": {
    title: "Vantage Exporter",
    description: "Fetches cost data from Vantage API and writes to GreptimeDB",
    database: "vantage",
    interval: "24 hours",
    metrics: [
      {
        name: "Configuration",
        description: "Exporter configuration and behavior",
        fields: [
          { name: "push_interval", type: "duration", description: "24 hours" },
          { name: "target_database", type: "string", description: "vantage" },
          { name: "backfill_days", type: "int", description: "30 days on first run" },
        ],
        usage: "Fetches cost data from Vantage API daily and writes to GreptimeDB",
      },
    ],
  },
  "e6metrics-exporter": {
    title: "E6 Metrics Exporter",
    description: "Scrapes metrics from POC Grafana/Mimir and writes to GreptimeDB",
    database: "e6 (per customer)",
    interval: "5 minutes",
    metrics: [
      {
        name: "Configuration",
        description: "Exporter configuration and behavior",
        fields: [
          { name: "scrape_interval", type: "duration", description: "5 minutes" },
          { name: "target_database", type: "string", description: "Customer-specific (e.g., e6_laminar)" },
          { name: "source", type: "string", description: "POC Grafana/Mimir" },
        ],
        usage: "Queries Mimir for e6_* metrics and writes to customer-specific databases",
      },
    ],
  },
  "greptimedb": {
    title: "GreptimeDB",
    description: "Central time-series database storing all metrics",
    metrics: [
      {
        name: "kubernetes",
        description: "Kubernetes cluster metrics from monitoring-agent",
        fields: [
          { name: "kube_*", type: "metrics", description: "Kubernetes state metrics" },
          { name: "container_*", type: "metrics", description: "Container resource metrics" },
          { name: "node_*", type: "metrics", description: "Node-level metrics" },
        ],
        usage: "Primary database for Kubernetes cost analysis",
      },
      {
        name: "aws",
        description: "CloudWatch metrics from alloy-cloudwatch",
        fields: [
          { name: "ec2_*", type: "metrics", description: "EC2 instance metrics" },
          { name: "rds_*", type: "metrics", description: "RDS database metrics" },
          { name: "s3_*", type: "metrics", description: "S3 storage metrics" },
        ],
        usage: "AWS resource monitoring and cost correlation",
      },
      {
        name: "vantage",
        description: "Cost data from vantage-exporter",
        fields: [
          { name: "vantage_daily_cost_*", type: "metrics", description: "Daily cost breakdowns" },
        ],
        usage: "Multi-cloud cost visibility and reporting",
      },
      {
        name: "e6",
        description: "E6 cluster metrics per customer",
        fields: [
          { name: "e6_*_metrics", type: "metrics", description: "E6 component metrics" },
        ],
        usage: "E6 cluster monitoring and cost allocation",
      },
    ],
  },
  "dashboard": {
    title: "CloudCosts Dashboard",
    description: "Web dashboard for visualizing costs and metrics",
    metrics: [
      {
        name: "Features",
        description: "Dashboard capabilities",
        fields: [
          { name: "query_engine", type: "string", description: "SQL queries to GreptimeDB" },
          { name: "views", type: "list", description: "Provider, service, tag, cluster breakdowns" },
          { name: "filtering", type: "feature", description: "Date range, cluster, namespace filtering" },
        ],
        usage: "Primary interface for cost analysis and reporting",
      },
    ],
  },
  "grafana": {
    title: "Grafana",
    description: "Grafana dashboards connected to GreptimeDB",
    metrics: [
      {
        name: "Data Sources",
        description: "Connected data sources",
        fields: [
          { name: "greptimedb", type: "datasource", description: "GreptimeDB (Prometheus compatible)" },
        ],
        usage: "Advanced dashboards, alerting, and ad-hoc queries",
      },
    ],
  },
  "eks-customer-1": {
    title: "EKS Cluster Metrics",
    description: "Metrics collected by monitoring-agent in customer EKS clusters",
    database: "kubernetes",
    interval: "5 minutes",
    metrics: [
      {
        name: "kube_node_info",
        description: "Information about Kubernetes nodes in the cluster",
        fields: [
          { name: "cluster", type: "string", description: "Cluster name/identifier" },
          { name: "node", type: "string", description: "Node name" },
          { name: "internal_ip", type: "string", description: "Node internal IP address" },
          { name: "kubelet_version", type: "string", description: "Kubelet version" },
          { name: "provider_id", type: "string", description: "Cloud provider node ID" },
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
          { name: "created_by_kind", type: "string", description: "Owner kind (Deployment, DaemonSet)" },
          { name: "created_by_name", type: "string", description: "Owner name" },
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
          { name: "greptime_value", type: "float", description: "Capacity value" },
        ],
        usage: "Used to show total CPU/memory capacity per node",
      },
      {
        name: "kube_node_labels",
        description: "Labels attached to Kubernetes nodes",
        fields: [
          { name: "cluster", type: "string", description: "Cluster name" },
          { name: "node", type: "string", description: "Node name" },
          { name: "label_eks_amazonaws_com_capacityType", type: "string", description: "SPOT or ON_DEMAND" },
        ],
        usage: "Used to identify spot vs on-demand nodes for cost breakdown",
      },
      {
        name: "container_cpu_allocation",
        description: "CPU cores allocated (requested) per container",
        fields: [
          { name: "cluster", type: "string", description: "Cluster name" },
          { name: "namespace", type: "string", description: "Namespace" },
          { name: "pod", type: "string", description: "Pod name" },
          { name: "container", type: "string", description: "Container name" },
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
          { name: "greptime_value", type: "float", description: "Memory bytes allocated" },
        ],
        usage: "Used to calculate memory allocation per pod/namespace and estimate costs",
      },
      {
        name: "container_cpu_usage_seconds_total",
        description: "Cumulative CPU seconds consumed by container",
        fields: [
          { name: "cluster", type: "string", description: "Cluster name" },
          { name: "namespace", type: "string", description: "Namespace" },
          { name: "pod", type: "string", description: "Pod name" },
          { name: "container", type: "string", description: "Container name" },
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
          { name: "greptime_value", type: "float", description: "Memory bytes in use" },
        ],
        usage: "Used to show actual memory consumption vs allocated",
      },
      {
        name: "node_total_hourly_cost",
        description: "Hourly cost of the node in USD (from OpenCost)",
        fields: [
          { name: "cluster", type: "string", description: "Cluster name" },
          { name: "node", type: "string", description: "Node name" },
          { name: "instance_type", type: "string", description: "EC2 instance type (e.g., m5.xlarge)" },
          { name: "region", type: "string", description: "AWS region" },
          { name: "greptime_value", type: "float", description: "Hourly cost in USD" },
        ],
        usage: "Core metric for cost calculations - multiplied by hours to get total cost",
      },
    ],
  },
  "eks-customer-2": {
    title: "EKS Cluster Metrics",
    description: "Same metrics as other EKS clusters",
    database: "kubernetes",
    interval: "5 minutes",
    metrics: [],
  },
  "eks-more": {
    title: "Additional EKS Clusters",
    description: "Same monitoring agent deployed across all customer clusters",
    database: "kubernetes",
    interval: "5 minutes",
    metrics: [],
  },
}

// ============================================
// MODAL COMPONENT
// ============================================

function MetricsModal({
  nodeId,
  onClose
}: {
  nodeId: string | null
  onClose: () => void
}) {
  if (!nodeId || !nodeMetricsData[nodeId]) return null

  const data = nodeMetricsData[nodeId]

  // For eks-customer-2 and eks-more, show eks-customer-1 metrics
  const metrics = data.metrics.length > 0 ? data.metrics : nodeMetricsData["eks-customer-1"]?.metrics || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-900">{data.title}</h3>
          <p className="text-sm text-zinc-500 mt-1">{data.description}</p>
          {(data.database || data.interval) && (
            <div className="flex gap-3 mt-2">
              {data.database && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                  Database: {data.database}
                </span>
              )}
              {data.interval && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Interval: {data.interval}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
          {metrics.map((metric, idx) => (
            <div key={idx} className="border border-zinc-200 rounded-lg overflow-hidden">
              {/* Metric Header */}
              <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                <code className="text-sm font-mono text-emerald-600">{metric.name}</code>
                <p className="text-xs text-zinc-500 mt-0.5">{metric.description}</p>
              </div>

              {/* Fields */}
              <div className="px-4 py-3">
                <div className="text-xs font-medium text-zinc-500 uppercase mb-2">Fields</div>
                <div className="space-y-1.5">
                  {metric.fields.map((field, fidx) => (
                    <div key={fidx} className="flex items-start gap-2 text-sm">
                      <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-zinc-700 shrink-0">
                        {field.name}
                      </code>
                      <span className="text-xs text-zinc-400">({field.type})</span>
                      <span className="text-xs text-zinc-600">{field.description}</span>
                    </div>
                  ))}
                </div>

                {/* Usage */}
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <div className="text-xs font-medium text-zinc-500 uppercase mb-1">Usage</div>
                  <p className="text-xs text-zinc-600">{metric.usage}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// CUSTOM NODE COMPONENTS
// ============================================

function SourceNode({ data }: { data: { label: string; subtitle?: string } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-purple-500 shadow-sm px-4 py-3 min-w-[180px] cursor-pointer hover:shadow-md transition-shadow">
      <Handle type="source" position={Position.Right} className="!bg-purple-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-purple-500" />
        <span className="text-xs text-zinc-500">External Source</span>
      </div>
      <div className="font-medium text-sm text-zinc-900">{data.label}</div>
      {data.subtitle && (
        <div className="text-xs text-zinc-400 mt-0.5">{data.subtitle}</div>
      )}
    </div>
  )
}

function ExporterNode({ data }: { data: { label: string; interval?: string } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-sm px-4 py-3 min-w-[180px] cursor-pointer hover:shadow-md transition-shadow">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-zinc-500">Exporter</span>
        {data.interval && (
          <span className="text-xs text-emerald-600 ml-auto">{data.interval}</span>
        )}
      </div>
      <div className="font-medium text-sm text-zinc-900">{data.label}</div>
    </div>
  )
}

function DatabaseNode({ data }: { data: { label: string; databases?: string[] } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-md px-5 py-4 min-w-[200px] cursor-pointer hover:shadow-lg transition-shadow">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <Handle type="target" position={Position.Top} id="top" className="!bg-emerald-500" />
      <Handle type="source" position={Position.Right} className="!bg-emerald-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-zinc-500">Database</span>
      </div>
      <div className="font-semibold text-base text-zinc-900">{data.label}</div>
      {data.databases && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.databases.map((db) => (
            <span key={db} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">
              {db}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ConsumerNode({ data }: { data: { label: string; url?: string } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-sm px-4 py-3 min-w-[160px] cursor-pointer hover:shadow-md transition-shadow">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-zinc-500">Consumer</span>
      </div>
      <div className="font-medium text-sm text-zinc-900">{data.label}</div>
      {data.url && (
        <div className="text-xs text-emerald-500 mt-0.5">{data.url}</div>
      )}
    </div>
  )
}

function ClusterNode({ data }: { data: { label: string; components?: string[] } }) {
  return (
    <div className="bg-white rounded-xl border-2 border-orange-500 shadow-sm px-4 py-3 w-[220px] cursor-pointer hover:shadow-md transition-shadow">
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
        <span className="text-xs text-zinc-500">EKS Cluster</span>
      </div>
      <div className="font-medium text-sm text-zinc-900 mb-2">{data.label}</div>
      <div className="border-t border-zinc-100 pt-2">
        <div className="text-xs text-zinc-400 mb-1.5">monitoring-agent</div>
        {data.components && (
          <div className="flex flex-wrap gap-1">
            {data.components.map((comp) => (
              <span key={comp} className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                {comp}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// ANIMATED EDGE WITH DOTS
// ============================================

function AnimatedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const animationDuration = data?.speed === "fast" ? "1.5s" : data?.speed === "slow" ? "4s" : "2.5s"
  const strokeColor = (data?.color as string) || "#a1a1aa"

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        markerEnd={markerEnd}
      />
      <circle r="4" fill={strokeColor}>
        <animateMotion dur={animationDuration} repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="4" fill={strokeColor}>
        <animateMotion dur={animationDuration} repeatCount="indefinite" path={edgePath} begin={`-${parseFloat(animationDuration) / 2}s`} />
      </circle>
    </>
  )
}

// ============================================
// NODE AND EDGE TYPES
// ============================================

function GroupNode({ data }: { data: { label: string } }) {
  return (
    <div className="bg-emerald-50 border-2 border-emerald-500 border-dashed rounded-2xl w-full h-full">
      <div className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-medium px-2 py-0.5 rounded">
        {data.label}
      </div>
    </div>
  )
}

const nodeTypes = {
  source: SourceNode,
  exporter: ExporterNode,
  database: DatabaseNode,
  consumer: ConsumerNode,
  cluster: ClusterNode,
  group: GroupNode,
}

const edgeTypes = {
  animated: AnimatedEdge,
}

// ============================================
// ARCHITECTURE DIAGRAM DATA
// ============================================

const initialNodes: Node[] = [
  // Cluster group box (background)
  {
    id: "cluster-group",
    type: "group",
    position: { x: 250, y: 200 },
    data: { label: "CloudCosts Cluster" },
    style: { width: 820, height: 320, zIndex: -1 },
  },

  // EKS Clusters (top row) - with proper gaps (220px width + 30px gap = 250px spacing)
  {
    id: "eks-customer-1",
    type: "cluster",
    position: { x: 0, y: 0 },
    data: {
      label: "customer-1",
      components: ["Alloy", "OpenCost", "kube-state-metrics", "node-exporter"]
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
  {
    id: "eks-customer-2",
    type: "cluster",
    position: { x: 250, y: 0 },
    data: {
      label: "customer-2",
      components: ["Alloy", "OpenCost", "kube-state-metrics", "node-exporter"]
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
  {
    id: "eks-more",
    type: "cluster",
    position: { x: 500, y: 0 },
    data: {
      label: "+ more clusters",
      components: ["Alloy", "OpenCost", "kube-state-metrics", "node-exporter"]
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },

  // External Sources (left column)
  {
    id: "aws",
    type: "source",
    position: { x: 0, y: 240 },
    data: { label: "AWS CloudWatch", subtitle: "Multiple accounts" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "vantage",
    type: "source",
    position: { x: 0, y: 340 },
    data: { label: "Vantage API", subtitle: "Multi-cloud costs" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "poc-grafana",
    type: "source",
    position: { x: 0, y: 440 },
    data: { label: "POC Grafana", subtitle: "Mimir metrics" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },

  // Exporters (center-left column)
  {
    id: "alloy-cloudwatch",
    type: "exporter",
    position: { x: 280, y: 240 },
    data: { label: "alloy-cloudwatch", interval: "5m" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "vantage-exporter",
    type: "exporter",
    position: { x: 280, y: 340 },
    data: { label: "vantage-exporter", interval: "24h" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "e6metrics-exporter",
    type: "exporter",
    position: { x: 280, y: 440 },
    data: { label: "e6metrics-exporter", interval: "5m" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },

  // Database (center)
  {
    id: "greptimedb",
    type: "database",
    position: { x: 540, y: 320 },
    data: {
      label: "GreptimeDB",
      databases: ["kubernetes", "aws", "vantage", "e6"]
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },

  // Consumers (right column) - more gap from GreptimeDB
  {
    id: "dashboard",
    type: "consumer",
    position: { x: 880, y: 290 },
    data: { label: "Dashboard", url: "cloudcosts.in" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "grafana",
    type: "consumer",
    position: { x: 880, y: 390 },
    data: { label: "Grafana", url: "grafana.cloudcosts.in" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
]

const initialEdges: Edge[] = [
  // External sources to exporters
  {
    id: "aws-to-exporter",
    source: "aws",
    target: "alloy-cloudwatch",
    type: "animated",
    data: { color: "#a855f7", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7", width: 20, height: 20 },
  },
  {
    id: "vantage-to-exporter",
    source: "vantage",
    target: "vantage-exporter",
    type: "animated",
    data: { color: "#a855f7", speed: "slow" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7", width: 20, height: 20 },
  },
  {
    id: "poc-to-exporter",
    source: "poc-grafana",
    target: "e6metrics-exporter",
    type: "animated",
    data: { color: "#a855f7", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#a855f7", width: 20, height: 20 },
  },

  // Exporters to GreptimeDB
  {
    id: "cloudwatch-to-db",
    source: "alloy-cloudwatch",
    target: "greptimedb",
    type: "animated",
    data: { color: "#10b981", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },
  {
    id: "vantage-to-db",
    source: "vantage-exporter",
    target: "greptimedb",
    type: "animated",
    data: { color: "#10b981", speed: "slow" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },
  {
    id: "e6metrics-to-db",
    source: "e6metrics-exporter",
    target: "greptimedb",
    type: "animated",
    data: { color: "#10b981", speed: "normal" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },

  // GreptimeDB to consumers
  {
    id: "db-to-dashboard",
    source: "greptimedb",
    target: "dashboard",
    type: "animated",
    data: { color: "#10b981", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },
  {
    id: "db-to-grafana",
    source: "greptimedb",
    target: "grafana",
    type: "animated",
    data: { color: "#10b981", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981", width: 20, height: 20 },
  },

  // EKS clusters to GreptimeDB
  {
    id: "eks-1-to-db",
    source: "eks-customer-1",
    target: "greptimedb",
    targetHandle: "top",
    type: "animated",
    data: { color: "#f97316", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316", width: 20, height: 20 },
  },
  {
    id: "eks-2-to-db",
    source: "eks-customer-2",
    target: "greptimedb",
    targetHandle: "top",
    type: "animated",
    data: { color: "#f97316", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316", width: 20, height: 20 },
  },
  {
    id: "eks-more-to-db",
    source: "eks-more",
    target: "greptimedb",
    targetHandle: "top",
    type: "animated",
    data: { color: "#f97316", speed: "fast" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316", width: 20, height: 20 },
  },
]

// ============================================
// MAIN DIAGRAM COMPONENT
// ============================================

function ArchitectureDiagram({ onNodeClick }: { onNodeClick: (nodeId: string) => void }) {
  return (
    <div className="h-[650px] w-full overflow-hidden">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onNodeClick(node.id)}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d4d4d8" className="opacity-50" />
      </ReactFlow>
    </div>
  )
}

// ============================================
// LEGEND COMPONENT
// ============================================

function Legend() {
  const items = [
    { color: "bg-purple-500", label: "External Source" },
    { color: "bg-emerald-500", label: "CloudCosts Cluster" },
    { color: "bg-orange-500", label: "Customer EKS Cluster" },
  ]

  return (
    <div className="flex flex-wrap gap-6 mt-6 justify-center">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ArchitecturePage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Architecture</h1>
        <p className="text-muted-foreground">
          Technical documentation for the CloudCosts monitoring infrastructure
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">System Overview</h2>
        <p className="text-muted-foreground mb-6">
          Data flows from external sources and EKS clusters through exporters into GreptimeDB,
          which serves as the central time-series database for all cost and metrics data.
          <span className="text-zinc-500 ml-1">(Click on any node to see metrics)</span>
        </p>
        <ReactFlowProvider>
          <ArchitectureDiagram onNodeClick={setSelectedNode} />
        </ReactFlowProvider>
        <Legend />
      </div>

      <MetricsModal nodeId={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}
