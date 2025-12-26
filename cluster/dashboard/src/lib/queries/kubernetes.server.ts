// Kubernetes Metrics Queries
// All queries take startTs and endTs as parameters for date filtering

import { logQuery } from '../logger.server'

interface DateRange {
  startTs: string
  endTs: string
}

/**
 * Get all clusters with node count
 */
export function getAllClusters({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      TRIM(cluster) as cluster,
      COUNT(DISTINCT node) as node_count
    FROM kube_node_info
    WHERE greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
      AND cluster IS NOT NULL
      AND TRIM(cluster) != ''
    GROUP BY TRIM(cluster)
    ORDER BY cluster
  `
  logQuery('kubernetes', 'getAllClusters', { startTs, endTs }, sql)
  return sql
}

/**
 * Get cluster stats (pods, namespaces, cost, resources)
 */
export function getClusterStats(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH node_hourly_rates AS (
      SELECT node, AVG(greptime_value) as avg_hourly_rate
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    ),
    hours_in_range AS (
      SELECT EXTRACT(EPOCH FROM ('${endTs}'::timestamp - '${startTs}'::timestamp)) / 3600 as hours
    ),
    cpu_alloc_avg AS (
      SELECT pod, AVG(greptime_value) as avg_cpu
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod
    ),
    mem_alloc_avg AS (
      SELECT pod, AVG(greptime_value) as avg_mem
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod
    )
    SELECT
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as pod_count,
      (SELECT COUNT(DISTINCT namespace) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as namespace_count,
      (SELECT SUM(avg_hourly_rate) * (SELECT hours FROM hours_in_range) FROM node_hourly_rates) as total_cost,
      (SELECT SUM(avg_cpu) FROM cpu_alloc_avg) as cpu_allocated,
      (SELECT SUM(avg_mem) FROM mem_alloc_avg) as memory_allocated
  `
  logQuery('kubernetes', 'getClusterStats', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get cluster summary (for cluster detail page)
 */
export function getClusterSummary(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH node_hourly_rates AS (
      SELECT node, AVG(greptime_value) as avg_hourly_rate
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    ),
    hours_in_range AS (
      SELECT EXTRACT(EPOCH FROM ('${endTs}'::timestamp - '${startTs}'::timestamp)) / 3600 as hours
    ),
    cpu_alloc_avg AS (
      SELECT pod, AVG(greptime_value) as avg_cpu
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod
    ),
    mem_alloc_avg AS (
      SELECT pod, AVG(greptime_value) as avg_mem
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod
    )
    SELECT
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as pod_count,
      (SELECT COUNT(DISTINCT node) FROM kube_node_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as node_count,
      (SELECT SUM(avg_cpu) FROM cpu_alloc_avg) as total_cpu_alloc,
      (SELECT SUM(avg_mem) FROM mem_alloc_avg) as total_mem_alloc,
      (SELECT SUM(avg_hourly_rate) * (SELECT hours FROM hours_in_range) FROM node_hourly_rates) as total_cost
  `
  logQuery('kubernetes', 'getClusterSummary', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get namespaces for a cluster
 */
export function getNamespaces(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DISTINCT namespace
    FROM kube_pod_info
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    ORDER BY namespace
  `
  logQuery('kubernetes', 'getNamespaces', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get pods with resource allocation and usage
 */
export function getPods(cluster: string, { startTs, endTs }: DateRange, namespace?: string): string {
  const namespaceFilter = namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''
  const sql = `
    WITH latest_pods AS (
      SELECT pod, namespace, node, created_by_kind, created_by_name, MAX(greptime_timestamp) as ts
      FROM kube_pod_info
      WHERE cluster = '${cluster}'
        ${namespaceFilter}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace, node, created_by_kind, created_by_name
    ),
    cpu_alloc AS (
      SELECT pod, namespace, AVG(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}' ${namespaceFilter}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace
    ),
    mem_alloc AS (
      SELECT pod, namespace, AVG(greptime_value) as memory_allocated
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}' ${namespaceFilter}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace
    ),
    cpu_usage AS (
      SELECT pod, namespace,
        (MAX(greptime_value) - MIN(greptime_value)) / NULLIF(EXTRACT(EPOCH FROM (MAX(greptime_timestamp) - MIN(greptime_timestamp))), 0) as cpu_used
      FROM container_cpu_usage_seconds_total
      WHERE cluster = '${cluster}' ${namespaceFilter}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace
    ),
    mem_usage AS (
      SELECT pod, namespace, AVG(greptime_value) as memory_used
      FROM container_memory_working_set_bytes
      WHERE cluster = '${cluster}' ${namespaceFilter}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace
    )
    SELECT
      p.pod as name, p.namespace, p.node, p.created_by_kind, p.created_by_name,
      COALESCE(ca.cpu_allocated, 0) as cpu_alloc,
      COALESCE(ma.memory_allocated, 0) as mem_alloc,
      COALESCE(cu.cpu_used, 0) as cpu_used,
      COALESCE(mu.memory_used, 0) as mem_used
    FROM latest_pods p
    LEFT JOIN cpu_alloc ca ON p.pod = ca.pod AND p.namespace = ca.namespace
    LEFT JOIN mem_alloc ma ON p.pod = ma.pod AND p.namespace = ma.namespace
    LEFT JOIN cpu_usage cu ON p.pod = cu.pod AND p.namespace = cu.namespace
    LEFT JOIN mem_usage mu ON p.pod = mu.pod AND p.namespace = mu.namespace
    ORDER BY p.namespace, p.pod
  `
  logQuery('kubernetes', 'getPods', { cluster, startTs, endTs, namespace }, sql)
  return sql
}

/**
 * Get nodes with cost and capacity
 */
export function getNodes(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH hours_in_range AS (
      SELECT EXTRACT(EPOCH FROM ('${endTs}'::timestamp - '${startTs}'::timestamp)) / 3600 as hours
    ),
    node_costs AS (
      SELECT node, instance_type, region, AVG(greptime_value) as avg_hourly_rate
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node, instance_type, region
    ),
    node_capacity AS (
      SELECT node,
        MAX(CASE WHEN resource = 'cpu' THEN greptime_value END) as cpu_capacity,
        MAX(CASE WHEN resource = 'memory' THEN greptime_value END) as mem_capacity
      FROM kube_node_status_capacity
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    ),
    node_mem AS (
      SELECT node, MAX(greptime_value) as mem_total
      FROM node_memory_MemTotal_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    ),
    node_mem_avail AS (
      SELECT node, MAX(greptime_value) as mem_available
      FROM node_memory_MemAvailable_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    ),
    pod_count AS (
      SELECT node, COUNT(DISTINCT pod) as pods
      FROM kube_pod_info
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    )
    SELECT
      n.node as name, n.instance_type, n.region,
      n.avg_hourly_rate * (SELECT hours FROM hours_in_range) as total_cost,
      COALESCE(nc.cpu_capacity, 0) as cpu_capacity,
      COALESCE(nm.mem_total, 0) as mem_capacity,
      COALESCE(nm.mem_total - nma.mem_available, 0) as mem_used,
      COALESCE(pc.pods, 0) as pods
    FROM node_costs n
    LEFT JOIN node_capacity nc ON n.node = nc.node
    LEFT JOIN node_mem nm ON n.node = nm.node
    LEFT JOIN node_mem_avail nma ON n.node = nma.node
    LEFT JOIN pod_count pc ON n.node = pc.node
    ORDER BY total_cost DESC
  `
  logQuery('kubernetes', 'getNodes', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get cost breakdown by namespace
 */
export function getCostByNamespace(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH hours_in_range AS (
      SELECT EXTRACT(EPOCH FROM ('${endTs}'::timestamp - '${startTs}'::timestamp)) / 3600 as hours
    ),
    namespace_cpu AS (
      SELECT namespace, AVG(greptime_value) as avg_cpu
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY namespace
    ),
    namespace_mem AS (
      SELECT namespace, AVG(greptime_value) as avg_mem
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY namespace
    )
    SELECT nc.namespace, nc.avg_cpu as total_cpu, nm.avg_mem as total_mem,
      (nc.avg_cpu * 0.03 + nm.avg_mem / 1073741824 * 0.004) * (SELECT hours FROM hours_in_range) as total_cost
    FROM namespace_cpu nc
    LEFT JOIN namespace_mem nm ON nc.namespace = nm.namespace
    ORDER BY total_cost DESC
  `
  logQuery('kubernetes', 'getCostByNamespace', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get namespace efficiency (requests vs usage)
 */
export function getNamespaceEfficiency(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH requests AS (
      SELECT namespace, AVG(greptime_value) as cpu_requested
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY namespace
    ),
    usage AS (
      SELECT namespace,
        (MAX(greptime_value) - MIN(greptime_value)) / NULLIF(EXTRACT(EPOCH FROM (MAX(greptime_timestamp) - MIN(greptime_timestamp))), 0) as cpu_used
      FROM container_cpu_usage_seconds_total
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY namespace
    )
    SELECT r.namespace,
           COALESCE(u.cpu_used, 0) as cpu_used,
           GREATEST(r.cpu_requested - COALESCE(u.cpu_used, 0), 0) as cpu_unused,
           r.cpu_requested as cpu_total,
           CASE WHEN r.cpu_requested > 0
                THEN (COALESCE(u.cpu_used, 0) / r.cpu_requested) * 100
                ELSE 0 END as efficiency_pct
    FROM requests r
    LEFT JOIN usage u ON r.namespace = u.namespace
    ORDER BY r.cpu_requested DESC
    LIMIT 10
  `
  logQuery('kubernetes', 'getNamespaceEfficiency', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get node capacity types (spot vs on-demand)
 */
export function getNodeCapacityTypes(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH hours_in_range AS (
      SELECT EXTRACT(EPOCH FROM ('${endTs}'::timestamp - '${startTs}'::timestamp)) / 3600 as hours
    ),
    node_avg_costs AS (
      SELECT node, AVG(greptime_value) as avg_hourly_rate
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    )
    SELECT
      COALESCE(label_eks_amazonaws_com_capacityType, 'on-demand') as capacity_type,
      COUNT(DISTINCT nl.node) as node_count,
      SUM(c.avg_hourly_rate) * (SELECT hours FROM hours_in_range) as total_cost
    FROM kube_node_labels nl
    LEFT JOIN node_avg_costs c ON nl.node = c.node
    WHERE nl.cluster = '${cluster}'
      AND nl.greptime_timestamp >= '${startTs}'::timestamp
      AND nl.greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1
  `
  logQuery('kubernetes', 'getNodeCapacityTypes', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get CPU usage by namespace time series
 */
export function getCpuByNamespaceTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
           namespace,
           (MAX(greptime_value) - MIN(greptime_value)) / NULLIF(EXTRACT(EPOCH FROM (MAX(greptime_timestamp) - MIN(greptime_timestamp))), 0) as cpu_usage
    FROM container_cpu_usage_seconds_total
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1, 2
    ORDER BY time
  `
  logQuery('kubernetes', 'getCpuByNamespaceTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get memory usage by namespace time series
 */
export function getMemoryByNamespaceTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
           namespace,
           AVG(greptime_value) / (1024 * 1024) as memory_mb
    FROM container_memory_working_set_bytes
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1, 2
    ORDER BY time
  `
  logQuery('kubernetes', 'getMemoryByNamespaceTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get pod count time series
 */
export function getPodCountTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
           COUNT(DISTINCT pod) as pod_count
    FROM kube_pod_info
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1
    ORDER BY time
  `
  logQuery('kubernetes', 'getPodCountTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get CPU allocation time series
 */
export function getCpuAllocationTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
           SUM(greptime_value) as cpu_allocated
    FROM container_cpu_allocation
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1
    ORDER BY time
  `
  logQuery('kubernetes', 'getCpuAllocationTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get memory allocation time series
 */
export function getMemoryAllocationTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
           SUM(greptime_value) / (1024 * 1024 * 1024) as memory_allocated_gb
    FROM container_memory_allocation_bytes
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1
    ORDER BY time
  `
  logQuery('kubernetes', 'getMemoryAllocationTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get efficiency time series
 */
export function getEfficiencyTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH hourly_requests AS (
      SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
             SUM(greptime_value) as cpu_requested
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY 1
    ),
    hourly_usage AS (
      SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
             (MAX(greptime_value) - MIN(greptime_value)) / NULLIF(EXTRACT(EPOCH FROM (MAX(greptime_timestamp) - MIN(greptime_timestamp))), 0) as cpu_used
      FROM container_cpu_usage_seconds_total
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY 1
    )
    SELECT r.time,
           CASE WHEN r.cpu_requested > 0
                THEN (COALESCE(u.cpu_used, 0) / r.cpu_requested) * 100
                ELSE 0 END as efficiency_pct
    FROM hourly_requests r
    LEFT JOIN hourly_usage u ON r.time = u.time
    ORDER BY r.time
  `
  logQuery('kubernetes', 'getEfficiencyTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get pod CPU time series
 */
export function getPodCpuTimeSeries(cluster: string, { startTs, endTs }: DateRange, namespace?: string): string {
  const namespaceFilter = namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time, pod,
      (MAX(greptime_value) - MIN(greptime_value)) / NULLIF(EXTRACT(EPOCH FROM (MAX(greptime_timestamp) - MIN(greptime_timestamp))), 0) as cpu_usage
    FROM container_cpu_usage_seconds_total
    WHERE cluster = '${cluster}'
      ${namespaceFilter}
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY DATE_TRUNC('hour', greptime_timestamp), pod
    ORDER BY time
  `
  logQuery('kubernetes', 'getPodCpuTimeSeries', { cluster, startTs, endTs, namespace }, sql)
  return sql
}

/**
 * Get pod memory time series
 */
export function getPodMemoryTimeSeries(cluster: string, { startTs, endTs }: DateRange, namespace?: string): string {
  const namespaceFilter = namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time, pod, AVG(greptime_value) as memory_usage
    FROM container_memory_working_set_bytes
    WHERE cluster = '${cluster}'
      ${namespaceFilter}
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY DATE_TRUNC('hour', greptime_timestamp), pod
    ORDER BY time
  `
  logQuery('kubernetes', 'getPodMemoryTimeSeries', { cluster, startTs, endTs, namespace }, sql)
  return sql
}

/**
 * Get node CPU time series
 */
export function getNodeCpuTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time, node,
      (MAX(greptime_value) - MIN(greptime_value)) / NULLIF(EXTRACT(EPOCH FROM (MAX(greptime_timestamp) - MIN(greptime_timestamp))), 0) as cpu_seconds
    FROM node_cpu_seconds_total
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY DATE_TRUNC('hour', greptime_timestamp), node
    ORDER BY time
  `
  logQuery('kubernetes', 'getNodeCpuTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get data health (last data timestamp) for a cluster
 */
export function getDataHealth(cluster: string): string {
  const sql = `
    SELECT MAX(greptime_timestamp) as last_data
    FROM container_cpu_usage_seconds_total
    WHERE cluster = '${cluster}'
  `
  logQuery('kubernetes', 'getDataHealth', { cluster }, sql)
  return sql
}

/**
 * Get global data health (last data timestamp across all clusters)
 */
export function getGlobalDataHealth(): string {
  const sql = `
    SELECT MAX(greptime_timestamp) as last_data
    FROM container_cpu_usage_seconds_total
  `
  logQuery('kubernetes', 'getGlobalDataHealth', {}, sql)
  return sql
}

/**
 * Get cluster cost summary for E6 cluster page
 * Returns total hourly cost and breakdown by node
 */
export function getClusterCostSummary(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH hours_in_range AS (
      SELECT EXTRACT(EPOCH FROM ('${endTs}'::timestamp - '${startTs}'::timestamp)) / 3600 as hours
    ),
    node_costs AS (
      SELECT node, AVG(greptime_value) as avg_hourly_rate
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    )
    SELECT
      COUNT(DISTINCT node) as node_count,
      SUM(avg_hourly_rate) as hourly_cost,
      SUM(avg_hourly_rate) * (SELECT hours FROM hours_in_range) as total_cost
    FROM node_costs
  `
  logQuery('kubernetes', 'getClusterCostSummary', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get cost time series for a cluster (hourly)
 */
export function getClusterCostTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      DATE_TRUNC('hour', greptime_timestamp) as time,
      SUM(greptime_value) as hourly_cost
    FROM node_total_hourly_cost
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1
    ORDER BY time
  `
  logQuery('kubernetes', 'getClusterCostTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get CPU cost time series for a cluster (from OpenCost container costs)
 */
export function getContainerCpuCostTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      DATE_TRUNC('hour', greptime_timestamp) as time,
      SUM(greptime_value) as cpu_cost
    FROM opencost_pod_container_cpu_cost_hourly
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1
    ORDER BY time
  `
  logQuery('kubernetes', 'getContainerCpuCostTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get memory cost time series for a cluster (from OpenCost container costs)
 */
export function getContainerMemoryCostTimeSeries(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      DATE_TRUNC('hour', greptime_timestamp) as time,
      SUM(greptime_value) as memory_cost
    FROM opencost_pod_container_memory_cost_hourly
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1
    ORDER BY time
  `
  logQuery('kubernetes', 'getContainerMemoryCostTimeSeries', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get container cost time series by component (from OpenCost)
 */
export function getContainerCostByComponent(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      DATE_TRUNC('hour', greptime_timestamp) as time,
      container as component,
      SUM(greptime_value) as cpu_cost
    FROM container_cpu_cost_hourly
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1, 2
    ORDER BY time, component
  `
  logQuery('kubernetes', 'getContainerCostByComponent', { cluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get node cost breakdown for a cluster
 */
export function getNodeCostBreakdown(cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH hours_in_range AS (
      SELECT EXTRACT(EPOCH FROM ('${endTs}'::timestamp - '${startTs}'::timestamp)) / 3600 as hours
    ),
    cpu_costs AS (
      SELECT node, AVG(greptime_value) as avg_cpu_hourly
      FROM node_cpu_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    ),
    ram_costs AS (
      SELECT node, AVG(greptime_value) as avg_ram_hourly
      FROM node_ram_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    ),
    total_costs AS (
      SELECT node, AVG(greptime_value) as avg_total_hourly
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY node
    )
    SELECT
      t.node,
      COALESCE(c.avg_cpu_hourly, 0) * (SELECT hours FROM hours_in_range) as cpu_cost,
      COALESCE(r.avg_ram_hourly, 0) * (SELECT hours FROM hours_in_range) as ram_cost,
      t.avg_total_hourly * (SELECT hours FROM hours_in_range) as total_cost
    FROM total_costs t
    LEFT JOIN cpu_costs c ON t.node = c.node
    LEFT JOIN ram_costs r ON t.node = r.node
    ORDER BY total_cost DESC
  `
  logQuery('kubernetes', 'getNodeCostBreakdown', { cluster, startTs, endTs }, sql)
  return sql
}
