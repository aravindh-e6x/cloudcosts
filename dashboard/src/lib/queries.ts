// SQL Queries for GreptimeDB

export const kubernetesQueries = {
  // Get list of clusters
  clusters: `
    SELECT DISTINCT cluster
    FROM kube_node_info
    WHERE greptime_timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY cluster
  `,

  // Get list of namespaces for a cluster
  namespaces: (cluster: string) => `
    SELECT DISTINCT namespace
    FROM kube_pod_info
    WHERE cluster = '${cluster}'
      AND greptime_timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY namespace
  `,

  // Get pod list with latest metrics
  pods: (cluster: string, namespace?: string) => `
    WITH latest_pods AS (
      SELECT
        pod,
        namespace,
        node,
        created_by_kind,
        created_by_name,
        MAX(greptime_timestamp) as ts
      FROM kube_pod_info
      WHERE cluster = '${cluster}'
        ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY pod, namespace, node, created_by_kind, created_by_name
    ),
    cpu_alloc AS (
      SELECT pod, namespace, SUM(greptime_value) as cpu_allocated
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY pod, namespace
    ),
    mem_alloc AS (
      SELECT pod, namespace, SUM(greptime_value) as memory_allocated
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}'
        ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY pod, namespace
    ),
    cpu_usage AS (
      SELECT pod, namespace, SUM(greptime_value) as cpu_used
      FROM container_cpu_usage_seconds_total
      WHERE cluster = '${cluster}'
        ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY pod, namespace
    ),
    mem_usage AS (
      SELECT pod, namespace, SUM(greptime_value) as memory_used
      FROM container_memory_working_set_bytes
      WHERE cluster = '${cluster}'
        ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY pod, namespace
    )
    SELECT
      p.pod as name,
      p.namespace,
      p.node,
      p.created_by_kind,
      p.created_by_name,
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

  // Get node list with metrics
  nodes: (cluster: string) => `
    WITH latest_nodes AS (
      SELECT
        node,
        instance_type,
        region,
        MAX(greptime_timestamp) as ts,
        MAX(greptime_value) as hourly_cost
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY node, instance_type, region
    ),
    node_capacity AS (
      SELECT
        node,
        MAX(CASE WHEN resource = 'cpu' THEN greptime_value END) as cpu_capacity,
        MAX(CASE WHEN resource = 'memory' THEN greptime_value END) as mem_capacity
      FROM kube_node_status_capacity
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    ),
    node_mem AS (
      SELECT
        node,
        MAX(greptime_value) as mem_total
      FROM node_memory_MemTotal_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    ),
    node_mem_avail AS (
      SELECT
        node,
        MAX(greptime_value) as mem_available
      FROM node_memory_MemAvailable_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    ),
    pod_count AS (
      SELECT
        node,
        COUNT(DISTINCT pod) as pods
      FROM kube_pod_info
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY node
    )
    SELECT
      n.node as name,
      n.instance_type,
      n.region,
      n.hourly_cost as cost_hourly,
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

  // Pod CPU time series
  podCpuTimeSeries: (cluster: string, namespace?: string, interval: string = '5 minutes') => `
    SELECT
      DATE_TRUNC('minute', greptime_timestamp) as time,
      pod,
      AVG(greptime_value) as cpu_usage
    FROM container_cpu_usage_seconds_total
    WHERE cluster = '${cluster}'
      ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
      AND greptime_timestamp > NOW() - INTERVAL '${interval}'
    GROUP BY DATE_TRUNC('minute', greptime_timestamp), pod
    ORDER BY time
  `,

  // Pod Memory time series
  podMemoryTimeSeries: (cluster: string, namespace?: string, interval: string = '5 minutes') => `
    SELECT
      DATE_TRUNC('minute', greptime_timestamp) as time,
      pod,
      AVG(greptime_value) as memory_usage
    FROM container_memory_working_set_bytes
    WHERE cluster = '${cluster}'
      ${namespace && namespace !== 'all' ? `AND namespace = '${namespace}'` : ''}
      AND greptime_timestamp > NOW() - INTERVAL '${interval}'
    GROUP BY DATE_TRUNC('minute', greptime_timestamp), pod
    ORDER BY time
  `,

  // Node CPU time series
  nodeCpuTimeSeries: (cluster: string, interval: string = '1 hour') => `
    SELECT
      DATE_TRUNC('minute', greptime_timestamp) as time,
      node,
      AVG(greptime_value) as cpu_seconds
    FROM node_cpu_seconds_total
    WHERE cluster = '${cluster}'
      AND greptime_timestamp > NOW() - INTERVAL '${interval}'
    GROUP BY DATE_TRUNC('minute', greptime_timestamp), node
    ORDER BY time
  `,

  // Cost by namespace
  costByNamespace: (cluster: string) => `
    WITH namespace_cpu AS (
      SELECT
        namespace,
        SUM(greptime_value) as total_cpu
      FROM container_cpu_allocation
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY namespace
    ),
    namespace_mem AS (
      SELECT
        namespace,
        SUM(greptime_value) as total_mem
      FROM container_memory_allocation_bytes
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '5 minutes'
      GROUP BY namespace
    ),
    node_costs AS (
      SELECT
        AVG(greptime_value) as avg_hourly_cost
      FROM node_total_hourly_cost
      WHERE cluster = '${cluster}'
        AND greptime_timestamp > NOW() - INTERVAL '1 hour'
    )
    SELECT
      nc.namespace,
      nc.total_cpu,
      nm.total_mem,
      (nc.total_cpu * 0.03 + nm.total_mem / 1073741824 * 0.004) as estimated_cost_hourly
    FROM namespace_cpu nc
    LEFT JOIN namespace_mem nm ON nc.namespace = nm.namespace
    ORDER BY estimated_cost_hourly DESC
  `,

  // KPI summary
  clusterSummary: (cluster: string) => `
    SELECT
      (SELECT COUNT(DISTINCT pod) FROM kube_pod_info WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as pod_count,
      (SELECT COUNT(DISTINCT node) FROM kube_node_info WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as node_count,
      (SELECT SUM(greptime_value) FROM container_cpu_allocation WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as total_cpu_alloc,
      (SELECT SUM(greptime_value) FROM container_memory_allocation_bytes WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '5 minutes') as total_mem_alloc,
      (SELECT SUM(greptime_value) FROM node_total_hourly_cost WHERE cluster = '${cluster}' AND greptime_timestamp > NOW() - INTERVAL '1 hour') as cluster_hourly_cost
  `,
}

export const vantageQueries = {
  // Daily cost by provider for last 30 days
  dailyCostByProvider: `
    SELECT
      DATE_TRUNC('day', greptime_timestamp) as date,
      provider,
      SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', greptime_timestamp), provider
    ORDER BY date
  `,

  // Cost by account
  costByAccount: `
    SELECT
      account_id,
      account_name,
      provider,
      SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_account
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY account_id, account_name, provider
    ORDER BY cost DESC
  `,

  // Cost by service
  costByService: `
    SELECT
      service,
      provider,
      SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_service
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY service, provider
    ORDER BY cost DESC
    LIMIT 20
  `,

  // Daily cost trend
  dailyCostTrend: `
    SELECT
      DATE_TRUNC('day', greptime_timestamp) as date,
      SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', greptime_timestamp)
    ORDER BY date
  `,

  // Total cost summary
  costSummary: `
    SELECT
      SUM(greptime_value) as total_cost,
      COUNT(DISTINCT provider) as provider_count,
      COUNT(DISTINCT account_id) as account_count
    FROM vantage_daily_cost_by_account
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
  `,
}

export const overviewQueries = {
  // Total cloud spend from Vantage
  totalCloudSpend: `
    SELECT SUM(greptime_value) as total_cost
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
  `,

  // Active K8s clusters
  activeClusters: `
    SELECT COUNT(DISTINCT cluster) as cluster_count
    FROM kube_node_info
    WHERE greptime_timestamp > NOW() - INTERVAL '1 hour'
  `,

  // Total nodes across all clusters
  totalNodes: `
    SELECT COUNT(DISTINCT node) as node_count
    FROM kube_node_info
    WHERE greptime_timestamp > NOW() - INTERVAL '1 hour'
  `,

  // Total pods across all clusters
  totalPods: `
    SELECT COUNT(DISTINCT pod) as pod_count
    FROM kube_pod_info
    WHERE greptime_timestamp > NOW() - INTERVAL '1 hour'
  `,

  // Cost by account for overview table
  costByAccount: `
    SELECT
      account_id,
      provider,
      SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_account
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY account_id, provider
    ORDER BY cost DESC
  `,

  // Daily cost trend for chart
  dailyCostTrend: `
    SELECT
      DATE_TRUNC('day', greptime_timestamp) as date,
      SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_provider
    WHERE greptime_timestamp > NOW() - INTERVAL '14 days'
    GROUP BY DATE_TRUNC('day', greptime_timestamp)
    ORDER BY date
  `,

  // Top services
  topServices: `
    SELECT
      service,
      SUM(greptime_value) as cost
    FROM vantage_daily_cost_by_service
    WHERE greptime_timestamp > NOW() - INTERVAL '30 days'
      AND provider = 'aws'
    GROUP BY service
    ORDER BY cost DESC
    LIMIT 5
  `,
}
