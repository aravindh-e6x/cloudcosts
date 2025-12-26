// E6 Metrics Queries
// All queries take startTs and endTs as parameters for date filtering
//
// Data structure from mock-exporter:
// - kubernetes DB: eks_cluster (workspace), namespace (e6_cluster or 'workspace')
// - e6_* DB: e6_cluster, e6_workspace

import { logQuery } from '../logger.server'

interface DateRange {
  startTs: string
  endTs: string
}

/**
 * Get all EKS clusters (workspaces) with metadata for the selected day
 * Queries the kubernetes database
 */
export function getWorkspaces({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DISTINCT
      n.eks_cluster,
      l.label_topology_kubernetes_io_region as region
    FROM kube_node_info n
    LEFT JOIN kube_node_labels l ON n.eks_cluster = l.eks_cluster AND n.node = l.node
      AND l.ts >= '${startTs}'::timestamp AND l.ts < '${endTs}'::timestamp
    WHERE n.ts >= '${startTs}'::timestamp AND n.ts < '${endTs}'::timestamp
    ORDER BY n.eks_cluster
  `
  logQuery('e6', 'getWorkspaces', { startTs, endTs }, sql)
  return sql
}

/**
 * Get node count time series for a workspace (last 24 hours)
 * Queries the kubernetes database
 */
export function getNodeCountTimeSeries(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      COUNT(DISTINCT node) as node_count
    FROM kube_node_info
    WHERE eks_cluster = '${eksCluster}'
      AND ts >= '${startTs}'::timestamp
      AND ts < '${endTs}'::timestamp
    GROUP BY ts
    ORDER BY ts
  `
  logQuery('e6', 'getNodeCountTimeSeries', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get cost time series for a workspace (last 24 hours)
 * Queries the kubernetes database
 */
export function getCostTimeSeries(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      SUM(metric_value) as hourly_cost
    FROM node_total_hourly_cost
    WHERE eks_cluster = '${eksCluster}'
      AND ts >= '${startTs}'::timestamp
      AND ts < '${endTs}'::timestamp
    GROUP BY ts
    ORDER BY ts
  `
  logQuery('e6', 'getCostTimeSeries', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get pod count time series for a workspace (last 24 hours)
 * Queries the kubernetes database
 */
export function getPodCountTimeSeries(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      COUNT(DISTINCT pod) as pod_count
    FROM kube_pod_info
    WHERE eks_cluster = '${eksCluster}'
      AND ts >= '${startTs}'::timestamp
      AND ts < '${endTs}'::timestamp
    GROUP BY ts
    ORDER BY ts
  `
  logQuery('e6', 'getPodCountTimeSeries', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get workspace cost for selected day
 * Queries the kubernetes database
 */
export function getWorkspaceCost(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      SUM(metric_value) as total_cost,
      SUM(metric_value) / 24 as hourly_cost
    FROM node_total_hourly_cost
    WHERE eks_cluster = '${eksCluster}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
  `
  logQuery('e6', 'getWorkspaceCost', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get workspace info (region) for a specific EKS cluster
 * Queries the kubernetes database
 */
export function getWorkspaceInfo(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DISTINCT
      n.eks_cluster,
      l.label_topology_kubernetes_io_region as region
    FROM kube_node_info n
    LEFT JOIN kube_node_labels l ON n.eks_cluster = l.eks_cluster AND n.node = l.node
      AND l.ts >= '${startTs}'::timestamp AND l.ts < '${endTs}'::timestamp
    WHERE n.eks_cluster = '${eksCluster}'
      AND n.ts >= '${startTs}'::timestamp AND n.ts < '${endTs}'::timestamp
    LIMIT 1
  `
  logQuery('e6', 'getWorkspaceInfo', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get E6 clusters (namespaces) for a specific EKS cluster
 * Queries the kubernetes database
 */
export function getE6Clusters(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT DISTINCT namespace as e6_cluster
    FROM kube_pod_labels
    WHERE eks_cluster = '${eksCluster}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      AND label_component IN ('executor', 'queue', 'planner')
    ORDER BY namespace
  `
  logQuery('e6', 'getE6Clusters', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get workspace summary stats (nodes, pods) for selected day
 * Queries the kubernetes database
 */
export function getWorkspaceStats(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      (SELECT COUNT(DISTINCT node) FROM kube_node_info
       WHERE eks_cluster = '${eksCluster}'
         AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp) as node_count,
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_info
       WHERE eks_cluster = '${eksCluster}'
         AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp) as pod_count,
      (SELECT COUNT(DISTINCT namespace) FROM kube_pod_labels
       WHERE eks_cluster = '${eksCluster}'
         AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
         AND label_component IN ('executor', 'queue', 'planner')) as e6_cluster_count
  `
  logQuery('e6', 'getWorkspaceStats', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get customer summary stats (cluster count, last updated)
 */
export function getCustomerStats({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT cluster_name) as cluster_count,
      MAX(ts) as last_updated
    FROM e6_engine_metrics
    WHERE ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
  `
  logQuery('e6', 'getCustomerStats', { startTs, endTs }, sql)
  return sql
}

/**
 * Get container count for a customer
 */
export function getContainerCount({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT COUNT(DISTINCT pod) as container_count
    FROM e6_container_metrics
    WHERE ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
  `
  logQuery('e6', 'getContainerCount', { startTs, endTs }, sql)
  return sql
}

/**
 * Get cluster list with last updated timestamp
 */
export function getClusterList({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      cluster_name,
      MAX(ts) as last_updated
    FROM e6_engine_metrics
    WHERE ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    GROUP BY cluster_name
    ORDER BY cluster_name
  `
  logQuery('e6', 'getClusterList', { startTs, endTs }, sql)
  return sql
}

/**
 * Get executor count per cluster (using latest data in range)
 */
export function getExecutorCountByCluster({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH latest_ts AS (
      SELECT cluster_name, MAX(ts) as max_ts
      FROM e6_executor_metrics
      WHERE ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      GROUP BY cluster_name
    )
    SELECT
      e.cluster_name,
      COUNT(DISTINCT e.pod) as executor_count
    FROM e6_executor_metrics e
    JOIN latest_ts l ON e.cluster_name = l.cluster_name
      AND e.ts >= l.max_ts - INTERVAL '10 minutes'
      AND e.ts <= l.max_ts
    GROUP BY e.cluster_name
  `
  logQuery('e6', 'getExecutorCountByCluster', { startTs, endTs }, sql)
  return sql
}

/**
 * Get container count per cluster (using latest data in range)
 */
export function getContainerCountByCluster({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH latest_ts AS (
      SELECT cluster_name, MAX(ts) as max_ts
      FROM e6_container_metrics
      WHERE ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      GROUP BY cluster_name
    )
    SELECT
      c.cluster_name,
      COUNT(DISTINCT c.pod) as container_count
    FROM e6_container_metrics c
    JOIN latest_ts l ON c.cluster_name = l.cluster_name
      AND c.ts >= l.max_ts - INTERVAL '10 minutes'
      AND c.ts <= l.max_ts
    GROUP BY c.cluster_name
  `
  logQuery('e6', 'getContainerCountByCluster', { startTs, endTs }, sql)
  return sql
}

/**
 * Get queue depth per cluster (using latest data in range)
 */
export function getQueueDepthByCluster({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH latest_ts AS (
      SELECT cluster_name, MAX(ts) as max_ts
      FROM e6_queue_metrics
      WHERE metric_name = 'io_e6x_E6Queue_NumExecutionQueuedQueries'
        AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      GROUP BY cluster_name
    )
    SELECT
      q.cluster_name,
      MAX(q.metric_value) as queue_depth
    FROM e6_queue_metrics q
    JOIN latest_ts l ON q.cluster_name = l.cluster_name
      AND q.ts >= l.max_ts - INTERVAL '10 minutes'
      AND q.ts <= l.max_ts
    WHERE q.metric_name = 'io_e6x_E6Queue_NumExecutionQueuedQueries'
    GROUP BY q.cluster_name
  `
  logQuery('e6', 'getQueueDepthByCluster', { startTs, endTs }, sql)
  return sql
}

/**
 * Get data health (last data timestamp) for a cluster
 */
export function getClusterDataHealth(clusterName: string): string {
  const sql = `
    SELECT MAX(ts) as last_data
    FROM e6_container_metrics
    WHERE cluster_name = '${clusterName}'
  `
  logQuery('e6', 'getClusterDataHealth', { clusterName }, sql)
  return sql
}

/**
 * Get executor metrics time series for a cluster
 */
export function getExecutorMetrics(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT ts, metric_name, metric_value
    FROM e6_executor_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    ORDER BY ts
  `
  logQuery('e6', 'getExecutorMetrics', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get queue metrics time series for a cluster
 */
export function getQueueMetrics(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT ts, metric_name, metric_value
    FROM e6_queue_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    ORDER BY ts
  `
  logQuery('e6', 'getQueueMetrics', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get storage metrics time series for a cluster
 */
export function getStorageMetrics(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT ts, metric_name, metric_value
    FROM e6_storage_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    ORDER BY ts
  `
  logQuery('e6', 'getStorageMetrics', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get schema metrics time series for a cluster
 */
export function getSchemaMetrics(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT ts, metric_name, metric_value
    FROM e6_schema_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    ORDER BY ts
  `
  logQuery('e6', 'getSchemaMetrics', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get container metrics time series for a cluster
 */
export function getContainerMetrics(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT ts, metric_name, metric_value
    FROM e6_container_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    ORDER BY ts
  `
  logQuery('e6', 'getContainerMetrics', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get component metrics time series (CPU/memory by component over time)
 */
export function getComponentMetricsTimeSeries(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      component,
      SUM(CASE WHEN metric_name = 'e6data_container_cpu_usage_seconds_total' THEN metric_value ELSE 0 END) as cpu_usage,
      SUM(CASE WHEN metric_name = 'e6data_container_memory_usage_bytes' THEN metric_value ELSE 0 END) as memory_usage
    FROM e6_container_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      AND component != ''
    GROUP BY ts, component
    ORDER BY ts, component
  `
  logQuery('e6', 'getComponentMetricsTimeSeries', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get query metrics time series (active, queued, completed, failed queries over time)
 */
export function getQueryMetricsTimeSeries(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      metric_name,
      metric_value
    FROM e6_engine_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      AND metric_name IN (
        'io_e6x_E6Engine_NumActiveQueries',
        'io_e6x_E6Engine_NumQueuedQueries',
        'io_e6x_E6Engine_NumCompletedQueries',
        'io_e6x_E6Engine_NumFailedQueries'
      )
    ORDER BY ts
  `
  logQuery('e6', 'getQueryMetricsTimeSeries', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get aggregated CPU utilization time series for a cluster (all components combined)
 */
export function getClusterCpuTimeSeries(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      SUM(metric_value) as cpu_usage
    FROM e6_container_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      AND metric_name = 'e6data_container_cpu_usage_seconds_total'
    GROUP BY ts
    ORDER BY ts
  `
  logQuery('e6', 'getClusterCpuTimeSeries', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get aggregated memory utilization time series for a cluster (all components combined)
 */
export function getClusterMemoryTimeSeries(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      SUM(metric_value) / 1073741824 as memory_usage_gb
    FROM e6_container_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      AND metric_name = 'e6data_container_memory_usage_bytes'
    GROUP BY ts
    ORDER BY ts
  `
  logQuery('e6', 'getClusterMemoryTimeSeries', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get query count time series for a cluster (completed queries over time)
 */
export function getClusterQueryCountTimeSeries(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      ts,
      metric_value as query_count
    FROM e6_engine_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      AND metric_name = 'io_e6x_E6Engine_NumCompletedQueries'
    ORDER BY ts
  `
  logQuery('e6', 'getClusterQueryCountTimeSeries', { clusterName, startTs, endTs }, sql)
  return sql
}

/**
 * Get component summary (pod specs, nodes) for a cluster
 */
export function getComponentSummary(clusterName: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH latest_ts AS (
      SELECT MAX(ts) as max_ts
      FROM e6_container_metrics
      WHERE cluster_name = '${clusterName}'
        AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    )
    SELECT
      component,
      pod,
      node,
      metric_name,
      MAX(metric_value) as metric_value
    FROM e6_container_metrics
    WHERE cluster_name = '${clusterName}'
      AND ts >= (SELECT max_ts FROM latest_ts) - INTERVAL '10 minutes'
      AND ts <= (SELECT max_ts FROM latest_ts)
      AND component != ''
      AND metric_name IN (
        'e6data_container_spec_cpu_quota',
        'e6data_container_spec_cpu_period',
        'e6data_container_requests',
        'e6data_container_memory_usage_bytes',
        'e6data_container_restart_count'
      )
    GROUP BY component, pod, node, metric_name
    ORDER BY component
  `
  logQuery('e6', 'getComponentSummary', { clusterName, startTs, endTs }, sql)
  return sql
}
