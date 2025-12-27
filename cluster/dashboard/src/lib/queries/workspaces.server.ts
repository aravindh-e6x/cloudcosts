import { logQuery } from "../logger.server"

interface DateRange {
  startTs: string
  endTs: string
}

export function getWorkspaceMetrics({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      SUM(greptime_value) as cost_today
    FROM node_total_hourly_cost
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
  `
  logQuery("workspaces", "getWorkspaceMetrics", { startTs, endTs }, sql)
  return sql
}

export function getCpuCost({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT SUM(greptime_value) as cpu_cost
    FROM node_cpu_hourly_cost
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
  `
  logQuery("workspaces", "getCpuCost", { startTs, endTs }, sql)
  return sql
}

export function getRamCost({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT SUM(greptime_value) as ram_cost
    FROM node_ram_hourly_cost
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
  `
  logQuery("workspaces", "getRamCost", { startTs, endTs }, sql)
  return sql
}

export function getEgressCost({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT SUM(greptime_value) as egress_cost
    FROM kubecost_network_internet_egress_cost
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
  `
  logQuery("workspaces", "getEgressCost", { startTs, endTs }, sql)
  return sql
}

export function getAllocation({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      MAX(greptime_value) as cpu_allocated
    FROM kube_node_status_allocatable_cpu_cores
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
  `
  logQuery("workspaces", "getAllocation", { startTs, endTs }, sql)
  return sql
}

export function getMemAllocation({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      MAX(greptime_value) / 1073741824 as mem_allocated_gb
    FROM kube_node_status_allocatable_memory_bytes
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
  `
  logQuery("workspaces", "getMemAllocation", { startTs, endTs }, sql)
  return sql
}

export function getNodeCount({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT node) as node_count
    FROM kube_node_status_allocatable_cpu_cores
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
  `
  logQuery("workspaces", "getNodeCount", { startTs, endTs }, sql)
  return sql
}

export function getPodCount({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT pod) as pod_count
    FROM container_cpu_allocation
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace != 'kube-system'
      AND namespace != 'cloudcosts-agent'
      AND namespace != 'cloudcosts-cluster'
  `
  logQuery("workspaces", "getPodCount", { startTs, endTs }, sql)
  return sql
}

export function getClusterMetrics({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace as cluster,
      AVG(greptime_value) as cpu_allocated
    FROM container_cpu_allocation
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace != 'kube-system'
      AND namespace != 'cloudcosts-agent'
      AND namespace != 'cloudcosts-cluster'
    GROUP BY namespace
    ORDER BY cpu_allocated DESC
  `
  logQuery("workspaces", "getClusterMetrics", { startTs, endTs }, sql)
  return sql
}

export function getClusterMemory({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace as cluster,
      AVG(greptime_value) / 1073741824 as mem_allocated_gb
    FROM container_memory_allocation_bytes
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace != 'kube-system'
      AND namespace != 'cloudcosts-agent'
      AND namespace != 'cloudcosts-cluster'
    GROUP BY namespace
    ORDER BY mem_allocated_gb DESC
  `
  logQuery("workspaces", "getClusterMemory", { startTs, endTs }, sql)
  return sql
}

export function getClusterEgress({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace as cluster,
      SUM(greptime_value) as egress_cost
    FROM kubecost_network_internet_egress_cost
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace != 'kube-system'
      AND namespace != 'cloudcosts-agent'
      AND namespace != 'cloudcosts-cluster'
    GROUP BY namespace
  `
  logQuery("workspaces", "getClusterEgress", { startTs, endTs }, sql)
  return sql
}

export function getComponentMetrics({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace,
      CASE
        WHEN pod LIKE 'executor-%' THEN 'executor'
        WHEN pod LIKE 'planner-%' THEN 'planner'
        WHEN pod LIKE 'queue-%' THEN 'queue'
        ELSE 'other'
      END as component,
      COUNT(DISTINCT pod) as pod_count,
      AVG(greptime_value) as cpu_allocated
    FROM container_cpu_allocation
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace != 'kube-system'
      AND namespace != 'cloudcosts-agent'
      AND namespace != 'cloudcosts-cluster'
    GROUP BY namespace, component
    ORDER BY namespace, component
  `
  logQuery("workspaces", "getComponentMetrics", { startTs, endTs }, sql)
  return sql
}

export function getComponentMemory({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      namespace,
      CASE
        WHEN pod LIKE 'executor-%' THEN 'executor'
        WHEN pod LIKE 'planner-%' THEN 'planner'
        WHEN pod LIKE 'queue-%' THEN 'queue'
        ELSE 'other'
      END as component,
      COUNT(DISTINCT pod) as pod_count,
      AVG(greptime_value) / 1073741824 as mem_allocated_gb
    FROM container_memory_allocation_bytes
    WHERE greptime_timestamp >= '${startTs}'
      AND greptime_timestamp < '${endTs}'
      AND namespace IS NOT NULL
      AND namespace != 'kube-system'
      AND namespace != 'cloudcosts-agent'
      AND namespace != 'cloudcosts-cluster'
    GROUP BY namespace, component
    ORDER BY namespace, component
  `
  logQuery("workspaces", "getComponentMemory", { startTs, endTs }, sql)
  return sql
}
