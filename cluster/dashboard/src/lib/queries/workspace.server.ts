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
        AVG(greptime_value) as cpu_requested
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
        AVG(greptime_value) as memory_requested
      FROM container_memory_allocation_bytes
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY component, namespace
    ),
    cpu_usage AS (
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
        pod,
        MIN(greptime_value) as min_cpu,
        MAX(greptime_value) as max_cpu,
        MIN(greptime_timestamp) as min_ts,
        MAX(greptime_timestamp) as max_ts
      FROM container_cpu_usage_seconds_total
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY component, namespace, pod
    ),
    cpu_usage_agg AS (
      SELECT
        component,
        namespace,
        SUM(max_cpu - min_cpu) as delta_cpu,
        MAX(max_ts) - MIN(min_ts) as delta_time_ms
      FROM cpu_usage
      GROUP BY component, namespace
    ),
    memory_usage AS (
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
        AVG(greptime_value) as avg_memory_used
      FROM container_memory_working_set_bytes
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
      CASE WHEN cu.delta_time_ms > 0
        THEN cu.delta_cpu / (cu.delta_time_ms / 1000)
        ELSE 0
      END as cpu_actual,
      COALESCE(cm.memory_requested, 0) as memory_requested,
      COALESCE(mu.avg_memory_used, 0) as memory_actual
    FROM component_allocation ca
    LEFT JOIN component_memory cm ON ca.component = cm.component AND ca.namespace = cm.namespace
    LEFT JOIN cpu_usage_agg cu ON ca.component = cu.component AND ca.namespace = cu.namespace
    LEFT JOIN memory_usage mu ON ca.component = mu.component AND ca.namespace = mu.namespace
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
  const namespaceFilter = namespace ? `AND namespace = '${namespace}'` : ""

  if (metric === "cpu") {
    const sql = `
      WITH hourly_requested AS (
        SELECT
          DATE_BIN('1 hour', greptime_timestamp) as ts,
          AVG(greptime_value) as requested
        FROM container_cpu_allocation
        WHERE greptime_timestamp >= '${startTs}'
          AND greptime_timestamp < '${endTs}'
          AND pod LIKE '${component}-%'
          ${namespaceFilter}
        GROUP BY DATE_BIN('1 hour', greptime_timestamp)
      ),
      hourly_usage AS (
        SELECT
          DATE_BIN('1 hour', greptime_timestamp) as ts,
          pod,
          MIN(greptime_value) as min_cpu,
          MAX(greptime_value) as max_cpu
        FROM container_cpu_usage_seconds_total
        WHERE greptime_timestamp >= '${startTs}'
          AND greptime_timestamp < '${endTs}'
          AND pod LIKE '${component}-%'
          ${namespaceFilter}
        GROUP BY DATE_BIN('1 hour', greptime_timestamp), pod
      ),
      hourly_actual AS (
        SELECT
          ts,
          SUM(max_cpu - min_cpu) / 3600 as actual
        FROM hourly_usage
        GROUP BY ts
      )
      SELECT
        hr.ts,
        hr.requested,
        COALESCE(ha.actual, 0) as actual
      FROM hourly_requested hr
      LEFT JOIN hourly_actual ha ON hr.ts = ha.ts
      ORDER BY hr.ts
    `
    logQuery("workspace", "getRightSizingTimeSeries", { component, namespace, metric, startTs, endTs }, sql)
    return sql
  } else {
    const sql = `
      WITH hourly_requested AS (
        SELECT
          DATE_BIN('1 hour', greptime_timestamp) as ts,
          AVG(greptime_value) as requested
        FROM container_memory_allocation_bytes
        WHERE greptime_timestamp >= '${startTs}'
          AND greptime_timestamp < '${endTs}'
          AND pod LIKE '${component}-%'
          ${namespaceFilter}
        GROUP BY DATE_BIN('1 hour', greptime_timestamp)
      ),
      hourly_actual AS (
        SELECT
          DATE_BIN('1 hour', greptime_timestamp) as ts,
          AVG(greptime_value) as actual
        FROM container_memory_working_set_bytes
        WHERE greptime_timestamp >= '${startTs}'
          AND greptime_timestamp < '${endTs}'
          AND pod LIKE '${component}-%'
          ${namespaceFilter}
        GROUP BY DATE_BIN('1 hour', greptime_timestamp)
      )
      SELECT
        hr.ts,
        hr.requested,
        COALESCE(ha.actual, 0) as actual
      FROM hourly_requested hr
      LEFT JOIN hourly_actual ha ON hr.ts = ha.ts
      ORDER BY hr.ts
    `
    logQuery("workspace", "getRightSizingTimeSeries", { component, namespace, metric, startTs, endTs }, sql)
    return sql
  }
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
    SELECT component, SUM(cpu_alloc) as cpu_allocated
    FROM (
      SELECT
        CASE
          WHEN pod LIKE 'executor-%' THEN 'executor'
          WHEN pod LIKE 'planner-%' THEN 'planner'
          WHEN pod LIKE 'queue-%' THEN 'queue'
          WHEN pod LIKE 'gateway-%' THEN 'gateway'
          WHEN pod LIKE 'storage-%' THEN 'storage'
          WHEN pod LIKE 'schema-%' THEN 'schema'
          ELSE NULL
        END as component,
        pod,
        MAX(greptime_value) as cpu_alloc
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY component, pod
    )
    WHERE component IS NOT NULL
    GROUP BY component
    ORDER BY cpu_allocated DESC
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
    SELECT
      namespace,
      AVG(greptime_value) as cpu_allocated
    FROM container_cpu_allocation
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
    GROUP BY namespace
    ORDER BY cpu_allocated DESC
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
    SELECT namespace, component, SUM(cpu_alloc) as cpu_allocated
    FROM (
      SELECT
        namespace,
        CASE
          WHEN pod LIKE 'executor-%' THEN 'executor'
          WHEN pod LIKE 'planner-%' THEN 'planner'
          WHEN pod LIKE 'queue-%' THEN 'queue'
          ELSE NULL
        END as component,
        pod,
        MAX(greptime_value) as cpu_alloc
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY namespace, component, pod
    )
    WHERE component IS NOT NULL
    GROUP BY namespace, component
    ORDER BY namespace, cpu_allocated DESC
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
    SELECT
      DATE_BIN('1 hour', greptime_timestamp) as ts,
      AVG(greptime_value) as cost
    FROM container_cpu_allocation
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND pod LIKE '${component}-%'
      ${namespaceFilter}
    GROUP BY DATE_BIN('1 hour', greptime_timestamp)
    ORDER BY ts
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
 * Note: These metrics come from E6 engine - not available from OpenCost
 * Returns empty result until E6 engine metrics are exported
 */
export function getIOMetrics({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      NULL as s3_bytes_read,
      NULL as total_bytes_read,
      NULL as rows_read
    WHERE 1=0
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
 * Note: Query metrics come from E6 engine - not available from OpenCost
 * Returns empty result until E6 engine metrics are exported
 */
export function getE6EngineUsage({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      NULL as queries_completed,
      NULL as queries_succeeded,
      NULL as queries_failed,
      NULL as avg_query_time_ms,
      NULL as active_connections
    WHERE 1=0
  `
  logQuery("workspace", "getE6EngineUsage", { startTs, endTs }, sql)
  return sql
}

/**
 * Get E6 engine usage by cluster (namespace)
 * Used by: E6EngineUsageSection table
 * Note: Query metrics not available from OpenCost, only executor count is real
 */
export function getE6EngineUsageByCluster({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace as e6_cluster,
      NULL as queries_completed,
      NULL as queries_succeeded,
      NULL as queries_failed,
      NULL as avg_query_time_ms,
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
 * Note: Query metrics not available from OpenCost
 * Returns empty result until E6 engine metrics are exported
 */
export function getQueryTimeSeries(metric: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      NULL as ts,
      NULL as value
    WHERE 1=0
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
