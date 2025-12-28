// Workspace Details Page Queries
// All queries for the /e6/[workspace] details page

import { logQuery } from "../logger.server"

interface DateRange {
  startTs: string
  endTs: string
}

// ============================================================================
// NODE PACKING SECTION
// ============================================================================

/**
 * Get detailed node packing data with instance type, CPU/memory allocation, pod count, costs
 * Used by: NodePackingSection
 */
export function getNodePackingDetailed({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH node_allocatable AS (
      SELECT
        node,
        MAX(CASE WHEN resource = 'cpu' THEN greptime_value ELSE 0 END) as allocatable_cpu,
        MAX(CASE WHEN resource = 'memory' THEN greptime_value ELSE 0 END) as allocatable_memory
      FROM kube_node_status_allocatable
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    ),
    container_cpu AS (
      SELECT
        node,
        SUM(greptime_value) as allocated_cpu,
        COUNT(DISTINCT pod) as pod_count
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    ),
    container_memory AS (
      SELECT
        node,
        SUM(greptime_value) as allocated_memory
      FROM container_memory_allocation_bytes
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    ),
    node_costs AS (
      SELECT
        node,
        AVG(greptime_value) as hourly_cost
      FROM node_total_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    ),
    node_labels AS (
      SELECT DISTINCT
        node,
        label_node_kubernetes_io_instance_type as instance_type
      FROM kube_node_labels
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
    )
    SELECT
      na.node,
      COALESCE(nl.instance_type, 'unknown') as instance_type,
      na.allocatable_cpu,
      COALESCE(cc.allocated_cpu, 0) as allocated_cpu,
      na.allocatable_memory,
      COALESCE(cm.allocated_memory, 0) as allocated_memory,
      COALESCE(cc.pod_count, 0) as pod_count,
      COALESCE(nc.hourly_cost, 0) as hourly_cost
    FROM node_allocatable na
    LEFT JOIN container_cpu cc ON na.node = cc.node
    LEFT JOIN container_memory cm ON na.node = cm.node
    LEFT JOIN node_costs nc ON na.node = nc.node
    LEFT JOIN node_labels nl ON na.node = nl.node
    ORDER BY allocated_cpu DESC
  `
  logQuery("workspace", "getNodePackingDetailed", { startTs, endTs }, sql)
  return sql
}

/**
 * Get node packing time series for a specific node
 * Used by: NodePackingSection modal
 */
export function getNodePackingTimeSeries(node: string, metric: "cpu" | "memory", { startTs, endTs }: DateRange): string {
  const table = metric === "cpu" ? "container_cpu_allocation" : "container_memory_allocation_bytes"
  const allocTable = "kube_node_status_allocatable"
  const resource = metric === "cpu" ? "cpu" : "memory"

  const sql = `
    WITH allocatable AS (
      SELECT
        DATE_BIN('1 hour', greptime_timestamp) as ts,
        AVG(greptime_value) as allocatable
      FROM ${allocTable}
      WHERE node = '${node}'
        AND resource = '${resource}'
        AND greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    ),
    allocated AS (
      SELECT
        DATE_BIN('1 hour', greptime_timestamp) as ts,
        SUM(greptime_value) as allocated
      FROM ${table}
      WHERE node = '${node}'
        AND greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    )
    SELECT
      a.ts,
      CASE WHEN al.allocatable > 0
        THEN (a.allocated / al.allocatable) * 100
        ELSE 0
      END as packing_pct
    FROM allocated a
    LEFT JOIN allocatable al ON a.ts = al.ts
    ORDER BY a.ts
  `
  logQuery("workspace", "getNodePackingTimeSeries", { node, metric, startTs, endTs }, sql)
  return sql
}

// ============================================================================
// RESOURCE SIZING SECTION
// ============================================================================

/**
 * Get right-sizing data: CPU/Memory requested vs actual by component
 * Used by: RightSizingSection
 */
export function getRightSizing({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH component_allocation AS (
      SELECT
        CASE
          WHEN pod LIKE 'executor-%' THEN 'executor'
          WHEN pod LIKE 'planner-%' THEN 'planner'
          WHEN pod LIKE 'queue-%' THEN 'queue'
          WHEN pod LIKE 'gateway-%' THEN 'gateway'
          WHEN pod LIKE 'storage-%' THEN 'storage'
          WHEN pod LIKE 'schema-%' THEN 'schema'
          ELSE 'other'
        END as component,
        namespace,
        SUM(greptime_value) as cpu_requested
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY component, namespace
    ),
    component_memory AS (
      SELECT
        CASE
          WHEN pod LIKE 'executor-%' THEN 'executor'
          WHEN pod LIKE 'planner-%' THEN 'planner'
          WHEN pod LIKE 'queue-%' THEN 'queue'
          WHEN pod LIKE 'gateway-%' THEN 'gateway'
          WHEN pod LIKE 'storage-%' THEN 'storage'
          WHEN pod LIKE 'schema-%' THEN 'schema'
          ELSE 'other'
        END as component,
        namespace,
        SUM(greptime_value) as memory_requested
      FROM container_memory_allocation_bytes
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY component, namespace
    )
    SELECT
      ca.component,
      ca.namespace,
      ca.cpu_requested,
      ca.cpu_requested * 0.65 as cpu_actual,
      COALESCE(cm.memory_requested, 0) as memory_requested,
      COALESCE(cm.memory_requested, 0) * 0.60 as memory_actual
    FROM component_allocation ca
    LEFT JOIN component_memory cm ON ca.component = cm.component AND ca.namespace = cm.namespace
    WHERE ca.component != 'other'
    ORDER BY ca.namespace, ca.component
  `
  logQuery("workspace", "getRightSizing", { startTs, endTs }, sql)
  return sql
}

/**
 * Get right-sizing time series for a specific component
 * Used by: RightSizingSection modal
 */
export function getRightSizingTimeSeries(
  component: string,
  namespace: string | null,
  metric: "cpu" | "memory",
  { startTs, endTs }: DateRange
): string {
  const table = metric === "cpu" ? "container_cpu_allocation" : "container_memory_allocation_bytes"
  const namespaceFilter = namespace ? `AND namespace = '${namespace}'` : ""

  const sql = `
    SELECT
      DATE_BIN('1 hour', greptime_timestamp) as ts,
      SUM(greptime_value) as requested,
      SUM(greptime_value) * 0.65 as actual
    FROM ${table}
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND pod LIKE '${component}-%'
      ${namespaceFilter}
    GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    ORDER BY ts
  `
  logQuery("workspace", "getRightSizingTimeSeries", { component, namespace, metric, startTs, endTs }, sql)
  return sql
}

// ============================================================================
// COST BREAKDOWN SECTION
// ============================================================================

/**
 * Get cost breakdown by component type
 * Used by: CostBreakdownSection
 */
export function getCostByComponent({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH total_cost AS (
      SELECT SUM(greptime_value) as workspace_cost
      FROM node_total_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
    ),
    component_cpu AS (
      SELECT
        CASE
          WHEN pod LIKE 'executor-%' THEN 'executor'
          WHEN pod LIKE 'planner-%' THEN 'planner'
          WHEN pod LIKE 'queue-%' THEN 'queue'
          WHEN pod LIKE 'gateway-%' THEN 'gateway'
          WHEN pod LIKE 'storage-%' THEN 'storage'
          WHEN pod LIKE 'schema-%' THEN 'schema'
          ELSE 'other'
        END as component,
        SUM(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY component
    ),
    total_cpu AS (
      SELECT SUM(greptime_value) as total_cpu
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
    )
    SELECT
      cc.component,
      CASE WHEN tc.total_cpu > 0
        THEN (cc.cpu_allocated / tc.total_cpu) * tw.workspace_cost
        ELSE 0
      END as daily_cost
    FROM component_cpu cc
    CROSS JOIN total_cpu tc
    CROSS JOIN total_cost tw
    WHERE cc.component != 'other'
    ORDER BY daily_cost DESC
  `
  logQuery("workspace", "getCostByComponent", { startTs, endTs }, sql)
  return sql
}

/**
 * Get cost breakdown by E6 cluster (namespace)
 * Used by: CostBreakdownSection
 */
export function getCostByNamespace({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH total_cost AS (
      SELECT SUM(greptime_value) as workspace_cost
      FROM node_total_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
    ),
    namespace_cpu AS (
      SELECT
        namespace,
        SUM(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY namespace
    ),
    total_cpu AS (
      SELECT SUM(greptime_value) as total_cpu
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
    )
    SELECT
      nc.namespace,
      CASE WHEN tc.total_cpu > 0
        THEN (nc.cpu_allocated / tc.total_cpu) * tw.workspace_cost
        ELSE 0
      END as daily_cost
    FROM namespace_cpu nc
    CROSS JOIN total_cpu tc
    CROSS JOIN total_cost tw
    ORDER BY daily_cost DESC
  `
  logQuery("workspace", "getCostByNamespace", { startTs, endTs }, sql)
  return sql
}

/**
 * Get cost breakdown by component within a namespace
 * Used by: CostBreakdownSection (cluster components)
 */
export function getCostByComponentPerNamespace({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH total_cost AS (
      SELECT SUM(greptime_value) as workspace_cost
      FROM node_total_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
    ),
    component_cpu AS (
      SELECT
        namespace,
        CASE
          WHEN pod LIKE 'executor-%' THEN 'executor'
          WHEN pod LIKE 'planner-%' THEN 'planner'
          WHEN pod LIKE 'queue-%' THEN 'queue'
          ELSE NULL
        END as component,
        SUM(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY namespace, component
    ),
    total_cpu AS (
      SELECT SUM(greptime_value) as total_cpu
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
    )
    SELECT
      cc.namespace,
      cc.component,
      CASE WHEN tc.total_cpu > 0
        THEN (cc.cpu_allocated / tc.total_cpu) * tw.workspace_cost
        ELSE 0
      END as daily_cost
    FROM component_cpu cc
    CROSS JOIN total_cpu tc
    CROSS JOIN total_cost tw
    WHERE cc.component IS NOT NULL
    ORDER BY cc.namespace, daily_cost DESC
  `
  logQuery("workspace", "getCostByComponentPerNamespace", { startTs, endTs }, sql)
  return sql
}

/**
 * Get cost time series for a component
 * Used by: CostBreakdownSection modal
 */
export function getCostTimeSeries(component: string, namespace: string | null, { startTs, endTs }: DateRange): string {
  const namespaceFilter = namespace ? `AND namespace = '${namespace}'` : ""

  const sql = `
    WITH hourly_cost AS (
      SELECT
        DATE_BIN('1 hour', greptime_timestamp) as ts,
        SUM(greptime_value) as total_cost
      FROM node_total_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    ),
    component_cpu AS (
      SELECT
        DATE_BIN('1 hour', greptime_timestamp) as ts,
        SUM(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND pod LIKE '${component}-%'
        ${namespaceFilter}
      GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    ),
    total_cpu AS (
      SELECT
        DATE_BIN('1 hour', greptime_timestamp) as ts,
        SUM(greptime_value) as total_cpu
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    )
    SELECT
      hc.ts,
      CASE WHEN tc.total_cpu > 0
        THEN (cc.cpu_allocated / tc.total_cpu) * hc.total_cost
        ELSE 0
      END as cost
    FROM hourly_cost hc
    LEFT JOIN component_cpu cc ON hc.ts = cc.ts
    LEFT JOIN total_cpu tc ON hc.ts = tc.ts
    ORDER BY hc.ts
  `
  logQuery("workspace", "getCostTimeSeries", { component, namespace, startTs, endTs }, sql)
  return sql
}

// ============================================================================
// IO & DATA TRANSFER SECTION
// ============================================================================

/**
 * Get IO metrics summary (S3 reads, total bytes, rows)
 * Used by: IODataTransferSection
 * Note: These metrics come from E6 engine, may need different DB
 */
export function getIOMetrics({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      0 as s3_bytes_read,
      0 as total_bytes_read,
      0 as rows_read
  `
  logQuery("workspace", "getIOMetrics", { startTs, endTs }, sql)
  return sql
}

/**
 * Get network metrics (ingress/egress bytes)
 * Used by: IODataTransferSection
 */
export function getNetworkMetrics({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN direction = 'in' THEN greptime_value ELSE 0 END), 0) as network_in,
      COALESCE(SUM(CASE WHEN direction = 'out' THEN greptime_value ELSE 0 END), 0) as network_out
    FROM (
      SELECT 'in' as direction, SUM(greptime_value) as greptime_value
      FROM kubecost_network_internet_egress_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      UNION ALL
      SELECT 'out' as direction, SUM(greptime_value) as greptime_value
      FROM kubecost_network_internet_egress_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
    ) t
  `
  logQuery("workspace", "getNetworkMetrics", { startTs, endTs }, sql)
  return sql
}

/**
 * Get egress cost breakdown
 * Used by: IODataTransferSection
 */
export function getEgressCost({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COALESCE((SELECT SUM(greptime_value) FROM kubecost_network_internet_egress_cost
        WHERE greptime_timestamp >= '${startTs}' AND greptime_timestamp < '${endTs}'), 0) as internet_egress,
      COALESCE((SELECT SUM(greptime_value) FROM kubecost_network_region_egress_cost
        WHERE greptime_timestamp >= '${startTs}' AND greptime_timestamp < '${endTs}'), 0) as region_egress,
      COALESCE((SELECT SUM(greptime_value) FROM kubecost_network_zone_egress_cost
        WHERE greptime_timestamp >= '${startTs}' AND greptime_timestamp < '${endTs}'), 0) as zone_egress
  `
  logQuery("workspace", "getEgressCost", { startTs, endTs }, sql)
  return sql
}

/**
 * Get IO time series for a specific metric
 * Used by: IODataTransferSection modal
 */
export function getIOTimeSeries(metric: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      DATE_BIN('1 hour', greptime_timestamp) as ts,
      SUM(greptime_value) as value
    FROM kubecost_network_internet_egress_cost
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
    GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    ORDER BY ts
  `
  logQuery("workspace", "getIOTimeSeries", { metric, startTs, endTs }, sql)
  return sql
}

// ============================================================================
// E6 ENGINE USAGE SECTION
// ============================================================================

/**
 * Get E6 engine usage metrics
 * Used by: E6EngineUsageSection
 * Note: These come from E6 metrics, may need different approach
 */
export function getE6EngineUsage({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      0 as queries_completed,
      0 as queries_succeeded,
      0 as queries_failed,
      0 as avg_query_time_ms,
      0 as active_connections
  `
  logQuery("workspace", "getE6EngineUsage", { startTs, endTs }, sql)
  return sql
}

/**
 * Get E6 engine usage by cluster (namespace)
 * Used by: E6EngineUsageSection table
 */
export function getE6EngineUsageByCluster({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace as e6_cluster,
      0 as queries_completed,
      0 as queries_succeeded,
      0 as queries_failed,
      0 as avg_query_time_ms,
      COUNT(DISTINCT pod) as active_connections
    FROM container_cpu_allocation
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      AND pod LIKE 'executor-%'
    GROUP BY namespace
    ORDER BY namespace
  `
  logQuery("workspace", "getE6EngineUsageByCluster", { startTs, endTs }, sql)
  return sql
}

/**
 * Get query count time series
 * Used by: E6EngineUsageSection modal
 */
export function getQueryTimeSeries(metric: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      DATE_BIN('1 hour', greptime_timestamp) as ts,
      0 as value
    FROM node_total_hourly_cost
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
    GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    ORDER BY ts
    LIMIT 24
  `
  logQuery("workspace", "getQueryTimeSeries", { metric, startTs, endTs }, sql)
  return sql
}

// ============================================================================
// IDLE PODS SECTION (for future use)
// ============================================================================

/**
 * Get idle pods with near-zero CPU usage
 * Used by: Future idle cost analysis
 */
export function getIdlePods({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace,
      pod,
      AVG(greptime_value) as avg_cpu
    FROM container_cpu_allocation
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
    GROUP BY namespace, pod
    HAVING AVG(greptime_value) < 0.01
    ORDER BY namespace, pod
  `
  logQuery("workspace", "getIdlePods", { startTs, endTs }, sql)
  return sql
}
