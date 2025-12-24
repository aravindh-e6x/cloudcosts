// SQL Queries for GreptimeDB

export const kubernetesQueries = {
  clusters: `
    SELECT DISTINCT cluster
    FROM kube_node_info
    WHERE greptime_timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY cluster
  `,

  namespaces: (cluster: string) => `
    SELECT DISTINCT namespace
    FROM kube_pod_info
    WHERE cluster = '${cluster}'
      AND greptime_timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY namespace
  `,

  pods: (cluster: string, namespace?: string) => `
    WITH latest_pods AS (
      SELECT pod, namespace, node, created_by_kind, created_by_name, MAX(greptime_timestamp) as ts
      FROM kube_pod_info
      WHERE cluster = '${cluster}'
        ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY pod, namespace, node, created_by_kind, created_by_name
    ),
    cpu_alloc AS (
      SELECT pod, namespace, SUM(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY pod, namespace
    ),
    mem_alloc AS (
      SELECT pod, namespace, SUM(greptime_value) as memory_allocated
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY pod, namespace
    ),
    cpu_usage AS (
      SELECT pod, namespace, SUM(greptime_value) as cpu_used
      FROM container_cpu_usage_seconds_total
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY pod, namespace
    ),
    mem_usage AS (
      SELECT pod, namespace, SUM(greptime_value) as memory_used
      FROM container_memory_working_set_bytes
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
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
  `,

  nodes: (cluster: string) => `
    WITH latest_nodes AS (
      SELECT node, instance_type, region, MAX(greptime_timestamp) as ts, MAX(greptime_value) as hourly_cost
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY node, instance_type, region
    ),
    node_capacity AS (
      SELECT node,
        MAX(CASE WHEN resource = 'cpu' THEN greptime_value END) as cpu_capacity,
        MAX(CASE WHEN resource = 'memory' THEN greptime_value END) as mem_capacity
      FROM kube_node_status_capacity
      WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    ),
    node_mem AS (
      SELECT node, MAX(greptime_value) as mem_total
      FROM node_memory_MemTotal_bytes
      WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    ),
    node_mem_avail AS (
      SELECT node, MAX(greptime_value) as mem_available
      FROM node_memory_MemAvailable_bytes
      WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    ),
    pod_count AS (
      SELECT node, COUNT(DISTINCT pod) as pods
      FROM kube_pod_info
      WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    )
    SELECT
      n.node as name, n.instance_type, n.region, n.hourly_cost as cost_hourly,
      COALESCE(nc.cpu_capacity, 0) as cpu_capacity,
      COALESCE(nm.mem_total, 0) as mem_capacity,
      COALESCE(nm.mem_total - nma.mem_available, 0) as mem_used,
      COALESCE(pc.pods, 0) as pods
    FROM latest_nodes n
    LEFT JOIN node_capacity nc ON n.node = nc.node
    LEFT JOIN node_mem nm ON n.node = nm.node
    LEFT JOIN node_mem_avail nma ON n.node = nma.node
    LEFT JOIN pod_count pc ON n.node = pc.node
    ORDER BY n.node
  `,

  podCpuTimeSeries: (cluster: string, namespace?: string, interval = '5 minutes') => `
    SELECT DATE_TRUNC('minute', greptime_timestamp) as time, pod, AVG(greptime_value) as cpu_usage
    FROM container_cpu_usage_seconds_total
    WHERE cluster = '${cluster}'
      ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
      AND greptime_timestamp > NOW() - INTERVAL '${interval}'
    GROUP BY DATE_TRUNC('minute', greptime_timestamp), pod
    ORDER BY time
  `,

  podMemoryTimeSeries: (cluster: string, namespace?: string, interval = '5 minutes') => `
    SELECT DATE_TRUNC('minute', greptime_timestamp) as time, pod, AVG(greptime_value) as memory_usage
    FROM container_memory_working_set_bytes
    WHERE cluster = '${cluster}'
      ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
      AND greptime_timestamp > NOW() - INTERVAL '${interval}'
    GROUP BY DATE_TRUNC('minute', greptime_timestamp), pod
    ORDER BY time
  `,

  nodeCpuTimeSeries: (cluster: string, interval = '1 hour') => `
    SELECT DATE_TRUNC('minute', greptime_timestamp) as time, node, AVG(greptime_value) as cpu_seconds
    FROM node_cpu_seconds_total
    WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '${interval}'
    GROUP BY DATE_TRUNC('minute', greptime_timestamp), node
    ORDER BY time
  `,

  costByNamespace: (cluster: string) => `
    WITH namespace_cpu AS (
      SELECT namespace, SUM(greptime_value) as total_cpu
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY namespace
    ),
    namespace_mem AS (
      SELECT namespace, SUM(greptime_value) as total_mem
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY namespace
    )
    SELECT nc.namespace, nc.total_cpu, nm.total_mem,
      (nc.total_cpu * 0.03 + nm.total_mem / 1073741824 * 0.004) as estimated_cost_hourly
    FROM namespace_cpu nc
    LEFT JOIN namespace_mem nm ON nc.namespace = nm.namespace
    ORDER BY estimated_cost_hourly DESC
  `,

  clusterSummary: (cluster: string) => `
    SELECT
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as pod_count,
      (SELECT COUNT(DISTINCT node) FROM kube_node_info WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as node_count,
      (SELECT SUM(greptime_value) FROM container_cpu_allocation WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as total_cpu_alloc,
      (SELECT SUM(greptime_value) FROM container_memory_allocation_bytes WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as total_mem_alloc,
      (SELECT SUM(greptime_value) FROM node_total_hourly_cost WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '1 hour') as cluster_hourly_cost
  `,
}

export const overviewQueries = {
  executiveSummary: (date: string) => `
    SELECT
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as this_week,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) - INTERVAL '7 days' AND greptime_timestamp < DATE_TRUNC('week', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as last_week,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '28 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '21 days' THEN greptime_value ELSE 0 END) as same_week_last_month,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' + ('${date}'::timestamp - DATE_TRUNC('month', '${date}'::timestamp)) + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as same_period_last_month
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '2 months' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
  `,

  costByProviderFull: (date: string) => `
    SELECT provider,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as cost,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '6 days' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as last_7d,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '13 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '6 days' THEN greptime_value ELSE 0 END) as prev_7d,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as prev_mtd
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
    GROUP BY provider
    ORDER BY cost DESC
  `,

  topServicesFull: (date: string) => `
    SELECT service,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as cost,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '6 days' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as last_7d,
      SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '13 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '6 days' THEN greptime_value ELSE 0 END) as prev_7d,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
      SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as prev_mtd
    FROM vantage_daily_cost_by_service
    WHERE greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
    GROUP BY service
    ORDER BY cost DESC
    LIMIT 10
  `,

  dailyCostTrendByDate: (date: string) => `
    SELECT DATE_TRUNC('day', greptime_timestamp) as date, SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp >= '${date}'::timestamp - INTERVAL '29 days' AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day'
    GROUP BY DATE_TRUNC('day', greptime_timestamp)
    ORDER BY date
  `,

  // SQL snippets for InfoPopover display
  todayVsYesterdaySql: (date: string) => `SELECT
  SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as today,
  SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '1 day' AND greptime_timestamp < '${date}'::timestamp THEN greptime_value ELSE 0 END) as yesterday
FROM vantage_daily_cost_by_provider`,

  thisWeekVsLastWeekSql: (date: string) => `SELECT
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as this_week,
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) - INTERVAL '7 days' AND greptime_timestamp < DATE_TRUNC('week', '${date}'::timestamp) THEN greptime_value ELSE 0 END) as last_week
FROM vantage_daily_cost_by_provider`,

  thisWeekVsSameWeekLastMonthSql: (date: string) => `SELECT
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('week', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as this_week,
  SUM(CASE WHEN greptime_timestamp >= '${date}'::timestamp - INTERVAL '28 days' AND greptime_timestamp < '${date}'::timestamp - INTERVAL '21 days' THEN greptime_value ELSE 0 END) as same_week_last_month
FROM vantage_daily_cost_by_provider`,

  mtdVsSamePeriodLastMonthSql: (date: string) => `SELECT
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) AND greptime_timestamp < '${date}'::timestamp + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as mtd,
  SUM(CASE WHEN greptime_timestamp >= DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' AND greptime_timestamp < DATE_TRUNC('month', '${date}'::timestamp) - INTERVAL '1 month' + ('${date}'::timestamp - DATE_TRUNC('month', '${date}'::timestamp)) + INTERVAL '1 day' THEN greptime_value ELSE 0 END) as same_period_last_month
FROM vantage_daily_cost_by_provider`,
}
