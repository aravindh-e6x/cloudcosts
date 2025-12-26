// E6 Metrics Queries
// All queries take startTs and endTs as parameters for date filtering

import { logQuery } from '../logger.server'

interface DateRange {
  startTs: string
  endTs: string
}

/**
 * Get all E6 databases (schemas starting with e6_)
 */
export function getAllDatabases(): string {
  const sql = `SELECT schema_name FROM schemata ORDER BY schema_name`
  logQuery('e6', 'getAllDatabases', {}, sql)
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
