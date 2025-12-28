import { logQuery } from "../logger.server"

interface DateRange {
  startTs: string
  endTs: string
}

export function getWorkspaceMetrics({ startTs, endTs }: DateRange): string {
  // Workaround: SUM(greptime_value) returns NULL in GreptimeDB 1.0.0-beta.2
  // Use COUNT * AVG per group instead
  const sql = `
    SELECT
      SUM(node_cost) as cost_today
    FROM (
      SELECT node, COUNT(*) * MAX(greptime_value) as node_cost
      FROM node_total_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    )
  `
  logQuery("workspaces", "getWorkspaceMetrics", { startTs, endTs }, sql)
  return sql
}

export function getCpuCost({ startTs, endTs }: DateRange): string {
  // Workaround for GreptimeDB SUM bug
  const sql = `
    SELECT SUM(node_cost) as cpu_cost
    FROM (
      SELECT node, COUNT(*) * MAX(greptime_value) as node_cost
      FROM node_cpu_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    )
  `
  logQuery("workspaces", "getCpuCost", { startTs, endTs }, sql)
  return sql
}

export function getRamCost({ startTs, endTs }: DateRange): string {
  // Workaround for GreptimeDB SUM bug
  const sql = `
    SELECT SUM(node_cost) as ram_cost
    FROM (
      SELECT node, COUNT(*) * MAX(greptime_value) as node_cost
      FROM node_ram_hourly_cost
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    )
  `
  logQuery("workspaces", "getRamCost", { startTs, endTs }, sql)
  return sql
}

export function getEgressCost({ startTs, endTs }: DateRange): string {
  // Egress is a global metric (no namespace breakdown available)
  const sql = `
    SELECT MAX(greptime_value) as egress_cost
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
      SUM(cpu_per_node) as cpu_allocated
    FROM (
      SELECT node, MAX(greptime_value) as cpu_per_node
      FROM kube_node_status_allocatable_cpu_cores
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    )
  `
  logQuery("workspaces", "getAllocation", { startTs, endTs }, sql)
  return sql
}

export function getMemAllocation({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      SUM(mem_per_node) / 1073741824 as mem_allocated_gb
    FROM (
      SELECT node, MAX(greptime_value) as mem_per_node
      FROM kube_node_status_allocatable_memory_bytes
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    )
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
  // Egress data has no namespace breakdown - return empty result
  // Cluster-level egress is not available from OpenCost
  const sql = `
    SELECT '' as cluster, 0 as egress_cost WHERE 1=0
  `
  logQuery("workspaces", "getClusterEgress", { startTs, endTs }, sql)
  return sql
}

// CPU Usage: get min/max cpu seconds and timestamps per pod
export function getCpuUsageRaw({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      SUM(min_cpu) as total_min_cpu,
      SUM(max_cpu) as total_max_cpu,
      MIN(min_ts) as min_ts,
      MAX(max_ts) as max_ts
    FROM (
      SELECT
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
      GROUP BY pod
    )
  `
  logQuery("workspaces", "getCpuUsageRaw", { startTs, endTs }, sql)
  return sql
}

// CPU Allocation: total allocated CPU cores
export function getCpuAllocatedTotal({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT SUM(allocated) as total_allocated
    FROM (
      SELECT pod, MAX(greptime_value) as allocated
      FROM container_cpu_allocation
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
        AND namespace IS NOT NULL
        AND namespace NOT IN ('kube-system', 'cloudcosts-agent', 'cloudcosts-cluster')
      GROUP BY pod
    )
  `
  logQuery("workspaces", "getCpuAllocatedTotal", { startTs, endTs }, sql)
  return sql
}

// Memory Total: sum of MemTotal across nodes
export function getMemTotal({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT SUM(total_bytes) as total_bytes
    FROM (
      SELECT node, MAX(greptime_value) as total_bytes
      FROM "node_memory_MemTotal_bytes"
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    )
  `
  logQuery("workspaces", "getMemTotal", { startTs, endTs }, sql)
  return sql
}

// Memory Available: sum of MemAvailable across nodes
export function getMemAvailable({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT SUM(avail_bytes) as avail_bytes
    FROM (
      SELECT node, MAX(greptime_value) as avail_bytes
      FROM "node_memory_MemAvailable_bytes"
      WHERE greptime_timestamp >= '${startTs}'
        AND greptime_timestamp < '${endTs}'
      GROUP BY node
    )
  `
  logQuery("workspaces", "getMemAvailable", { startTs, endTs }, sql)
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
