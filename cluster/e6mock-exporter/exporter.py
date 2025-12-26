#!/usr/bin/env python3
"""
E6 Mock Exporter
Generates mock E6 metrics and pushes them to GreptimeDB.
Uses the same schema as the real e6metrics-exporter for testing purposes.
"""

import os
import sys
import time
import json
import random
import logging
import requests
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('e6mock-exporter')

# Mock cluster configurations
MOCK_CLUSTERS = [
    {'name': 'mock-prod-cluster', 'executors': 5, 'containers': 12},
    {'name': 'mock-dev-cluster', 'executors': 2, 'containers': 6},
    {'name': 'mock-staging-cluster', 'executors': 3, 'containers': 8},
]

# Realistic E6 metric names
ENGINE_METRICS = [
    'io_e6x_E6Engine_Uptime',
    'io_e6x_E6Engine_NumActiveQueries',
    'io_e6x_E6Engine_NumQueuedQueries',
    'io_e6x_E6Engine_NumCompletedQueries',
    'io_e6x_E6Engine_NumFailedQueries',
    'io_e6x_E6Engine_AvgQueryLatencyMs',
    'io_e6x_E6Engine_MaxQueryLatencyMs',
    'io_e6x_E6Engine_TotalBytesScanned',
    'io_e6x_E6Engine_TotalRowsScanned',
    'io_e6x_E6Engine_CacheHitRatio',
]

GATEWAY_METRICS = [
    'io_e6x_E6Gateway_NumActiveConnections',
    'io_e6x_E6Gateway_NumTotalConnections',
    'io_e6x_E6Gateway_RequestsPerSecond',
    'io_e6x_E6Gateway_AvgResponseTimeMs',
    'io_e6x_E6Gateway_ErrorRate',
]

QUEUE_METRICS = [
    'io_e6x_E6Queue_NumExecutionQueuedQueries',
    'io_e6x_E6Queue_NumExecutionRunningQueries',
    'io_e6x_E6Queue_NumCompilationQueuedQueries',
    'io_e6x_E6Queue_NumCompilationRunningQueries',
    'io_e6x_E6Queue_AvgQueueWaitTimeMs',
    'io_e6x_E6Queue_MaxQueueDepth',
]

EXECUTOR_METRICS = [
    'io_e6x_E6xecutor_HeapMemoryUsed',
    'io_e6x_E6xecutor_HeapMemoryMax',
    'io_e6x_E6xecutor_CpuUsagePercent',
    'io_e6x_E6xecutor_NumActiveTasks',
    'io_e6x_E6xecutor_NumCompletedTasks',
    'io_e6x_E6xecutor_BytesProcessed',
]

SCHEMA_METRICS = [
    'io_e6x_E6Schema_NumTableListingTasksInProgress',
    'io_e6x_E6Schema_NumTableListingTasksQueued',
    'io_e6x_E6Schema_NumTableListingTasksSuccess',
    'io_e6x_E6Schema_NumTableMetadataReadTasksInProgress',
    'io_e6x_E6Schema_CatalogCacheSize',
    'io_e6x_E6Schema_Uptime',
]

STORAGE_METRICS = [
    'io_e6x_E6Storage_FileMetadataCacheSize',
    'io_e6x_E6Storage_NumBlockedThreads',
    'io_e6x_E6Storage_NumPartFileAndMetadataListingTasksInProgress',
    'io_e6x_E6Storage_NumThriftRequestsInProgress',
    'io_e6x_E6Storage_Uptime',
]

CONTAINER_METRICS = [
    'e6data_container_cpu_usage_seconds_total',
    'e6data_container_memory_usage_bytes',
    'e6data_container_memory_working_set_bytes',
    'e6data_container_spec_cpu_quota',
    'e6data_container_spec_cpu_period',
    'e6data_container_restart_count',
    'e6data_container_requests',
]

CLUSTER_METRICS = [
    'e6data_cluster_total_nodes',
    'e6data_cluster_ready_nodes',
    'e6data_component_replicas_available',
    'e6data_component_replicas_desired',
]

COMPONENTS = ['executor', 'gateway', 'schema', 'storage', 'queue', 'planner']
NODES = ['node-1', 'node-2', 'node-3']


class GreptimeDBClient:
    """Client to write structured data to GreptimeDB."""

    def __init__(self, url: str, username: str, password: str):
        self.url = url.rstrip('/')
        self.auth = (username, password)
        self.session = requests.Session()
        self.session.auth = self.auth

    def execute_sql(self, database: str, sql: str) -> dict:
        """Execute a SQL statement."""
        url = f"{self.url}/v1/sql?db={database}"
        resp = self.session.post(url, data={'sql': sql}, timeout=30)
        return resp.json()

    def create_database(self, database: str) -> bool:
        """Create database if not exists."""
        result = self.execute_sql("public", f"CREATE DATABASE IF NOT EXISTS {database}")
        if result.get('error'):
            logger.error(f"Failed to create database '{database}': {result.get('error')}")
            return False
        logger.info(f"Database '{database}' created or already exists")
        return True

    def create_metrics_tables(self, database: str) -> bool:
        """Create required tables for e6 metrics."""
        tables = [
            """
            CREATE TABLE IF NOT EXISTS e6_engine_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_gateway_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                workspace STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, workspace, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_queue_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_executor_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                component STRING,
                pod STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, component, pod, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_schema_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_storage_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_container_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                component STRING,
                pod STRING,
                container STRING,
                node STRING,
                resource_type STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, component, pod, container, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_cluster_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS e6_generic_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                labels STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name, labels)
            )
            """
        ]

        if not self.create_database(database):
            return False

        success = True
        for table_sql in tables:
            result = self.execute_sql(database, table_sql)
            if result.get('error'):
                logger.error(f"Table creation failed: {result.get('error')}")
                success = False
            else:
                table_name = table_sql.split('IF NOT EXISTS')[1].split('(')[0].strip()
                logger.info(f"Table '{table_name}' created or already exists")
        return success

    def insert_rows(self, database: str, table: str, columns: list, rows: list) -> bool:
        """Insert multiple rows into a table."""
        if not rows:
            return True

        col_str = ', '.join(columns)
        values = []
        for row in rows:
            formatted = []
            for v in row:
                if isinstance(v, str):
                    v = v.replace("'", "''")
                    formatted.append(f"'{v}'")
                elif v is None:
                    formatted.append("NULL")
                else:
                    formatted.append(str(v))
            values.append(f"({', '.join(formatted)})")

        batch_size = 100
        for i in range(0, len(values), batch_size):
            batch = values[i:i+batch_size]
            sql = f"INSERT INTO {table} ({col_str}) VALUES {', '.join(batch)}"
            result = self.execute_sql(database, sql)
            if result.get('error'):
                logger.error(f"Insert error: {result.get('error')}")
                return False
        return True


def generate_metric_value(metric_name: str, base_value: float = None) -> float:
    """Generate a realistic metric value based on metric type."""
    if base_value is None:
        if metric_name == 'e6data_container_spec_cpu_quota':
            base_value = random.choice([200000, 400000, 800000, 1600000])  # 2, 4, 8, 16 cores
        elif metric_name == 'e6data_container_spec_cpu_period':
            base_value = 100000  # Always 100ms (standard)
        elif metric_name == 'e6data_container_requests':
            base_value = random.uniform(2e9, 16e9)  # 2GB - 16GB memory request
        elif metric_name == 'e6data_container_memory_usage_bytes':
            base_value = random.uniform(1e9, 12e9)  # 1GB - 12GB memory usage
        elif metric_name == 'e6data_container_memory_working_set_bytes':
            base_value = random.uniform(0.5e9, 10e9)  # 0.5GB - 10GB working set
        elif metric_name == 'e6data_container_cpu_usage_seconds_total':
            base_value = random.uniform(1000, 100000)  # CPU seconds
        elif metric_name == 'e6data_container_restart_count':
            base_value = random.choice([0, 0, 0, 0, 1, 2])  # Mostly 0, sometimes restarts
        elif 'Uptime' in metric_name:
            base_value = random.uniform(86400, 864000)  # 1-10 days in seconds
        elif 'Percent' in metric_name or 'Ratio' in metric_name:
            base_value = random.uniform(0, 100)
        elif 'Bytes' in metric_name or 'Memory' in metric_name:
            base_value = random.uniform(1e9, 1e11)  # 1GB - 100GB
        elif 'Latency' in metric_name or 'Time' in metric_name:
            base_value = random.uniform(10, 5000)  # 10ms - 5s
        elif 'Num' in metric_name or 'Count' in metric_name:
            base_value = random.uniform(0, 100)
        elif 'Rate' in metric_name:
            base_value = random.uniform(0, 10)
        else:
            base_value = random.uniform(0, 1000)

    # Add some random variation (±10%) - but not for period which should be fixed
    if metric_name == 'e6data_container_spec_cpu_period':
        return base_value
    variation = base_value * random.uniform(-0.1, 0.1)
    return round(max(0, base_value + variation), 4)


def generate_engine_metrics(cluster: dict) -> list:
    """Generate mock E6 Engine metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']

    for metric_name in ENGINE_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster_name, metric_name, value))

    return rows


def generate_gateway_metrics(cluster: dict) -> list:
    """Generate mock E6 Gateway metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']
    workspaces = ['default', 'analytics', 'reporting']

    for workspace in workspaces:
        for metric_name in GATEWAY_METRICS:
            value = generate_metric_value(metric_name)
            rows.append((ts, cluster_name, workspace, metric_name, value))

    return rows


def generate_queue_metrics(cluster: dict) -> list:
    """Generate mock E6 Queue metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']

    for metric_name in QUEUE_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster_name, metric_name, value))

    return rows


def generate_executor_metrics(cluster: dict) -> list:
    """Generate mock E6 Executor metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']
    num_executors = cluster.get('executors', 3)

    for i in range(num_executors):
        pod = f"{cluster_name}-executor-{i}"
        for metric_name in EXECUTOR_METRICS:
            value = generate_metric_value(metric_name)
            rows.append((ts, cluster_name, 'executor', pod, metric_name, value))

    return rows


def generate_schema_metrics(cluster: dict) -> list:
    """Generate mock E6 Schema metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']

    for metric_name in SCHEMA_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster_name, metric_name, value))

    return rows


def generate_storage_metrics(cluster: dict) -> list:
    """Generate mock E6 Storage metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']

    for metric_name in STORAGE_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster_name, metric_name, value))

    return rows


def generate_container_metrics(cluster: dict) -> list:
    """Generate mock E6 Container metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']
    num_containers = cluster.get('containers', 8)

    for i in range(num_containers):
        component = random.choice(COMPONENTS)
        pod = f"{cluster_name}-{component}-{i}"
        container = f"{component}-container"
        node = random.choice(NODES)

        for metric_name in CONTAINER_METRICS:
            resource = ''
            if 'cpu' in metric_name.lower():
                resource = 'cpu'
            elif 'memory' in metric_name.lower():
                resource = 'memory'

            value = generate_metric_value(metric_name)
            rows.append((ts, cluster_name, component, pod, container, node, resource, metric_name, value))

    return rows


def generate_cluster_metrics(cluster: dict) -> list:
    """Generate mock E6 Cluster metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    cluster_name = cluster['name']

    for metric_name in CLUSTER_METRICS:
        if 'nodes' in metric_name.lower():
            value = len(NODES) if 'total' in metric_name.lower() else len(NODES) - random.randint(0, 1)
        else:
            value = generate_metric_value(metric_name)
        rows.append((ts, cluster_name, metric_name, value))

    return rows


def generate_all_metrics(greptimedb: GreptimeDBClient, database: str):
    """Generate and push all mock metrics for all clusters."""
    total_records = 0

    for cluster in MOCK_CLUSTERS:
        cluster_name = cluster['name']
        logger.info(f"[{cluster_name}] Generating mock metrics...")

        # Engine metrics
        rows = generate_engine_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_engine_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_engine_metrics rows")

        # Gateway metrics
        rows = generate_gateway_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_gateway_metrics',
                ['ts', 'cluster_name', 'workspace', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_gateway_metrics rows")

        # Queue metrics
        rows = generate_queue_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_queue_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_queue_metrics rows")

        # Executor metrics
        rows = generate_executor_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_executor_metrics',
                ['ts', 'cluster_name', 'component', 'pod', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_executor_metrics rows")

        # Schema metrics
        rows = generate_schema_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_schema_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_schema_metrics rows")

        # Storage metrics
        rows = generate_storage_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_storage_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_storage_metrics rows")

        # Container metrics
        rows = generate_container_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_container_metrics',
                ['ts', 'cluster_name', 'component', 'pod', 'container', 'node', 'resource_type', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_container_metrics rows")

        # Cluster metrics
        rows = generate_cluster_metrics(cluster)
        if rows:
            greptimedb.insert_rows(database, 'e6_cluster_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{cluster_name}] Wrote {len(rows)} e6_cluster_metrics rows")

    logger.info(f"Total records written: {total_records}")
    return total_records


def main():
    logger.info("E6 Mock Exporter starting...")

    # Configuration from environment
    greptimedb_url = os.environ.get('GREPTIMEDB_URL', 'https://greptimedb.cloudcosts.in')
    greptimedb_username = os.environ.get('GREPTIMEDB_USERNAME', 'e6data')
    greptimedb_password = os.environ.get('GREPTIMEDB_PASSWORD', 'cloudcosts')
    database = os.environ.get('DATABASE', 'e6_mock')
    scrape_interval = int(os.environ.get('SCRAPE_INTERVAL', '60'))

    greptimedb = GreptimeDBClient(
        url=greptimedb_url,
        username=greptimedb_username,
        password=greptimedb_password
    )

    logger.info(f"Configured {len(MOCK_CLUSTERS)} mock cluster(s): {[c['name'] for c in MOCK_CLUSTERS]}")
    logger.info(f"Scrape interval: {scrape_interval}s")

    tables_created = False
    retry_count = 0
    max_retries = 10

    while True:
        # Ensure tables exist before inserting
        if not tables_created:
            logger.info(f"Creating database '{database}' and tables (attempt {retry_count + 1}/{max_retries})...")
            tables_created = greptimedb.create_metrics_tables(database)
            if not tables_created:
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(f"Failed to create tables after {max_retries} attempts. Will keep retrying...")
                    retry_count = 0
                wait_time = min(30, 5 * retry_count)
                logger.info(f"Waiting {wait_time}s before retrying...")
                time.sleep(wait_time)
                continue
            logger.info("Tables created successfully")

        try:
            start_time = time.time()
            total_records = generate_all_metrics(greptimedb, database)
            duration = time.time() - start_time
            logger.info(f"Mock metrics generation complete. Records: {total_records}, Duration: {duration:.2f}s")
        except Exception as e:
            logger.error(f"Error generating mock metrics: {e}")
            # Reset tables_created flag to retry table creation
            tables_created = False

        logger.info(f"Sleeping for {scrape_interval}s...")
        time.sleep(scrape_interval)


if __name__ == '__main__':
    main()
