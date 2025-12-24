// SQL Queries for GreptimeDB

export const kubernetesQueries = {
  clusters: `
    SELECT DISTINCT cluster
    FROM kube_node_info
    WHERE greptime_timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY cluster
  `,

  namespaces: (cluster: string, startTs: string, endTs: string) => `
    SELECT DISTINCT namespace
    FROM kube_pod_info
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    ORDER BY namespace
  `,

  pods: (cluster: string, startTs: string, endTs: string, namespace?: string) => `
    WITH latest_pods AS (
      SELECT pod, namespace, node, created_by_kind, created_by_name, MAX(greptime_timestamp) as ts
      FROM kube_pod_info
      WHERE cluster = '${cluster}'
        ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace, node, created_by_kind, created_by_name
    ),
    cpu_alloc AS (
      SELECT pod, namespace, SUM(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace
    ),
    mem_alloc AS (
      SELECT pod, namespace, SUM(greptime_value) as memory_allocated
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace
    ),
    cpu_usage AS (
      SELECT pod, namespace, SUM(greptime_value) as cpu_used
      FROM container_cpu_usage_seconds_total
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY pod, namespace
    ),
    mem_usage AS (
      SELECT pod, namespace, SUM(greptime_value) as memory_used
      FROM container_memory_working_set_bytes
      WHERE cluster = '${cluster}' ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
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
  `,

  // Returns nodes with total cost for the date
  nodes: (cluster: string, startTs: string, endTs: string) => `
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
  `,

  podCpuTimeSeries: (cluster: string, startTs: string, endTs: string, namespace?: string) => `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time, pod, AVG(greptime_value) as cpu_usage
    FROM container_cpu_usage_seconds_total
    WHERE cluster = '${cluster}'
      ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY DATE_TRUNC('hour', greptime_timestamp), pod
    ORDER BY time
  `,

  podMemoryTimeSeries: (cluster: string, startTs: string, endTs: string, namespace?: string) => `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time, pod, AVG(greptime_value) as memory_usage
    FROM container_memory_working_set_bytes
    WHERE cluster = '${cluster}'
      ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY DATE_TRUNC('hour', greptime_timestamp), pod
    ORDER BY time
  `,

  nodeCpuTimeSeries: (cluster: string, startTs: string, endTs: string) => `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time, node, AVG(greptime_value) as cpu_seconds
    FROM node_cpu_seconds_total
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY DATE_TRUNC('hour', greptime_timestamp), node
    ORDER BY time
  `,

  // Returns total estimated cost for the date by namespace
  costByNamespace: (cluster: string, startTs: string, endTs: string) => `
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
  `,

  // Returns total cost for the date
  clusterSummary: (cluster: string, startTs: string, endTs: string) => `
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
    )
    SELECT
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as pod_count,
      (SELECT COUNT(DISTINCT node) FROM kube_node_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as node_count,
      (SELECT SUM(greptime_value) FROM container_cpu_allocation WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_cpu_alloc,
      (SELECT SUM(greptime_value) FROM container_memory_allocation_bytes WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_mem_alloc,
      (SELECT SUM(avg_hourly_rate) * (SELECT hours FROM hours_in_range) FROM node_hourly_rates) as total_cost
  `,

  // CPU usage by namespace over time (for stacked area chart)
  cpuByNamespaceTimeSeries: (cluster: string, startTs: string, endTs: string) => `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
           namespace,
           SUM(greptime_value) as cpu_usage
    FROM container_cpu_usage_seconds_total
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1, 2
    ORDER BY time
  `,

  // Memory usage by namespace over time (for stacked area chart)
  memoryByNamespaceTimeSeries: (cluster: string, startTs: string, endTs: string) => `
    SELECT DATE_TRUNC('hour', greptime_timestamp) as time,
           namespace,
           SUM(greptime_value) / (1024 * 1024) as memory_mb
    FROM container_memory_working_set_bytes
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY 1, 2
    ORDER BY time
  `,

  // Node capacity type breakdown (spot vs on-demand) with total cost for the date
  nodeCapacityTypes: (cluster: string, startTs: string, endTs: string) => `
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
  `,

  // Resource efficiency by namespace (requests vs actual usage)
  namespaceEfficiency: (cluster: string, startTs: string, endTs: string) => `
    WITH requests AS (
      SELECT namespace, SUM(greptime_value) as cpu_requested
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        AND greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY namespace
    ),
    usage AS (
      SELECT namespace, SUM(greptime_value) as cpu_used
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
  `,

  // Pod allocatable capacity per node
  nodeAllocatable: (cluster: string, startTs: string, endTs: string) => `
    SELECT node,
      MAX(CASE WHEN resource = 'pods' THEN greptime_value END) as allocatable_pods
    FROM kube_node_status_allocatable
    WHERE cluster = '${cluster}'
      AND greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
    GROUP BY node
  `,

  // Summary for all clusters (for cluster list page) - simplified query
  allClustersSummary: (startTs: string, endTs: string) => `
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
  `,

  // Get individual cluster stats (called per cluster)
  // Returns total cost for the date by averaging hourly rates per node and multiplying by hours
  clusterStats: (cluster: string, startTs: string, endTs: string) => `
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
    )
    SELECT
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as pod_count,
      (SELECT COUNT(DISTINCT namespace) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as namespace_count,
      (SELECT SUM(avg_hourly_rate) * (SELECT hours FROM hours_in_range) FROM node_hourly_rates) as total_cost,
      (SELECT SUM(greptime_value) FROM container_cpu_allocation WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as cpu_allocated,
      (SELECT SUM(greptime_value) FROM container_memory_allocation_bytes WHERE cluster = '${cluster}' AND greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as memory_allocated
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
