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
 * Get node packing (CPU utilization) per node for selected day
 * Packing % = allocated CPU / allocatable CPU
 */
export function getNodePacking(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH latest AS (
      SELECT MAX(ts) as max_ts
      FROM kube_node_info
      WHERE eks_cluster = '${eksCluster}'
        AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    ),
    node_allocatable AS (
      SELECT node, metric_value as allocatable_cpu
      FROM kube_node_status_allocatable
      WHERE eks_cluster = '${eksCluster}'
        AND resource_type = 'cpu'
        AND ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND ts <= (SELECT max_ts FROM latest)
    ),
    container_allocated AS (
      SELECT node, SUM(metric_value) as allocated_cpu
      FROM container_cpu_allocation
      WHERE eks_cluster = '${eksCluster}'
        AND ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND ts <= (SELECT max_ts FROM latest)
      GROUP BY node
    )
    SELECT
      a.node,
      a.allocatable_cpu,
      COALESCE(c.allocated_cpu, 0) as allocated_cpu,
      CASE WHEN a.allocatable_cpu > 0
        THEN ROUND(COALESCE(c.allocated_cpu, 0) / a.allocatable_cpu * 100, 1)
        ELSE 0
      END as packing_pct
    FROM node_allocatable a
    LEFT JOIN container_allocated c ON a.node = c.node
    ORDER BY packing_pct DESC
  `
  logQuery('e6', 'getNodePacking', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get average node packing for the day
 */
export function getNodePackingAvg(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH hourly_packing AS (
      SELECT
        date_trunc('hour', a.ts) as hour,
        AVG(CASE WHEN a.metric_value > 0
          THEN c.allocated / a.metric_value * 100
          ELSE 0
        END) as avg_packing
      FROM kube_node_status_allocatable a
      JOIN (
        SELECT ts, node, SUM(metric_value) as allocated
        FROM container_cpu_allocation
        WHERE eks_cluster = '${eksCluster}'
          AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
        GROUP BY ts, node
      ) c ON a.node = c.node AND a.ts = c.ts
      WHERE a.eks_cluster = '${eksCluster}'
        AND a.resource_type = 'cpu'
        AND a.ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      GROUP BY date_trunc('hour', a.ts)
    )
    SELECT ROUND(AVG(avg_packing), 1) as avg_packing_pct
    FROM hourly_packing
  `
  logQuery('e6', 'getNodePackingAvg', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get node packing time series for a specific node
 */
export function getNodePackingTimeSeries(eksCluster: string, node: string, { startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      a.ts,
      CASE WHEN a.metric_value > 0
        THEN ROUND(COALESCE(c.allocated, 0) / a.metric_value * 100, 1)
        ELSE 0
      END as packing_pct
    FROM kube_node_status_allocatable a
    LEFT JOIN (
      SELECT ts, node, SUM(metric_value) as allocated
      FROM container_cpu_allocation
      WHERE eks_cluster = '${eksCluster}'
        AND node = '${node}'
        AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
      GROUP BY ts, node
    ) c ON a.ts = c.ts
    WHERE a.eks_cluster = '${eksCluster}'
      AND a.node = '${node}'
      AND a.resource_type = 'cpu'
      AND a.ts >= '${startTs}'::timestamp AND a.ts < '${endTs}'::timestamp
    ORDER BY a.ts
  `
  logQuery('e6', 'getNodePackingTimeSeries', { eksCluster, node, startTs, endTs }, sql)
  return sql
}

/**
 * Get right-sizing data (CPU/Memory requested vs actual by component)
 */
export function getRightSizing(eksCluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH latest AS (
      SELECT MAX(ts) as max_ts
      FROM container_cpu_allocation
      WHERE eks_cluster = '${eksCluster}'
        AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    ),
    requests AS (
      SELECT
        l.label_component as component,
        SUM(r.metric_value) as cpu_requested,
        SUM(m.metric_value) as memory_requested
      FROM kube_pod_labels l
      JOIN kube_pod_container_resource_requests r
        ON l.eks_cluster = r.eks_cluster AND l.pod = r.pod
        AND r.resource_type = 'cpu'
        AND r.ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND r.ts <= (SELECT max_ts FROM latest)
      JOIN kube_pod_container_resource_requests m
        ON l.eks_cluster = m.eks_cluster AND l.pod = m.pod
        AND m.resource_type = 'memory'
        AND m.ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND m.ts <= (SELECT max_ts FROM latest)
      WHERE l.eks_cluster = '${eksCluster}'
        AND l.ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND l.ts <= (SELECT max_ts FROM latest)
      GROUP BY l.label_component
    ),
    usage AS (
      SELECT
        l.label_component as component,
        SUM(c.metric_value) / 300 as cpu_actual,
        SUM(mem.metric_value) as memory_actual
      FROM kube_pod_labels l
      JOIN container_cpu_usage_seconds_total c
        ON l.eks_cluster = c.eks_cluster AND l.pod = c.pod
        AND c.ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND c.ts <= (SELECT max_ts FROM latest)
      JOIN container_memory_working_set_bytes mem
        ON l.eks_cluster = mem.eks_cluster AND l.pod = mem.pod
        AND mem.ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND mem.ts <= (SELECT max_ts FROM latest)
      WHERE l.eks_cluster = '${eksCluster}'
        AND l.ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
        AND l.ts <= (SELECT max_ts FROM latest)
      GROUP BY l.label_component
    )
    SELECT
      r.component,
      r.cpu_requested,
      COALESCE(u.cpu_actual, 0) as cpu_actual,
      CASE WHEN r.cpu_requested > 0
        THEN ROUND(COALESCE(u.cpu_actual, 0) / r.cpu_requested * 100, 1)
        ELSE 0
      END as cpu_util_pct,
      r.memory_requested,
      COALESCE(u.memory_actual, 0) as memory_actual,
      CASE WHEN r.memory_requested > 0
        THEN ROUND(COALESCE(u.memory_actual, 0) / r.memory_requested * 100, 1)
        ELSE 0
      END as memory_util_pct
    FROM requests r
    LEFT JOIN usage u ON r.component = u.component
    ORDER BY r.component
  `
  logQuery('e6', 'getRightSizing', { eksCluster, startTs, endTs }, sql)
  return sql
}

/**
 * Get E6 cluster activity (queries per hour, executor count, idle status)
 */
export function getE6ClusterActivity(eksCluster: string, e6Cluster: string, { startTs, endTs }: DateRange): string {
  const sql = `
    WITH latest AS (
      SELECT MAX(ts) as max_ts
      FROM io_e6x_E6Gateway_TotalQueriesCompletedCount
      WHERE e6_workspace = '${eksCluster.replace('-prod-eks', '').replace('-eks', '')}'
        AND e6_cluster = '${e6Cluster}'
        AND ts >= '${startTs}'::timestamp AND ts < '${endTs}'::timestamp
    )
    SELECT
      '${e6Cluster}' as e6_cluster,
      COALESCE(q.metric_value, 0) as queries_per_hour,
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_labels
       WHERE eks_cluster = '${eksCluster}'
         AND namespace = '${e6Cluster}'
         AND label_component = 'executor'
         AND ts >= (SELECT max_ts FROM latest) - INTERVAL '10 minutes'
         AND ts <= (SELECT max_ts FROM latest)) as executor_count
    FROM io_e6x_E6Gateway_TotalQueriesCompletedCount q
    WHERE q.e6_workspace = '${eksCluster.replace('-prod-eks', '').replace('-eks', '')}'
      AND q.e6_cluster = '${e6Cluster}'
      AND q.ts = (SELECT max_ts FROM latest)
  `
  logQuery('e6', 'getE6ClusterActivity', { eksCluster, e6Cluster, startTs, endTs }, sql)
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
