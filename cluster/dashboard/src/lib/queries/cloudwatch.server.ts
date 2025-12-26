// CloudWatch Metrics Queries
// Data is stored in separate tables per metric (e.g., cloudwatch_ec2_CPUUtilization)
// All queries take startTs and endTs as parameters for date filtering

import { logQuery } from '../logger.server'

interface DateRange {
  startTs: string
  endTs: string
}

// ==================== EC2 QUERIES ====================

/**
 * Get all EC2 instances with latest metrics
 */
export function getEC2Instances({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH cpu AS (
      SELECT instance_id, instance_type, region, account_id, availability_zone,
             AVG(greptime_value) as avg_cpu, MAX(greptime_value) as max_cpu
      FROM "cloudwatch_ec2_CPUUtilization"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY instance_id, instance_type, region, account_id, availability_zone
    ),
    net_in AS (
      SELECT instance_id, SUM(greptime_value) as total_network_in
      FROM "cloudwatch_ec2_NetworkIn"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY instance_id
    ),
    net_out AS (
      SELECT instance_id, SUM(greptime_value) as total_network_out
      FROM "cloudwatch_ec2_NetworkOut"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY instance_id
    ),
    disk_read AS (
      SELECT instance_id, SUM(greptime_value) as total_disk_read
      FROM "cloudwatch_ec2_DiskReadBytes"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY instance_id
    ),
    disk_write AS (
      SELECT instance_id, SUM(greptime_value) as total_disk_write
      FROM "cloudwatch_ec2_DiskWriteBytes"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY instance_id
    ),
    status AS (
      SELECT instance_id, MAX(greptime_value) as status_check_failed
      FROM "cloudwatch_ec2_StatusCheckFailed"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY instance_id
    )
    SELECT
      c.instance_id, c.instance_type, c.instance_id as instance_name,
      c.region, c.account_id, c.availability_zone,
      c.avg_cpu, c.max_cpu,
      COALESCE(ni.total_network_in, 0) as total_network_in,
      COALESCE(no.total_network_out, 0) as total_network_out,
      COALESCE(dr.total_disk_read, 0) as total_disk_read,
      COALESCE(dw.total_disk_write, 0) as total_disk_write,
      COALESCE(s.status_check_failed, 0) as status_check_failed
    FROM cpu c
    LEFT JOIN net_in ni ON c.instance_id = ni.instance_id
    LEFT JOIN net_out no ON c.instance_id = no.instance_id
    LEFT JOIN disk_read dr ON c.instance_id = dr.instance_id
    LEFT JOIN disk_write dw ON c.instance_id = dw.instance_id
    LEFT JOIN status s ON c.instance_id = s.instance_id
    ORDER BY c.avg_cpu DESC
  `
  logQuery('cloudwatch', 'getEC2Instances', { startTs, endTs }, sql)
  return sql
}

/**
 * Get EC2 summary stats
 */
export function getEC2Summary({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT instance_id) as total_instances,
      AVG(greptime_value) as avg_cpu,
      (SELECT SUM(greptime_value) FROM "cloudwatch_ec2_NetworkIn"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_network_in,
      (SELECT SUM(greptime_value) FROM "cloudwatch_ec2_NetworkOut"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_network_out
    FROM "cloudwatch_ec2_CPUUtilization"
    WHERE greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
  `
  logQuery('cloudwatch', 'getEC2Summary', { startTs, endTs }, sql)
  return sql
}

// ==================== EKS QUERIES ====================

/**
 * Get all EKS clusters
 */
export function getEKSClusters({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH nodes AS (
      SELECT cluster_name, region, account_id, AVG(greptime_value) as avg_node_count
      FROM "cloudwatch_eks_cluster_node_count"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY cluster_name, region, account_id
    ),
    failed AS (
      SELECT cluster_name, MAX(greptime_value) as max_failed_nodes
      FROM "cloudwatch_eks_cluster_failed_node_count"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY cluster_name
    ),
    node_cpu AS (
      SELECT cluster_name, AVG(greptime_value) as avg_node_cpu
      FROM "cloudwatch_eks_node_cpu_utilization"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY cluster_name
    ),
    node_mem AS (
      SELECT cluster_name, AVG(greptime_value) as avg_node_memory
      FROM "cloudwatch_eks_node_memory_utilization"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY cluster_name
    )
    SELECT
      n.cluster_name, n.region, n.account_id, n.avg_node_count,
      COALESCE(f.max_failed_nodes, 0) as max_failed_nodes,
      COALESCE(nc.avg_node_cpu, 0) as avg_node_cpu,
      COALESCE(nm.avg_node_memory, 0) as avg_node_memory
    FROM nodes n
    LEFT JOIN failed f ON n.cluster_name = f.cluster_name
    LEFT JOIN node_cpu nc ON n.cluster_name = nc.cluster_name
    LEFT JOIN node_mem nm ON n.cluster_name = nm.cluster_name
    ORDER BY n.cluster_name
  `
  logQuery('cloudwatch', 'getEKSClusters', { startTs, endTs }, sql)
  return sql
}

/**
 * Get EKS summary
 */
export function getEKSSummary({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT cluster_name) as total_clusters,
      SUM(greptime_value) as total_nodes,
      (SELECT AVG(greptime_value) FROM "cloudwatch_eks_node_cpu_utilization"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as avg_cpu,
      (SELECT AVG(greptime_value) FROM "cloudwatch_eks_node_memory_utilization"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as avg_memory
    FROM "cloudwatch_eks_cluster_node_count"
    WHERE greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
  `
  logQuery('cloudwatch', 'getEKSSummary', { startTs, endTs }, sql)
  return sql
}

// ==================== RDS QUERIES ====================

/**
 * Get all RDS instances
 */
export function getRDSInstances({ startTs, endTs }: DateRange): string {
  const sql = `
    WITH cpu AS (
      SELECT db_instance_identifier, db_instance_class, engine, region, account_id,
             AVG(greptime_value) as avg_cpu
      FROM "cloudwatch_rds_CPUUtilization"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY db_instance_identifier, db_instance_class, engine, region, account_id
    ),
    conn AS (
      SELECT db_instance_identifier, MAX(greptime_value) as max_connections
      FROM "cloudwatch_rds_DatabaseConnections"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY db_instance_identifier
    ),
    mem AS (
      SELECT db_instance_identifier, AVG(greptime_value) as avg_freeable_memory
      FROM "cloudwatch_rds_FreeableMemory"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY db_instance_identifier
    ),
    riops AS (
      SELECT db_instance_identifier, AVG(greptime_value) as avg_read_iops
      FROM "cloudwatch_rds_ReadIOPS"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY db_instance_identifier
    ),
    wiops AS (
      SELECT db_instance_identifier, AVG(greptime_value) as avg_write_iops
      FROM "cloudwatch_rds_WriteIOPS"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY db_instance_identifier
    ),
    storage AS (
      SELECT db_instance_identifier, MIN(greptime_value) as min_free_storage
      FROM "cloudwatch_rds_FreeStorageSpace"
      WHERE greptime_timestamp >= '${startTs}'::timestamp
        AND greptime_timestamp < '${endTs}'::timestamp
      GROUP BY db_instance_identifier
    )
    SELECT
      c.db_instance_identifier, c.db_instance_class, c.engine, c.region, c.account_id,
      c.avg_cpu,
      COALESCE(cn.max_connections, 0) as max_connections,
      COALESCE(m.avg_freeable_memory, 0) as avg_freeable_memory,
      COALESCE(r.avg_read_iops, 0) as avg_read_iops,
      COALESCE(w.avg_write_iops, 0) as avg_write_iops,
      COALESCE(s.min_free_storage, 0) as min_free_storage
    FROM cpu c
    LEFT JOIN conn cn ON c.db_instance_identifier = cn.db_instance_identifier
    LEFT JOIN mem m ON c.db_instance_identifier = m.db_instance_identifier
    LEFT JOIN riops r ON c.db_instance_identifier = r.db_instance_identifier
    LEFT JOIN wiops w ON c.db_instance_identifier = w.db_instance_identifier
    LEFT JOIN storage s ON c.db_instance_identifier = s.db_instance_identifier
    ORDER BY c.avg_cpu DESC
  `
  logQuery('cloudwatch', 'getRDSInstances', { startTs, endTs }, sql)
  return sql
}

/**
 * Get RDS summary
 */
export function getRDSSummary({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT db_instance_identifier) as total_instances,
      AVG(greptime_value) as avg_cpu,
      (SELECT SUM(greptime_value) FROM "cloudwatch_rds_DatabaseConnections"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_connections,
      (SELECT SUM(greptime_value) FROM "cloudwatch_rds_ReadIOPS"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) +
      (SELECT SUM(greptime_value) FROM "cloudwatch_rds_WriteIOPS"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_iops
    FROM "cloudwatch_rds_CPUUtilization"
    WHERE greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
  `
  logQuery('cloudwatch', 'getRDSSummary', { startTs, endTs }, sql)
  return sql
}

// ==================== S3 QUERIES ====================

/**
 * Get S3 summary
 */
export function getS3Summary({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT bucket_name) as total_buckets,
      SUM(greptime_value) as total_size,
      (SELECT SUM(greptime_value) FROM "cloudwatch_s3_NumberOfObjects"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_objects,
      (SELECT SUM(greptime_value) FROM "cloudwatch_s3_AllRequests"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_requests
    FROM "cloudwatch_s3_BucketSizeBytes"
    WHERE greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
  `
  logQuery('cloudwatch', 'getS3Summary', { startTs, endTs }, sql)
  return sql
}

// ==================== MSK QUERIES ====================

/**
 * Get MSK summary
 */
export function getMSKSummary({ startTs, endTs }: DateRange): string {
  const sql = `
    SELECT
      COUNT(DISTINCT cluster_name) as total_clusters,
      COUNT(DISTINCT broker_id) as total_brokers,
      (SELECT SUM(greptime_value) FROM "cloudwatch_msk_MessagesInPerSec"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_messages,
      (SELECT SUM(greptime_value) FROM "cloudwatch_msk_BytesInPerSec"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) +
      (SELECT SUM(greptime_value) FROM "cloudwatch_msk_BytesOutPerSec"
       WHERE greptime_timestamp >= '${startTs}'::timestamp AND greptime_timestamp < '${endTs}'::timestamp) as total_throughput
    FROM "cloudwatch_msk_BytesInPerSec"
    WHERE greptime_timestamp >= '${startTs}'::timestamp
      AND greptime_timestamp < '${endTs}'::timestamp
  `
  logQuery('cloudwatch', 'getMSKSummary', { startTs, endTs }, sql)
  return sql
}

// ==================== DATA HEALTH QUERIES ====================

/**
 * Get CloudWatch data health
 */
export function getDataHealth(): string {
  const sql = `
    SELECT MAX(greptime_timestamp) as last_data
    FROM "cloudwatch_ec2_CPUUtilization"
  `
  logQuery('cloudwatch', 'getDataHealth', {}, sql)
  return sql
}
