// AI Query Tools - Static, tested SQL queries for GreptimeDB
// These are the ONLY queries the AI agent should use

// ============================================================================
// STATIC SCHEMA DEFINITIONS - DO NOT MODIFY
// ============================================================================

export const DATABASES = {
  KUBERNETES: "kubernetes",
  E6: "e6",
} as const

// All tables with their exact columns
export const TABLES = {
  // Cost tables (kubernetes db)
  node_total_hourly_cost: {
    db: "kubernetes",
    columns: ["eks_cluster", "node", "instance_type", "region", "metric_value", "ts"],
  },
  node_cpu_hourly_cost: {
    db: "kubernetes",
    columns: ["eks_cluster", "node", "metric_value", "ts"],
  },
  node_ram_hourly_cost: {
    db: "kubernetes",
    columns: ["eks_cluster", "node", "metric_value", "ts"],
  },

  // Node tables (kubernetes db)
  kube_node_info: {
    db: "kubernetes",
    columns: ["eks_cluster", "node", "kernel_version", "os_image", "container_runtime_version", "ts"],
  },
  kube_node_status_allocatable: {
    db: "kubernetes",
    columns: ["eks_cluster", "node", "resource_type", "metric_value", "ts"],
  },
  kube_node_labels: {
    db: "kubernetes",
    columns: ["eks_cluster", "node", "label_node_kubernetes_io_instance_type", "label_topology_kubernetes_io_region", "label_topology_kubernetes_io_zone", "ts"],
  },

  // Pod tables (kubernetes db)
  kube_pod_info: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "node", "created_by_kind", "created_by_name", "ts"],
  },
  kube_pod_labels: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "label_component", "label_app", "ts"],
  },

  // Container resource tables (kubernetes db)
  container_cpu_allocation: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "container", "node", "metric_value", "ts"],
  },
  container_memory_allocation_bytes: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "container", "node", "metric_value", "ts"],
  },
  container_cpu_usage_seconds_total: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "container", "node", "metric_value", "ts"],
  },
  container_memory_working_set_bytes: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "container", "node", "metric_value", "ts"],
  },

  // Network tables (kubernetes db)
  container_network_receive_bytes_total: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "metric_value", "ts"],
  },
  container_network_transmit_bytes_total: {
    db: "kubernetes",
    columns: ["eks_cluster", "namespace", "pod", "metric_value", "ts"],
  },

  // E6 Gateway tables (e6 db)
  io_e6x_e6gateway_totalqueriescompletedcount: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6gateway_numsucceededqueries: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6gateway_totalqueriesfailedcount: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6gateway_currentqueriesrunningcount: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6gateway_currentactiveconnections: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },

  // E6 Engine tables (e6 db)
  io_e6x_e6engine_currentactivetasks: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6engine_currentactivetasksrunning: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6engine_filesreadfroms3bytes: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6engine_totalbytesread: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
  io_e6x_e6engine_numrowsread: {
    db: "e6",
    columns: ["e6_cluster", "e6_workspace", "namespace", "pod", "component", "metric_value", "ts"],
  },
} as const

// ============================================================================
// QUERY TOOLS - Pre-defined queries the AI can execute
// ============================================================================

export interface QueryTool {
  name: string
  description: string
  database: string
  sql: (params: { eksCluster: string; timeRange?: string }) => string
}

export const QUERY_TOOLS: QueryTool[] = [
  // COST QUERIES
  {
    name: "get_total_cost",
    description: "Get total infrastructure cost (hourly and daily) for the workspace",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  SUM(metric_value) AS hourly_cost,
  SUM(metric_value) * 24 AS daily_cost
FROM node_total_hourly_cost
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'`,
  },

  {
    name: "get_cost_per_node",
    description: "Get cost breakdown by node with instance type",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  node,
  instance_type,
  MAX(metric_value) AS hourly_cost,
  MAX(metric_value) * 24 AS daily_cost
FROM node_total_hourly_cost
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY node, instance_type
ORDER BY hourly_cost DESC`,
  },

  {
    name: "get_cost_time_series",
    description: "Get hourly cost over time",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "24 hours" }) => `
SELECT
  ts,
  SUM(metric_value) AS hourly_cost
FROM node_total_hourly_cost
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY ts
ORDER BY ts`,
  },

  // NODE QUERIES
  {
    name: "get_node_count",
    description: "Get total number of nodes in the workspace",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT COUNT(DISTINCT node) AS node_count
FROM kube_node_info
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'`,
  },

  {
    name: "get_node_list",
    description: "List all nodes with their instance types and regions",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT DISTINCT
  n.node,
  l.label_node_kubernetes_io_instance_type AS instance_type,
  l.label_topology_kubernetes_io_region AS region
FROM kube_node_info n
LEFT JOIN kube_node_labels l
  ON n.eks_cluster = l.eks_cluster
  AND n.node = l.node
  AND l.ts >= NOW() - INTERVAL '${timeRange}'
WHERE n.eks_cluster = '${eksCluster}'
  AND n.ts >= NOW() - INTERVAL '${timeRange}'
ORDER BY n.node`,
  },

  {
    name: "get_node_cpu_capacity",
    description: "Get CPU capacity (allocatable) per node",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  node,
  MAX(metric_value) AS cpu_cores
FROM kube_node_status_allocatable
WHERE eks_cluster = '${eksCluster}'
  AND resource_type = 'cpu'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY node
ORDER BY cpu_cores DESC`,
  },

  {
    name: "get_node_memory_capacity",
    description: "Get memory capacity (allocatable) per node in GB",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  node,
  MAX(metric_value) / 1073741824 AS memory_gb
FROM kube_node_status_allocatable
WHERE eks_cluster = '${eksCluster}'
  AND resource_type = 'memory'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY node
ORDER BY memory_gb DESC`,
  },

  // POD QUERIES
  {
    name: "get_pod_count",
    description: "Get total number of pods in the workspace",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT COUNT(DISTINCT pod) AS pod_count
FROM kube_pod_info
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'`,
  },

  {
    name: "get_pods_per_namespace",
    description: "Get pod count grouped by namespace (E6 cluster)",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  namespace,
  COUNT(DISTINCT pod) AS pod_count
FROM kube_pod_info
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY namespace
ORDER BY pod_count DESC`,
  },

  {
    name: "get_pods_per_node",
    description: "Get pod count grouped by node",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  node,
  COUNT(DISTINCT pod) AS pod_count
FROM kube_pod_info
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY node
ORDER BY pod_count DESC`,
  },

  {
    name: "get_pods_by_component",
    description: "Get pod count grouped by E6 component type",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  label_component AS component,
  COUNT(DISTINCT pod) AS pod_count
FROM kube_pod_labels
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
  AND label_component IS NOT NULL
GROUP BY label_component
ORDER BY pod_count DESC`,
  },

  // RESOURCE ALLOCATION QUERIES
  {
    name: "get_cpu_allocated_per_node",
    description: "Get total CPU allocated to containers per node",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  node,
  SUM(metric_value) AS allocated_cpu_cores
FROM container_cpu_allocation
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY node
ORDER BY allocated_cpu_cores DESC`,
  },

  {
    name: "get_memory_allocated_per_node",
    description: "Get total memory allocated to containers per node in GB",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  node,
  SUM(metric_value) / 1073741824 AS allocated_memory_gb
FROM container_memory_allocation_bytes
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY node
ORDER BY allocated_memory_gb DESC`,
  },

  {
    name: "get_cpu_allocated_per_namespace",
    description: "Get total CPU allocated grouped by namespace (E6 cluster)",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  namespace,
  SUM(metric_value) AS allocated_cpu_cores
FROM container_cpu_allocation
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY namespace
ORDER BY allocated_cpu_cores DESC`,
  },

  {
    name: "get_memory_allocated_per_namespace",
    description: "Get total memory allocated grouped by namespace (E6 cluster) in GB",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  namespace,
  SUM(metric_value) / 1073741824 AS allocated_memory_gb
FROM container_memory_allocation_bytes
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY namespace
ORDER BY allocated_memory_gb DESC`,
  },

  // E6 CLUSTERS
  {
    name: "get_e6_clusters",
    description: "List all E6 clusters (namespaces with E6 components)",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT DISTINCT namespace AS e6_cluster
FROM kube_pod_labels
WHERE eks_cluster = '${eksCluster}'
  AND ts >= NOW() - INTERVAL '${timeRange}'
  AND label_component IN ('executor', 'queue', 'planner', 'gateway', 'schema', 'storage')
ORDER BY namespace`,
  },

  // E6 QUERY METRICS
  {
    name: "get_queries_completed",
    description: "Get total queries completed across all E6 clusters",
    database: "e6",
    sql: ({ timeRange = "24 hours" }) => `
SELECT
  e6_cluster,
  SUM(metric_value) AS queries_completed
FROM io_e6x_e6gateway_totalqueriescompletedcount
WHERE ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY e6_cluster
ORDER BY queries_completed DESC`,
  },

  {
    name: "get_query_success_rate",
    description: "Get query success vs failure counts",
    database: "e6",
    sql: ({ timeRange = "24 hours" }) => `
SELECT
  e6_cluster,
  SUM(s.metric_value) AS succeeded,
  SUM(f.metric_value) AS failed
FROM io_e6x_e6gateway_numsucceededqueries s
LEFT JOIN io_e6x_e6gateway_totalqueriesfailedcount f
  ON s.e6_cluster = f.e6_cluster
  AND s.ts = f.ts
WHERE s.ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY s.e6_cluster`,
  },

  {
    name: "get_active_queries",
    description: "Get currently running queries",
    database: "e6",
    sql: ({ timeRange = "10 minutes" }) => `
SELECT
  e6_cluster,
  MAX(metric_value) AS running_queries
FROM io_e6x_e6gateway_currentqueriesrunningcount
WHERE ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY e6_cluster`,
  },

  {
    name: "get_active_connections",
    description: "Get current active client connections",
    database: "e6",
    sql: ({ timeRange = "10 minutes" }) => `
SELECT
  e6_cluster,
  MAX(metric_value) AS active_connections
FROM io_e6x_e6gateway_currentactiveconnections
WHERE ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY e6_cluster`,
  },

  // E6 ENGINE METRICS
  {
    name: "get_executor_tasks",
    description: "Get current active executor tasks",
    database: "e6",
    sql: ({ timeRange = "10 minutes" }) => `
SELECT
  e6_cluster,
  MAX(metric_value) AS active_tasks
FROM io_e6x_e6engine_currentactivetasks
WHERE ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY e6_cluster`,
  },

  {
    name: "get_data_read",
    description: "Get data read from S3 and total bytes processed",
    database: "e6",
    sql: ({ timeRange = "24 hours" }) => `
SELECT
  e6_cluster,
  SUM(s3.metric_value) / 1073741824 AS s3_read_gb,
  SUM(total.metric_value) / 1073741824 AS total_read_gb,
  SUM(rows.metric_value) AS rows_read
FROM io_e6x_e6engine_filesreadfroms3bytes s3
LEFT JOIN io_e6x_e6engine_totalbytesread total
  ON s3.e6_cluster = total.e6_cluster
  AND s3.ts = total.ts
LEFT JOIN io_e6x_e6engine_numrowsread rows
  ON s3.e6_cluster = rows.e6_cluster
  AND s3.ts = rows.ts
WHERE s3.ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY s3.e6_cluster`,
  },

  // NETWORK METRICS
  {
    name: "get_network_traffic",
    description: "Get network receive and transmit bytes by namespace",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  namespace,
  SUM(rx.metric_value) / 1073741824 AS receive_gb,
  SUM(tx.metric_value) / 1073741824 AS transmit_gb
FROM container_network_receive_bytes_total rx
LEFT JOIN container_network_transmit_bytes_total tx
  ON rx.eks_cluster = tx.eks_cluster
  AND rx.namespace = tx.namespace
  AND rx.pod = tx.pod
  AND rx.ts = tx.ts
WHERE rx.eks_cluster = '${eksCluster}'
  AND rx.ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY rx.namespace
ORDER BY receive_gb DESC`,
  },

  // UTILIZATION QUERIES
  {
    name: "get_node_cpu_utilization",
    description: "Get CPU utilization per node (allocated vs capacity percentage) - shows which nodes have lowest/highest utilization",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  a.node,
  SUM(a.metric_value) AS allocated_cpu,
  MAX(c.metric_value) AS capacity_cpu,
  ROUND(SUM(a.metric_value) / MAX(c.metric_value) * 100, 1) AS utilization_pct
FROM container_cpu_allocation a
JOIN kube_node_status_allocatable c
  ON a.eks_cluster = c.eks_cluster
  AND a.node = c.node
  AND c.resource_type = 'cpu'
  AND c.ts >= NOW() - INTERVAL '${timeRange}'
WHERE a.eks_cluster = '${eksCluster}'
  AND a.ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY a.node
ORDER BY utilization_pct ASC`,
  },

  {
    name: "get_node_memory_utilization",
    description: "Get memory utilization per node (allocated vs capacity percentage)",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  a.node,
  SUM(a.metric_value) / 1073741824 AS allocated_memory_gb,
  MAX(c.metric_value) / 1073741824 AS capacity_memory_gb,
  ROUND(SUM(a.metric_value) / MAX(c.metric_value) * 100, 1) AS utilization_pct
FROM container_memory_allocation_bytes a
JOIN kube_node_status_allocatable c
  ON a.eks_cluster = c.eks_cluster
  AND a.node = c.node
  AND c.resource_type = 'memory'
  AND c.ts >= NOW() - INTERVAL '${timeRange}'
WHERE a.eks_cluster = '${eksCluster}'
  AND a.ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY a.node
ORDER BY utilization_pct ASC`,
  },

  {
    name: "get_underutilized_nodes",
    description: "Get nodes with low CPU utilization (under 50%) - good candidates for consolidation",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  a.node,
  SUM(a.metric_value) AS allocated_cpu,
  MAX(c.metric_value) AS capacity_cpu,
  ROUND(SUM(a.metric_value) / MAX(c.metric_value) * 100, 1) AS utilization_pct
FROM container_cpu_allocation a
JOIN kube_node_status_allocatable c
  ON a.eks_cluster = c.eks_cluster
  AND a.node = c.node
  AND c.resource_type = 'cpu'
  AND c.ts >= NOW() - INTERVAL '${timeRange}'
WHERE a.eks_cluster = '${eksCluster}'
  AND a.ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY a.node
HAVING ROUND(SUM(a.metric_value) / MAX(c.metric_value) * 100, 1) < 50
ORDER BY utilization_pct ASC`,
  },

  {
    name: "get_overutilized_nodes",
    description: "Get nodes with high CPU utilization (over 80%) - may need scaling",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  a.node,
  SUM(a.metric_value) AS allocated_cpu,
  MAX(c.metric_value) AS capacity_cpu,
  ROUND(SUM(a.metric_value) / MAX(c.metric_value) * 100, 1) AS utilization_pct
FROM container_cpu_allocation a
JOIN kube_node_status_allocatable c
  ON a.eks_cluster = c.eks_cluster
  AND a.node = c.node
  AND c.resource_type = 'cpu'
  AND c.ts >= NOW() - INTERVAL '${timeRange}'
WHERE a.eks_cluster = '${eksCluster}'
  AND a.ts >= NOW() - INTERVAL '${timeRange}'
GROUP BY a.node
HAVING ROUND(SUM(a.metric_value) / MAX(c.metric_value) * 100, 1) > 80
ORDER BY utilization_pct DESC`,
  },

  // SUMMARY QUERIES
  {
    name: "get_workspace_summary",
    description: "Get complete workspace summary: nodes, pods, cost, clusters",
    database: "kubernetes",
    sql: ({ eksCluster, timeRange = "1 hour" }) => `
SELECT
  (SELECT COUNT(DISTINCT node) FROM kube_node_info
   WHERE eks_cluster = '${eksCluster}' AND ts >= NOW() - INTERVAL '${timeRange}') AS node_count,
  (SELECT COUNT(DISTINCT pod) FROM kube_pod_info
   WHERE eks_cluster = '${eksCluster}' AND ts >= NOW() - INTERVAL '${timeRange}') AS pod_count,
  (SELECT SUM(metric_value) FROM node_total_hourly_cost
   WHERE eks_cluster = '${eksCluster}' AND ts >= NOW() - INTERVAL '${timeRange}') AS hourly_cost,
  (SELECT COUNT(DISTINCT namespace) FROM kube_pod_labels
   WHERE eks_cluster = '${eksCluster}' AND ts >= NOW() - INTERVAL '${timeRange}'
   AND label_component IN ('executor', 'queue', 'planner')) AS e6_cluster_count`,
  },
]

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

export function getToolByName(name: string): QueryTool | undefined {
  return QUERY_TOOLS.find(t => t.name === name)
}

export function getToolsDescription(): string {
  return QUERY_TOOLS.map(t => `- ${t.name}: ${t.description}`).join("\n")
}

export function getAvailableToolNames(): string[] {
  return QUERY_TOOLS.map(t => t.name)
}
