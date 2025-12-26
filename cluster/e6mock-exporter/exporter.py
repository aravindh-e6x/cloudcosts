#!/usr/bin/env python3
"""
E6 Mock Exporter
Generates mock E6 metrics and Kubernetes/OpenCost metrics, pushes them to GreptimeDB.
Uses Prometheus remote write for Kubernetes metrics (same as monitoring agent).
Uses SQL for E6 metrics.

Configuration is loaded from config.yaml or CONFIG_PATH environment variable.
"""

import os
import time
import random
import logging
import requests
import yaml
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('e6mock-exporter')


# =============================================================================
# Configuration Loading
# =============================================================================

def load_config(config_path: str = None) -> dict:
    """Load configuration from YAML file."""
    if config_path is None:
        config_path = os.environ.get('CONFIG_PATH', '/app/config.yaml')

    # Also try local path for development
    if not Path(config_path).exists():
        local_path = Path(__file__).parent / 'config.yaml'
        if local_path.exists():
            config_path = str(local_path)

    if not Path(config_path).exists():
        logger.warning(f"Config file not found at {config_path}, using defaults")
        return get_default_config()

    logger.info(f"Loading configuration from {config_path}")
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    return config


def get_default_config() -> dict:
    """Return default configuration if config file is not found."""
    return {
        'e6_customers': [
            {
                'name': 'acme-corp',
                'display_name': 'ACME Corporation',
                'clusters': [
                    {
                        'name': 'prod-cluster',
                        'executors': 5,
                        'containers': 12,
                        'nodes': ['prod-node-1', 'prod-node-2', 'prod-node-3'],
                        'namespaces': ['e6data', 'default', 'kube-system'],
                    }
                ]
            }
        ],
        'cloudwatch': {
            'accounts': [{'id': '123456789012', 'name': 'Production'}],
            'regions': ['us-east-1'],
            'eks_clusters': [
                {
                    'name': 'prod-eks',
                    'nodes': ['ip-10-0-1-101', 'ip-10-0-2-102'],
                    'namespaces': ['default', 'e6data'],
                    'pods_per_namespace': 3,
                }
            ],
            'ec2_instances': [],
            'rds_instances': [],
            's3_buckets': [],
            'msk_clusters': [],
            'glue_jobs': [],
            'vpcs': [],
        },
        'vantage': {
            'providers': ['aws'],
            'base_daily_costs': {'aws': 15000},
            'accounts': {'aws': [{'account_id': '123456789012', 'account_name': 'Production'}]},
            'services': {'aws': ['Amazon EC2', 'Amazon S3']},
            'tags': [{'tag_key': 'Environment', 'values': ['production', '__untagged__']}],
        },
        'settings': {
            'historical_days': {'vantage': 90, 'cloudwatch': 7, 'kubernetes': 1},
            'scrape_interval_seconds': 60,
        }
    }


def build_mock_clusters_from_config(config: dict) -> list:
    """Build MOCK_CLUSTERS list from e6_customers config."""
    clusters = []
    for customer in config.get('e6_customers', []):
        customer_name = customer.get('name', 'unknown')
        for cluster in customer.get('clusters', []):
            clusters.append({
                'name': f"{customer_name}-{cluster['name']}",
                'customer': customer_name,
                'customer_display': customer.get('display_name', customer_name),
                'executors': cluster.get('executors', 3),
                'containers': cluster.get('containers', 8),
                'nodes': cluster.get('nodes', ['node-1', 'node-2']),
                'namespaces': cluster.get('namespaces', ['e6data', 'default']),
            })
    return clusters


# Load configuration
CONFIG = load_config()
MOCK_CLUSTERS = build_mock_clusters_from_config(CONFIG)

# E6 Components
COMPONENTS = ['executor', 'gateway', 'schema', 'storage', 'queue', 'planner']

# E6 metric definitions
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

E6_CONTAINER_METRICS = [
    'e6data_container_cpu_usage_seconds_total',
    'e6data_container_memory_usage_bytes',
    'e6data_container_memory_working_set_bytes',
    'e6data_container_spec_cpu_quota',
    'e6data_container_spec_cpu_period',
    'e6data_container_restart_count',
    'e6data_container_requests',
]

E6_CLUSTER_METRICS = [
    'e6data_cluster_total_nodes',
    'e6data_cluster_ready_nodes',
    'e6data_component_replicas_available',
    'e6data_component_replicas_desired',
]

# =============================================================================
# Vantage Mock Data Configuration (loaded from config)
# =============================================================================

def get_vantage_config():
    """Get Vantage configuration from loaded config."""
    vantage = CONFIG.get('vantage', {})
    return {
        'providers': vantage.get('providers', ['aws']),
        'accounts': vantage.get('accounts', {}),
        'services': vantage.get('services', {}),
        'tags': vantage.get('tags', []),
        'base_costs': vantage.get('base_daily_costs', {'aws': 15000}),
    }

VANTAGE_CONFIG = get_vantage_config()
VANTAGE_PROVIDERS = VANTAGE_CONFIG['providers']
VANTAGE_ACCOUNTS = VANTAGE_CONFIG['accounts']
VANTAGE_SERVICES = VANTAGE_CONFIG['services']
VANTAGE_TAGS = VANTAGE_CONFIG['tags']
VANTAGE_BASE_COSTS = VANTAGE_CONFIG['base_costs']

# =============================================================================
# CloudWatch Mock Data Configuration (loaded from config)
# =============================================================================

def get_cloudwatch_config():
    """Get CloudWatch configuration from loaded config."""
    cw = CONFIG.get('cloudwatch', {})
    return {
        'accounts': cw.get('accounts', [{'id': '123456789012', 'name': 'Production'}]),
        'regions': cw.get('regions', ['us-east-1']),
        'ec2_instances': cw.get('ec2_instances', []),
        'eks_clusters': cw.get('eks_clusters', []),
        'rds_instances': cw.get('rds_instances', []),
        's3_buckets': cw.get('s3_buckets', []),
        'msk_clusters': cw.get('msk_clusters', []),
        'glue_jobs': cw.get('glue_jobs', []),
        'vpcs': cw.get('vpcs', []),
    }

CLOUDWATCH_CONFIG = get_cloudwatch_config()
CLOUDWATCH_ACCOUNTS = CLOUDWATCH_CONFIG['accounts']
CLOUDWATCH_REGIONS = CLOUDWATCH_CONFIG['regions']
CLOUDWATCH_EC2_INSTANCES = CLOUDWATCH_CONFIG['ec2_instances']
CLOUDWATCH_EKS_CLUSTERS = CLOUDWATCH_CONFIG['eks_clusters']
CLOUDWATCH_RDS_INSTANCES = CLOUDWATCH_CONFIG['rds_instances']
CLOUDWATCH_S3_BUCKETS = CLOUDWATCH_CONFIG['s3_buckets']
CLOUDWATCH_MSK_CLUSTERS = CLOUDWATCH_CONFIG['msk_clusters']
CLOUDWATCH_GLUE_JOBS = CLOUDWATCH_CONFIG['glue_jobs']
CLOUDWATCH_VPCS = CLOUDWATCH_CONFIG['vpcs']


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

    def create_e6_tables(self, database: str) -> bool:
        """Create required tables for E6 metrics."""
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
        ]

        if not self.create_database(database):
            return False

        success = True
        for table_sql in tables:
            result = self.execute_sql(database, table_sql)
            if result.get('error'):
                logger.error(f"E6 table creation failed: {result.get('error')}")
                success = False
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
                logger.error(f"Insert error into {table}: {result.get('error')}")
                return False
        return True

    def write_prometheus_metrics(self, database: str, metrics: list) -> bool:
        """Write metrics using InfluxDB line protocol.

        Each metric is a dict: {name, labels, value, timestamp_ms}
        """
        if not metrics:
            return True

        def escape_tag_value(v):
            """Escape special characters in InfluxDB tag values."""
            if not v:
                return ''
            # Escape spaces, commas, and equals signs
            return str(v).replace(' ', '\\ ').replace(',', '\\,').replace('=', '\\=')

        # Build InfluxDB line protocol (GreptimeDB supports this)
        lines = []
        for m in metrics:
            # Format: metric_name,tag1=value1,tag2=value2 field=value timestamp_ns
            # Filter out empty values and escape special chars
            tags = ','.join(f'{k}={escape_tag_value(v)}' for k, v in sorted(m['labels'].items()) if v)
            if tags:
                line = f"{m['name']},{tags} greptime_value={m['value']} {m['timestamp_ms'] * 1000000}"
            else:
                line = f"{m['name']} greptime_value={m['value']} {m['timestamp_ms'] * 1000000}"
            lines.append(line)

        # Write using InfluxDB line protocol endpoint
        url = f"{self.url}/v1/influxdb/write?db={database}"
        data = '\n'.join(lines)

        try:
            resp = self.session.post(url, data=data, timeout=30)
            if resp.status_code != 204:
                logger.error(f"InfluxDB write failed: {resp.status_code} - {resp.text[:200]}")
                return False
            return True
        except Exception as e:
            logger.error(f"InfluxDB write error: {e}")
            return False


def generate_metric_value(metric_name: str, base_value: float = None) -> float:
    """Generate a realistic metric value based on metric type."""
    if base_value is None:
        if 'cpu_usage_seconds' in metric_name:
            base_value = random.uniform(1000, 100000)
        elif 'memory' in metric_name.lower() and 'bytes' in metric_name.lower():
            base_value = random.uniform(1e9, 16e9)
        elif 'cpu_allocation' in metric_name or 'cpu' in metric_name.lower() and 'cost' not in metric_name.lower():
            base_value = random.uniform(0.5, 8)
        elif 'memory_allocation' in metric_name:
            base_value = random.uniform(2e9, 32e9)
        elif 'hourly_cost' in metric_name or 'cost' in metric_name.lower():
            base_value = random.uniform(0.01, 2.0)
        elif 'Uptime' in metric_name:
            base_value = random.uniform(86400, 864000)
        elif 'Percent' in metric_name or 'Ratio' in metric_name:
            base_value = random.uniform(0, 100)
        elif 'Latency' in metric_name or 'Time' in metric_name:
            base_value = random.uniform(10, 5000)
        elif 'Num' in metric_name or 'Count' in metric_name:
            base_value = random.uniform(0, 100)
        else:
            base_value = random.uniform(0, 1000)

    variation = base_value * random.uniform(-0.1, 0.1)
    return round(max(0, base_value + variation), 4)


# =============================================================================
# E6 Metrics Generation
# =============================================================================

def generate_engine_metrics(cluster: dict, ts: str) -> list:
    rows = []
    for metric_name in ENGINE_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster['name'], metric_name, value))
    return rows


def generate_gateway_metrics(cluster: dict, ts: str) -> list:
    rows = []
    workspaces = ['default', 'analytics', 'reporting']
    for workspace in workspaces:
        for metric_name in GATEWAY_METRICS:
            value = generate_metric_value(metric_name)
            rows.append((ts, cluster['name'], workspace, metric_name, value))
    return rows


def generate_queue_metrics(cluster: dict, ts: str) -> list:
    rows = []
    for metric_name in QUEUE_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster['name'], metric_name, value))
    return rows


def generate_executor_metrics(cluster: dict, ts: str) -> list:
    rows = []
    for i in range(cluster.get('executors', 3)):
        pod = f"{cluster['name']}-executor-{i}"
        for metric_name in EXECUTOR_METRICS:
            value = generate_metric_value(metric_name)
            rows.append((ts, cluster['name'], 'executor', pod, metric_name, value))
    return rows


def generate_schema_metrics(cluster: dict, ts: str) -> list:
    rows = []
    for metric_name in SCHEMA_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster['name'], metric_name, value))
    return rows


def generate_storage_metrics(cluster: dict, ts: str) -> list:
    rows = []
    for metric_name in STORAGE_METRICS:
        value = generate_metric_value(metric_name)
        rows.append((ts, cluster['name'], metric_name, value))
    return rows


def generate_e6_container_metrics(cluster: dict, ts: str) -> list:
    rows = []
    nodes = cluster.get('nodes', ['node-1', 'node-2', 'node-3'])
    for i in range(cluster.get('containers', 8)):
        component = random.choice(COMPONENTS)
        pod = f"{cluster['name']}-{component}-{i}"
        container = f"{component}-container"
        node = random.choice(nodes)
        for metric_name in E6_CONTAINER_METRICS:
            resource = 'cpu' if 'cpu' in metric_name.lower() else 'memory' if 'memory' in metric_name.lower() else ''
            value = generate_metric_value(metric_name)
            rows.append((ts, cluster['name'], component, pod, container, node, resource, metric_name, value))
    return rows


def generate_e6_cluster_metrics(cluster: dict, ts: str) -> list:
    rows = []
    nodes = cluster.get('nodes', ['node-1', 'node-2', 'node-3'])
    for metric_name in E6_CLUSTER_METRICS:
        if 'nodes' in metric_name.lower():
            value = len(nodes) if 'total' in metric_name.lower() else len(nodes) - random.randint(0, 1)
        else:
            value = generate_metric_value(metric_name)
        rows.append((ts, cluster['name'], metric_name, value))
    return rows


# =============================================================================
# Kubernetes Metrics Generation (using Prometheus format)
# =============================================================================

def generate_k8s_metrics(cluster: dict, timestamp_ms: int) -> list:
    """Generate Kubernetes/OpenCost metrics in Prometheus format."""
    metrics = []
    nodes = cluster.get('nodes', ['node-1'])
    instance_types = ['m5.xlarge', 'm5.2xlarge', 'r5.xlarge', 'c5.2xlarge']
    zones = ['us-east-1a', 'us-east-1b', 'us-east-1c']

    # Generate container metrics
    for i in range(cluster.get('containers', 8)):
        component = random.choice(COMPONENTS)
        pod = f"{cluster['name']}-{component}-{i}"
        container = component
        node = random.choice(nodes)
        namespace = 'e6data'

        base_labels = {
            'cluster': cluster['name'],
            'namespace': namespace,
            'pod': pod,
            'container': container,
            'node': node,
            'job': 'cadvisor',
            'instance': f'{node}:10250',
        }

        # container_cpu_usage_seconds_total
        metrics.append({
            'name': 'container_cpu_usage_seconds_total',
            'labels': {**base_labels, 'cpu': 'total', 'id': f'/kubepods/{pod}', 'image': f'e6data/{component}:latest', 'name': pod},
            'value': generate_metric_value('cpu_usage_seconds'),
            'timestamp_ms': timestamp_ms,
        })

        # container_memory_working_set_bytes
        metrics.append({
            'name': 'container_memory_working_set_bytes',
            'labels': {**base_labels, 'id': f'/kubepods/{pod}', 'image': f'e6data/{component}:latest', 'name': pod},
            'value': generate_metric_value('memory_bytes'),
            'timestamp_ms': timestamp_ms,
        })

        # container_cpu_allocation (from OpenCost)
        cpu_alloc = random.uniform(0.5, 4)
        metrics.append({
            'name': 'container_cpu_allocation',
            'labels': {'cluster': cluster['name'], 'namespace': namespace, 'pod': pod, 'container': container, 'node': node, 'job': 'opencost', 'instance': 'opencost:9003'},
            'value': cpu_alloc,
            'timestamp_ms': timestamp_ms,
        })

        # container_memory_allocation_bytes (from OpenCost)
        mem_alloc = random.uniform(2e9, 16e9)
        metrics.append({
            'name': 'container_memory_allocation_bytes',
            'labels': {'cluster': cluster['name'], 'namespace': namespace, 'pod': pod, 'container': container, 'node': node, 'job': 'opencost', 'instance': 'opencost:9003'},
            'value': mem_alloc,
            'timestamp_ms': timestamp_ms,
        })

        # container_cpu_cost_hourly (OpenCost container cost)
        # Cost = CPU allocation * $0.03/core/hour (typical cloud pricing)
        cpu_cost = cpu_alloc * 0.03
        metrics.append({
            'name': 'container_cpu_cost_hourly',
            'labels': {'cluster': cluster['name'], 'namespace': namespace, 'pod': pod, 'container': container, 'node': node, 'job': 'opencost', 'instance': 'opencost:9003'},
            'value': cpu_cost,
            'timestamp_ms': timestamp_ms,
        })

        # container_memory_cost_hourly (OpenCost container cost)
        # Cost = Memory allocation in GB * $0.004/GB/hour (typical cloud pricing)
        mem_cost = (mem_alloc / (1024**3)) * 0.004
        metrics.append({
            'name': 'container_memory_cost_hourly',
            'labels': {'cluster': cluster['name'], 'namespace': namespace, 'pod': pod, 'container': container, 'node': node, 'job': 'opencost', 'instance': 'opencost:9003'},
            'value': mem_cost,
            'timestamp_ms': timestamp_ms,
        })

    # Generate pod metrics
    for i in range(cluster.get('containers', 8)):
        component = random.choice(COMPONENTS)
        pod = f"{cluster['name']}-{component}-{i}"
        container = component
        node = random.choice(nodes)
        namespace = 'e6data'
        host_ip = f"10.0.{random.randint(1,10)}.{random.randint(1,254)}"
        pod_ip = f"10.1.{random.randint(1,10)}.{random.randint(1,254)}"

        # kube_pod_info
        metrics.append({
            'name': 'kube_pod_info',
            'labels': {
                'cluster': cluster['name'],
                'namespace': namespace,
                'pod': pod,
                'node': node,
                'host_ip': host_ip,
                'pod_ip': pod_ip,
                'host_network': 'false',
                'created_by_kind': 'ReplicaSet',
                'created_by_name': f'{component}-{random.randint(1000,9999)}',
                'priority_class': '',
                'uid': f'{random.randint(10000000,99999999)}-{random.randint(1000,9999)}',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': 1,
            'timestamp_ms': timestamp_ms,
        })

        # kube_pod_container_resource_requests (CPU)
        metrics.append({
            'name': 'kube_pod_container_resource_requests',
            'labels': {
                'cluster': cluster['name'],
                'namespace': namespace,
                'pod': pod,
                'container': container,
                'node': node,
                'resource': 'cpu',
                'unit': 'core',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': random.uniform(0.25, 2),
            'timestamp_ms': timestamp_ms,
        })

        # kube_pod_container_resource_requests (memory)
        metrics.append({
            'name': 'kube_pod_container_resource_requests',
            'labels': {
                'cluster': cluster['name'],
                'namespace': namespace,
                'pod': pod,
                'container': container,
                'node': node,
                'resource': 'memory',
                'unit': 'byte',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': random.uniform(1e9, 8e9),
            'timestamp_ms': timestamp_ms,
        })

        # kube_pod_container_resource_limits (CPU)
        metrics.append({
            'name': 'kube_pod_container_resource_limits',
            'labels': {
                'cluster': cluster['name'],
                'namespace': namespace,
                'pod': pod,
                'container': container,
                'node': node,
                'resource': 'cpu',
                'unit': 'core',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': random.uniform(1, 4),
            'timestamp_ms': timestamp_ms,
        })

        # kube_pod_container_resource_limits (memory)
        metrics.append({
            'name': 'kube_pod_container_resource_limits',
            'labels': {
                'cluster': cluster['name'],
                'namespace': namespace,
                'pod': pod,
                'container': container,
                'node': node,
                'resource': 'memory',
                'unit': 'byte',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': random.uniform(2e9, 16e9),
            'timestamp_ms': timestamp_ms,
        })

    # Generate node metrics
    for node in nodes:
        instance_type = random.choice(instance_types)
        zone = random.choice(zones)
        cpu_capacity = {'m5.xlarge': 4, 'm5.2xlarge': 8, 'r5.xlarge': 4, 'c5.2xlarge': 8}.get(instance_type, 4)
        mem_capacity = {'m5.xlarge': 16e9, 'm5.2xlarge': 32e9, 'r5.xlarge': 32e9, 'c5.2xlarge': 16e9}.get(instance_type, 16e9)

        # kube_node_info
        metrics.append({
            'name': 'kube_node_info',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'container_runtime_version': 'containerd://1.6.20',
                'kernel_version': '5.10.186',
                'kubelet_version': 'v1.28.3',
                'os_image': 'Amazon Linux 2',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': 1,
            'timestamp_ms': timestamp_ms,
        })

        # kube_node_labels
        metrics.append({
            'name': 'kube_node_labels',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'label_node_kubernetes_io_instance_type': instance_type,
                'label_topology_kubernetes_io_zone': zone,
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': 1,
            'timestamp_ms': timestamp_ms,
        })

        # kube_node_status_capacity (CPU)
        metrics.append({
            'name': 'kube_node_status_capacity',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'resource': 'cpu',
                'unit': 'core',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': cpu_capacity,
            'timestamp_ms': timestamp_ms,
        })

        # kube_node_status_capacity (memory)
        metrics.append({
            'name': 'kube_node_status_capacity',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'resource': 'memory',
                'unit': 'byte',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': mem_capacity,
            'timestamp_ms': timestamp_ms,
        })

        # kube_node_status_allocatable (CPU)
        metrics.append({
            'name': 'kube_node_status_allocatable',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'resource': 'cpu',
                'unit': 'core',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': cpu_capacity * 0.9,
            'timestamp_ms': timestamp_ms,
        })

        # kube_node_status_allocatable (memory)
        metrics.append({
            'name': 'kube_node_status_allocatable',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'resource': 'memory',
                'unit': 'byte',
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': mem_capacity * 0.9,
            'timestamp_ms': timestamp_ms,
        })

        # node_memory_MemTotal_bytes
        metrics.append({
            'name': 'node_memory_MemTotal_bytes',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'job': 'node-exporter',
                'instance': f'{node}:9100',
            },
            'value': mem_capacity,
            'timestamp_ms': timestamp_ms,
        })

        # node_memory_MemAvailable_bytes
        metrics.append({
            'name': 'node_memory_MemAvailable_bytes',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'job': 'node-exporter',
                'instance': f'{node}:9100',
            },
            'value': mem_capacity * random.uniform(0.3, 0.7),
            'timestamp_ms': timestamp_ms,
        })

        # node_cpu_seconds_total (by mode)
        for cpu_id in range(cpu_capacity):
            for mode in ['user', 'system', 'idle', 'iowait']:
                base = {'user': 30000, 'system': 10000, 'idle': 50000, 'iowait': 1000}.get(mode, 1000)
                metrics.append({
                    'name': 'node_cpu_seconds_total',
                    'labels': {
                        'cluster': cluster['name'],
                        'node': node,
                        'cpu': str(cpu_id),
                        'mode': mode,
                        'job': 'node-exporter',
                        'instance': f'{node}:9100',
                    },
                    'value': base + random.uniform(0, 10000),
                    'timestamp_ms': timestamp_ms,
                })

        # OpenCost node cost metrics
        total_cost = random.uniform(0.5, 2.0)
        cpu_ratio = random.uniform(0.4, 0.6)

        metrics.append({
            'name': 'node_total_hourly_cost',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'instance_type': instance_type,
                'region': 'us-east-1',
                'provider_id': f'aws:///{zone}/{node}',
                'arch': 'amd64',
                'job': 'opencost',
                'instance': 'opencost:9003',
                'exported_instance': '',
            },
            'value': total_cost,
            'timestamp_ms': timestamp_ms,
        })

        metrics.append({
            'name': 'node_cpu_hourly_cost',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'instance_type': instance_type,
                'region': 'us-east-1',
                'provider_id': f'aws:///{zone}/{node}',
                'arch': 'amd64',
                'job': 'opencost',
                'instance': 'opencost:9003',
            },
            'value': total_cost * cpu_ratio,
            'timestamp_ms': timestamp_ms,
        })

        metrics.append({
            'name': 'node_ram_hourly_cost',
            'labels': {
                'cluster': cluster['name'],
                'node': node,
                'instance_type': instance_type,
                'region': 'us-east-1',
                'provider_id': f'aws:///{zone}/{node}',
                'arch': 'amd64',
                'job': 'opencost',
                'instance': 'opencost:9003',
            },
            'value': total_cost * (1 - cpu_ratio),
            'timestamp_ms': timestamp_ms,
        })

    # Namespace metrics
    for namespace in cluster.get('namespaces', ['e6data', 'default']):
        metrics.append({
            'name': 'kube_namespace_labels',
            'labels': {
                'cluster': cluster['name'],
                'namespace': namespace,
                'job': 'kube-state-metrics',
                'instance': 'kube-state-metrics:8080',
            },
            'value': 1,
            'timestamp_ms': timestamp_ms,
        })

    return metrics


# =============================================================================
# Vantage Metrics Generation
# =============================================================================

def date_to_timestamp_ms(date_str: str) -> int:
    """Convert YYYY-MM-DD to milliseconds timestamp (UTC midnight)."""
    dt = datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def generate_vantage_daily_cost_by_provider(historical_days: int = 90) -> list:
    """Generate daily cost by provider metrics for historical period."""
    metrics = []
    end_date = datetime.now(timezone.utc).date()

    for day_offset in range(historical_days):
        date = end_date - timedelta(days=day_offset)
        date_str = date.strftime('%Y-%m-%d')
        timestamp_ms = date_to_timestamp_ms(date_str)

        # Add weekday variation (less on weekends)
        weekday_factor = 0.7 if date.weekday() >= 5 else 1.0
        # Add monthly trend (costs grow slightly over time)
        trend_factor = 1 + (historical_days - day_offset) * 0.001

        for provider in VANTAGE_PROVIDERS:
            base_cost = VANTAGE_BASE_COSTS.get(provider, 1000)
            # Add random variation (±15%)
            variation = random.uniform(-0.15, 0.15)
            daily_cost = base_cost * weekday_factor * trend_factor * (1 + variation)

            metrics.append({
                'name': 'vantage_daily_cost_by_provider',
                'labels': {'provider': provider},
                'value': round(daily_cost, 2),
                'timestamp_ms': timestamp_ms,
            })

    return metrics


def generate_vantage_daily_cost_by_account(historical_days: int = 90) -> list:
    """Generate daily cost by account metrics for historical period."""
    metrics = []
    end_date = datetime.now(timezone.utc).date()

    for day_offset in range(historical_days):
        date = end_date - timedelta(days=day_offset)
        date_str = date.strftime('%Y-%m-%d')
        timestamp_ms = date_to_timestamp_ms(date_str)

        weekday_factor = 0.7 if date.weekday() >= 5 else 1.0
        trend_factor = 1 + (historical_days - day_offset) * 0.001

        for provider in VANTAGE_PROVIDERS:
            accounts = VANTAGE_ACCOUNTS.get(provider, [])
            base_cost = VANTAGE_BASE_COSTS.get(provider, 1000)

            # Distribute cost across accounts (production gets more)
            account_weights = []
            for i, acc in enumerate(accounts):
                if 'prod' in acc['account_name'].lower():
                    account_weights.append(0.6)
                elif 'dev' in acc['account_name'].lower():
                    account_weights.append(0.25)
                else:
                    account_weights.append(0.15)

            # Normalize weights
            total_weight = sum(account_weights) or 1
            account_weights = [w / total_weight for w in account_weights]

            for i, account in enumerate(accounts):
                weight = account_weights[i] if i < len(account_weights) else 1 / len(accounts)
                variation = random.uniform(-0.1, 0.1)
                daily_cost = base_cost * weight * weekday_factor * trend_factor * (1 + variation)

                metrics.append({
                    'name': 'vantage_daily_cost_by_account',
                    'labels': {
                        'provider': provider,
                        'account_id': account['account_id'],
                        'account_name': account['account_name'],
                    },
                    'value': round(daily_cost, 2),
                    'timestamp_ms': timestamp_ms,
                })

    return metrics


def generate_vantage_daily_cost_by_service(historical_days: int = 90) -> list:
    """Generate daily cost by service metrics for historical period."""
    metrics = []
    end_date = datetime.now(timezone.utc).date()

    # Service weights (compute is typically highest)
    service_weights = {
        'Amazon EC2': 0.35, 'Amazon S3': 0.15, 'Amazon RDS': 0.20, 'AWS Lambda': 0.05,
        'Amazon EKS': 0.15, 'Amazon CloudWatch': 0.05, 'AWS Data Transfer': 0.05,
        'Virtual Machines': 0.40, 'Storage': 0.15, 'Azure SQL': 0.25, 'Azure Functions': 0.10, 'AKS': 0.10,
        'Compute Engine': 0.35, 'Cloud Storage': 0.15, 'BigQuery': 0.30, 'Cloud Functions': 0.10, 'GKE': 0.10,
        'All-Purpose Compute': 0.40, 'Jobs Compute': 0.35, 'SQL Compute': 0.20, 'Serverless': 0.05,
        'Compute': 0.70, 'Storage': 0.20, 'Data Transfer': 0.10,
    }

    for day_offset in range(historical_days):
        date = end_date - timedelta(days=day_offset)
        date_str = date.strftime('%Y-%m-%d')
        timestamp_ms = date_to_timestamp_ms(date_str)

        weekday_factor = 0.7 if date.weekday() >= 5 else 1.0
        trend_factor = 1 + (historical_days - day_offset) * 0.001

        for provider in VANTAGE_PROVIDERS:
            accounts = VANTAGE_ACCOUNTS.get(provider, [])
            services = VANTAGE_SERVICES.get(provider, [])
            base_cost = VANTAGE_BASE_COSTS.get(provider, 1000)

            for account in accounts:
                # Get account's share of provider cost
                if 'prod' in account['account_name'].lower():
                    account_share = 0.6
                elif 'dev' in account['account_name'].lower():
                    account_share = 0.25
                else:
                    account_share = 0.15

                for service in services:
                    weight = service_weights.get(service, 1 / len(services))
                    variation = random.uniform(-0.15, 0.15)
                    daily_cost = base_cost * account_share * weight * weekday_factor * trend_factor * (1 + variation)

                    # Skip very small costs
                    if daily_cost < 1:
                        continue

                    metrics.append({
                        'name': 'vantage_daily_cost_by_service',
                        'labels': {
                            'provider': provider,
                            'account_id': account['account_id'],
                            'account_name': account['account_name'],
                            'service': service,
                        },
                        'value': round(daily_cost, 2),
                        'timestamp_ms': timestamp_ms,
                    })

    return metrics


def generate_vantage_cost_by_tag(historical_days: int = 90) -> list:
    """Generate cost by tag metrics for historical period."""
    metrics = []
    end_date = datetime.now(timezone.utc).date()

    for day_offset in range(historical_days):
        date = end_date - timedelta(days=day_offset)
        date_str = date.strftime('%Y-%m-%d')
        timestamp_ms = date_to_timestamp_ms(date_str)

        weekday_factor = 0.7 if date.weekday() >= 5 else 1.0

        for provider in VANTAGE_PROVIDERS:
            services = VANTAGE_SERVICES.get(provider, [])
            base_cost = VANTAGE_BASE_COSTS.get(provider, 1000) / len(VANTAGE_TAGS)

            for tag_config in VANTAGE_TAGS:
                tag_key = tag_config['tag_key']
                tag_values = tag_config['values']

                for service in services[:3]:  # Top 3 services per provider
                    for tag_value in tag_values:
                        # Untagged gets less cost (represents tagging compliance)
                        if tag_value == '__untagged__':
                            value_weight = 0.1
                        else:
                            value_weight = 0.9 / (len(tag_values) - 1)

                        variation = random.uniform(-0.2, 0.2)
                        daily_cost = base_cost * value_weight * weekday_factor * (1 + variation) / len(services[:3])

                        if daily_cost < 0.5:
                            continue

                        metrics.append({
                            'name': 'vantage_cost_by_tag',
                            'labels': {
                                'provider': provider,
                                'service': service,
                                'tag_key': tag_key,
                                'tag_value': tag_value,
                            },
                            'value': round(daily_cost, 2),
                            'timestamp_ms': timestamp_ms,
                        })

    return metrics


def generate_vantage_tags_inventory() -> list:
    """Generate tag inventory snapshot metrics."""
    metrics = []
    timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

    for tag_config in VANTAGE_TAGS:
        tag_key = tag_config['tag_key']
        # All tags are available on aws and gcp, fewer on others
        if tag_key in ['Environment', 'Team']:
            providers = 'aws,azure,gcp,databricks,snowflake'
        else:
            providers = 'aws,gcp'

        metrics.append({
            'name': 'vantage_tags',
            'labels': {
                'tag_key': tag_key,
                'providers': providers,
                'hidden': 'false',
            },
            'value': 1.0,
            'timestamp_ms': timestamp_ms,
        })

    return metrics


def generate_all_vantage_metrics(greptimedb: 'GreptimeDBClient', database: str, historical_days: int = 90) -> int:
    """Generate and push all Vantage mock metrics."""
    total_records = 0

    logger.info(f"Generating Vantage mock data for {historical_days} days...")

    # Generate daily cost by provider
    metrics = generate_vantage_daily_cost_by_provider(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"  Generated {len(metrics)} vantage_daily_cost_by_provider metrics")
        total_records += len(metrics)

    # Generate daily cost by account
    metrics = generate_vantage_daily_cost_by_account(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"  Generated {len(metrics)} vantage_daily_cost_by_account metrics")
        total_records += len(metrics)

    # Generate daily cost by service
    metrics = generate_vantage_daily_cost_by_service(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"  Generated {len(metrics)} vantage_daily_cost_by_service metrics")
        total_records += len(metrics)

    # Generate cost by tag
    metrics = generate_vantage_cost_by_tag(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"  Generated {len(metrics)} vantage_cost_by_tag metrics")
        total_records += len(metrics)

    # Generate tags inventory
    metrics = generate_vantage_tags_inventory()
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"  Generated {len(metrics)} vantage_tags metrics")
        total_records += len(metrics)

    return total_records


# =============================================================================
# CloudWatch Metrics Generation
# =============================================================================

def generate_cloudwatch_ec2_metrics(historical_days: int = 7) -> list:
    """Generate EC2 CloudWatch metrics for historical period (1-hour intervals)."""
    metrics = []
    end_time = datetime.now(timezone.utc)
    interval_minutes = 60  # 1 hour intervals to reduce data volume
    intervals = (historical_days * 24 * 60) // interval_minutes

    # Use only primary account and region to reduce data volume
    account = CLOUDWATCH_ACCOUNTS[0]  # Production account only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for instance in CLOUDWATCH_EC2_INSTANCES:
        # Generate time series
        for i in range(intervals):
            ts = end_time - timedelta(minutes=i * interval_minutes)
            timestamp_ms = int(ts.timestamp() * 1000)

            # Add time-of-day variation
            hour = ts.hour
            day_factor = 1.2 if 9 <= hour <= 17 else 0.6  # Higher during business hours

            base_labels = {
                'instance_id': instance['instance_id'],
                'instance_type': instance['instance_type'],
                'region': region,
                'account_id': account['id'],
                'availability_zone': f"{region}{instance['az']}",
            }

            # CPUUtilization
            metrics.append({
                'name': 'cloudwatch_ec2_CPUUtilization',
                'labels': base_labels,
                'value': round(random.uniform(15, 75) * day_factor, 2),
                'timestamp_ms': timestamp_ms,
            })

            # NetworkIn/Out
            metrics.append({
                'name': 'cloudwatch_ec2_NetworkIn',
                'labels': base_labels,
                'value': round(random.uniform(1e6, 1e9) * day_factor),
                'timestamp_ms': timestamp_ms,
            })
            metrics.append({
                'name': 'cloudwatch_ec2_NetworkOut',
                'labels': base_labels,
                'value': round(random.uniform(1e6, 5e8) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            # DiskReadBytes/WriteBytes
            metrics.append({
                'name': 'cloudwatch_ec2_DiskReadBytes',
                'labels': base_labels,
                'value': round(random.uniform(1e5, 1e8)),
                'timestamp_ms': timestamp_ms,
            })
            metrics.append({
                'name': 'cloudwatch_ec2_DiskWriteBytes',
                'labels': base_labels,
                'value': round(random.uniform(1e5, 5e7)),
                'timestamp_ms': timestamp_ms,
            })

            # StatusCheckFailed (mostly 0, occasionally 1)
            metrics.append({
                'name': 'cloudwatch_ec2_StatusCheckFailed',
                'labels': base_labels,
                'value': 1 if random.random() < 0.001 else 0,
                'timestamp_ms': timestamp_ms,
            })

    return metrics


def generate_cloudwatch_eks_metrics(historical_days: int = 7) -> list:
    """Generate EKS CloudWatch Container Insights metrics (1-hour intervals)."""
    metrics = []
    end_time = datetime.now(timezone.utc)
    interval_minutes = 60  # 1 hour intervals
    intervals = (historical_days * 24 * 60) // interval_minutes

    account = CLOUDWATCH_ACCOUNTS[0]  # Production only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for cluster in CLOUDWATCH_EKS_CLUSTERS:
        for i in range(intervals):
            ts = end_time - timedelta(minutes=i * interval_minutes)
            timestamp_ms = int(ts.timestamp() * 1000)
            hour = ts.hour
            day_factor = 1.3 if 9 <= hour <= 17 else 0.7

            # Cluster-level metrics
            cluster_labels = {
                'cluster_name': cluster['name'],
                'region': region,
                'account_id': account['id'],
            }

            metrics.append({
                'name': 'cloudwatch_eks_cluster_node_count',
                'labels': cluster_labels,
                'value': len(cluster['nodes']),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_eks_cluster_failed_node_count',
                'labels': cluster_labels,
                'value': 1 if random.random() < 0.005 else 0,
                'timestamp_ms': timestamp_ms,
            })

            # Node-level metrics
            for node in cluster['nodes']:
                node_labels = {**cluster_labels, 'node': node}

                metrics.append({
                    'name': 'cloudwatch_eks_node_cpu_utilization',
                    'labels': node_labels,
                    'value': round(random.uniform(20, 70) * day_factor, 2),
                    'timestamp_ms': timestamp_ms,
                })

                metrics.append({
                    'name': 'cloudwatch_eks_node_memory_utilization',
                    'labels': node_labels,
                    'value': round(random.uniform(40, 85), 2),
                    'timestamp_ms': timestamp_ms,
                })

            # Pod-level metrics (sample - reduced count)
            for ns in cluster['namespaces'][:2]:  # Only first 2 namespaces
                for pod_idx in range(min(2, cluster['pods_per_namespace'])):  # Max 2 pods
                    pod_name = f"{ns}-pod-{pod_idx}"
                    pod_labels = {
                        **cluster_labels,
                        'namespace': ns,
                        'pod': pod_name,
                        'node': random.choice(cluster['nodes']),
                    }

                    metrics.append({
                        'name': 'cloudwatch_eks_pod_cpu_utilization',
                        'labels': pod_labels,
                        'value': round(random.uniform(5, 60) * day_factor, 2),
                        'timestamp_ms': timestamp_ms,
                    })

                    metrics.append({
                        'name': 'cloudwatch_eks_pod_memory_utilization',
                        'labels': pod_labels,
                        'value': round(random.uniform(20, 80), 2),
                        'timestamp_ms': timestamp_ms,
                    })

                    metrics.append({
                        'name': 'cloudwatch_eks_pod_network_rx_bytes',
                        'labels': pod_labels,
                        'value': round(random.uniform(1e4, 1e7)),
                        'timestamp_ms': timestamp_ms,
                    })

                    metrics.append({
                        'name': 'cloudwatch_eks_pod_network_tx_bytes',
                        'labels': pod_labels,
                        'value': round(random.uniform(1e4, 5e6)),
                        'timestamp_ms': timestamp_ms,
                    })

    return metrics


def generate_cloudwatch_rds_metrics(historical_days: int = 7) -> list:
    """Generate RDS CloudWatch metrics (1-hour intervals)."""
    metrics = []
    end_time = datetime.now(timezone.utc)
    interval_minutes = 60  # 1 hour intervals
    intervals = (historical_days * 24 * 60) // interval_minutes

    account = CLOUDWATCH_ACCOUNTS[0]  # Production only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for rds in CLOUDWATCH_RDS_INSTANCES:
        for i in range(intervals):
            ts = end_time - timedelta(minutes=i * interval_minutes)
            timestamp_ms = int(ts.timestamp() * 1000)
            hour = ts.hour
            day_factor = 1.4 if 9 <= hour <= 17 else 0.5

            base_labels = {
                'db_instance_identifier': rds['identifier'],
                'db_instance_class': rds['class'],
                'engine': rds['engine'],
                'region': region,
                'account_id': account['id'],
            }

            metrics.append({
                'name': 'cloudwatch_rds_CPUUtilization',
                'labels': base_labels,
                'value': round(random.uniform(10, 60) * day_factor, 2),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_rds_DatabaseConnections',
                'labels': base_labels,
                'value': int(random.uniform(10, 200) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_rds_FreeableMemory',
                'labels': base_labels,
                'value': round(random.uniform(2e9, 16e9)),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_rds_ReadIOPS',
                'labels': base_labels,
                'value': round(random.uniform(100, 5000) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_rds_WriteIOPS',
                'labels': base_labels,
                'value': round(random.uniform(50, 2000) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_rds_FreeStorageSpace',
                'labels': base_labels,
                'value': round(rds['storage_gb'] * 1e9 * random.uniform(0.3, 0.7)),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_rds_ReadLatency',
                'labels': base_labels,
                'value': round(random.uniform(0.001, 0.05), 4),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_rds_WriteLatency',
                'labels': base_labels,
                'value': round(random.uniform(0.002, 0.08), 4),
                'timestamp_ms': timestamp_ms,
            })

    return metrics


def generate_cloudwatch_s3_metrics(historical_days: int = 7) -> list:
    """Generate S3 CloudWatch metrics (daily for storage, hourly for requests)."""
    metrics = []
    end_time = datetime.now(timezone.utc)

    account = CLOUDWATCH_ACCOUNTS[0]  # Production only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for bucket in CLOUDWATCH_S3_BUCKETS:
        base_labels = {
            'bucket_name': bucket['name'],
            'storage_type': bucket['storage_class'],
            'region': region,
            'account_id': account['id'],
        }

        # Daily storage metrics
        for day in range(historical_days):
            ts = end_time - timedelta(days=day)
            timestamp_ms = int(ts.replace(hour=0, minute=0, second=0).timestamp() * 1000)

            # Bucket size (grows slightly over time)
            base_size = random.uniform(1e10, 1e12)
            growth = 1 + (historical_days - day) * 0.01
            metrics.append({
                'name': 'cloudwatch_s3_BucketSizeBytes',
                'labels': base_labels,
                'value': round(base_size * growth),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_s3_NumberOfObjects',
                'labels': base_labels,
                'value': int(random.uniform(10000, 1000000) * growth),
                'timestamp_ms': timestamp_ms,
            })

        # Request metrics (1-hour intervals)
        interval_minutes = 60
        intervals = (historical_days * 24 * 60) // interval_minutes
        for i in range(intervals):
            ts = end_time - timedelta(minutes=i * interval_minutes)
            timestamp_ms = int(ts.timestamp() * 1000)
            hour = ts.hour
            day_factor = 1.5 if 9 <= hour <= 17 else 0.3

            metrics.append({
                'name': 'cloudwatch_s3_AllRequests',
                'labels': base_labels,
                'value': int(random.uniform(100, 10000) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_s3_GetRequests',
                'labels': base_labels,
                'value': int(random.uniform(50, 8000) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_s3_PutRequests',
                'labels': base_labels,
                'value': int(random.uniform(10, 2000) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_s3_BytesDownloaded',
                'labels': base_labels,
                'value': round(random.uniform(1e6, 1e10) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_s3_BytesUploaded',
                'labels': base_labels,
                'value': round(random.uniform(1e5, 1e9) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

    return metrics


def generate_cloudwatch_msk_metrics(historical_days: int = 7) -> list:
    """Generate MSK (Kafka) CloudWatch metrics (1-hour intervals)."""
    metrics = []
    end_time = datetime.now(timezone.utc)
    interval_minutes = 60  # 1 hour intervals
    intervals = (historical_days * 24 * 60) // interval_minutes

    account = CLOUDWATCH_ACCOUNTS[0]  # Production only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for cluster in CLOUDWATCH_MSK_CLUSTERS:
        for i in range(intervals):
            ts = end_time - timedelta(minutes=i * interval_minutes)
            timestamp_ms = int(ts.timestamp() * 1000)
            hour = ts.hour
            day_factor = 1.5 if 8 <= hour <= 20 else 0.4

            for broker in cluster['brokers'][:2]:  # First 2 brokers only
                broker_labels = {
                    'cluster_name': cluster['name'],
                    'broker_id': broker,
                    'region': region,
                    'account_id': account['id'],
                }

                metrics.append({
                    'name': 'cloudwatch_msk_CpuUser',
                    'labels': broker_labels,
                    'value': round(random.uniform(10, 50) * day_factor, 2),
                    'timestamp_ms': timestamp_ms,
                })

                metrics.append({
                    'name': 'cloudwatch_msk_MemoryUsed',
                    'labels': broker_labels,
                    'value': round(random.uniform(4e9, 12e9)),
                    'timestamp_ms': timestamp_ms,
                })

                metrics.append({
                    'name': 'cloudwatch_msk_KafkaDataLogsDiskUsed',
                    'labels': broker_labels,
                    'value': round(random.uniform(50e9, 500e9)),
                    'timestamp_ms': timestamp_ms,
                })

            # Topic-level metrics - only first 2 topics
            for topic in cluster['topics'][:2]:
                topic_labels = {
                    'cluster_name': cluster['name'],
                    'topic': topic,
                    'region': region,
                    'account_id': account['id'],
                }

                metrics.append({
                    'name': 'cloudwatch_msk_BytesInPerSec',
                    'labels': topic_labels,
                    'value': round(random.uniform(1e4, 1e7) * day_factor),
                    'timestamp_ms': timestamp_ms,
                })

                metrics.append({
                    'name': 'cloudwatch_msk_BytesOutPerSec',
                    'labels': topic_labels,
                    'value': round(random.uniform(1e4, 5e7) * day_factor),
                    'timestamp_ms': timestamp_ms,
                })

                metrics.append({
                    'name': 'cloudwatch_msk_MessagesInPerSec',
                    'labels': topic_labels,
                    'value': round(random.uniform(100, 10000) * day_factor),
                    'timestamp_ms': timestamp_ms,
                })

            # Cluster-level partition metrics
            cluster_labels = {
                'cluster_name': cluster['name'],
                'region': region,
                'account_id': account['id'],
            }

            metrics.append({
                'name': 'cloudwatch_msk_PartitionCount',
                'labels': cluster_labels,
                'value': len(cluster['topics']) * 10,
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_msk_UnderReplicatedPartitions',
                'labels': cluster_labels,
                'value': 1 if random.random() < 0.01 else 0,
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_msk_OfflinePartitionsCount',
                'labels': cluster_labels,
                'value': 0,
                'timestamp_ms': timestamp_ms,
            })

    return metrics


def generate_cloudwatch_glue_metrics(historical_days: int = 7) -> list:
    """Generate Glue CloudWatch metrics."""
    metrics = []
    end_time = datetime.now(timezone.utc)

    account = CLOUDWATCH_ACCOUNTS[0]  # Production only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for job in CLOUDWATCH_GLUE_JOBS:
        # Glue jobs run periodically (simulate daily runs)
        for day in range(historical_days):
            # Random run time between 2-6 AM
            run_hour = random.randint(2, 6)
            ts = (end_time - timedelta(days=day)).replace(hour=run_hour, minute=random.randint(0, 59))
            timestamp_ms = int(ts.timestamp() * 1000)
            job_run_id = f"jr_{ts.strftime('%Y%m%d')}_{random.randint(1000, 9999)}"

            base_labels = {
                'job_name': job['name'],
                'job_run_id': job_run_id,
                'type': job['type'],
                'region': region,
                'account_id': account['id'],
            }

            # Simulate job metrics
            elapsed_time = random.uniform(60000, 3600000)  # 1 min to 1 hour in ms

            metrics.append({
                'name': 'cloudwatch_glue_driver_aggregate_bytesRead',
                'labels': base_labels,
                'value': round(random.uniform(1e9, 100e9)),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_glue_driver_aggregate_bytesWritten',
                'labels': base_labels,
                'value': round(random.uniform(1e8, 50e9)),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_glue_driver_aggregate_elapsedTime',
                'labels': base_labels,
                'value': round(elapsed_time),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_glue_driver_aggregate_numCompletedTasks',
                'labels': base_labels,
                'value': random.randint(50, 500),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_glue_driver_aggregate_numFailedTasks',
                'labels': base_labels,
                'value': random.randint(0, 5) if random.random() < 0.1 else 0,
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_glue_ALL_jvm_heap_usage',
                'labels': base_labels,
                'value': round(random.uniform(0.4, 0.85), 2),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_glue_driver_ExecutorAllocationManager_executors_numberAllExecutors',
                'labels': base_labels,
                'value': random.randint(2, 20),
                'timestamp_ms': timestamp_ms,
            })

    return metrics


def generate_cloudwatch_vpc_metrics(historical_days: int = 7) -> list:
    """Generate VPC Flow Log CloudWatch metrics (1-hour intervals)."""
    metrics = []
    end_time = datetime.now(timezone.utc)
    interval_minutes = 60  # 1 hour intervals
    intervals = (historical_days * 24 * 60) // interval_minutes

    account = CLOUDWATCH_ACCOUNTS[0]  # Production only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for vpc in CLOUDWATCH_VPCS[:1]:  # Just first VPC
        for i in range(intervals):
            ts = end_time - timedelta(minutes=i * interval_minutes)
            timestamp_ms = int(ts.timestamp() * 1000)
            hour = ts.hour
            day_factor = 1.3 if 9 <= hour <= 17 else 0.5

            for subnet in vpc['subnets'][:2]:  # First 2 subnets
                for direction in ['ingress', 'egress']:
                    base_labels = {
                        'vpc_id': vpc['id'],
                        'subnet_id': subnet,
                        'direction': direction,
                        'region': region,
                        'account_id': account['id'],
                    }

                    metrics.append({
                        'name': 'cloudwatch_vpc_BytesTransferred',
                        'labels': base_labels,
                        'value': round(random.uniform(1e6, 1e10) * day_factor),
                        'timestamp_ms': timestamp_ms,
                    })

                    metrics.append({
                        'name': 'cloudwatch_vpc_PacketsTransferred',
                        'labels': base_labels,
                        'value': int(random.uniform(1000, 1000000) * day_factor),
                        'timestamp_ms': timestamp_ms,
                    })

                    metrics.append({
                        'name': 'cloudwatch_vpc_AcceptedConnections',
                        'labels': base_labels,
                        'value': int(random.uniform(100, 10000) * day_factor),
                        'timestamp_ms': timestamp_ms,
                    })

                    metrics.append({
                        'name': 'cloudwatch_vpc_RejectedConnections',
                        'labels': base_labels,
                        'value': int(random.uniform(0, 100)),
                        'timestamp_ms': timestamp_ms,
                    })

    return metrics


def generate_cloudwatch_data_transfer_metrics(historical_days: int = 7) -> list:
    """Generate Data Transfer CloudWatch metrics."""
    metrics = []
    end_time = datetime.now(timezone.utc)
    interval_minutes = 60  # Hourly for data transfer
    intervals = historical_days * 24

    services = ['EC2', 'S3', 'RDS']  # Reduced services

    account = CLOUDWATCH_ACCOUNTS[0]  # Production only
    region = CLOUDWATCH_REGIONS[0]  # us-east-1 only
    for service in services:
        for i in range(intervals):
            ts = end_time - timedelta(hours=i)
            timestamp_ms = int(ts.timestamp() * 1000)
            hour = ts.hour
            day_factor = 1.5 if 9 <= hour <= 17 else 0.4

            base_labels = {
                'service': service,
                'region': region,
                'account_id': account['id'],
            }

            # Internet transfer
            metrics.append({
                'name': 'cloudwatch_data_transfer_BytesOut_Internet',
                'labels': base_labels,
                'value': round(random.uniform(1e7, 1e10) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            metrics.append({
                'name': 'cloudwatch_data_transfer_BytesIn_Internet',
                'labels': base_labels,
                'value': round(random.uniform(1e6, 5e9) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

            # Cross-region transfer
            for dest_region in ['us-west-2']:  # Just one region
                cross_labels = {
                    **base_labels,
                    'source_region': region,
                    'dest_region': dest_region,
                }
                metrics.append({
                    'name': 'cloudwatch_data_transfer_BytesOut_Region',
                    'labels': cross_labels,
                    'value': round(random.uniform(1e6, 1e9)),
                    'timestamp_ms': timestamp_ms,
                })

            # Cross-AZ transfer
            metrics.append({
                'name': 'cloudwatch_data_transfer_BytesOut_AZ',
                'labels': base_labels,
                'value': round(random.uniform(1e7, 5e9) * day_factor),
                'timestamp_ms': timestamp_ms,
            })

    return metrics


def generate_all_cloudwatch_metrics(greptimedb: 'GreptimeDBClient', database: str, historical_days: int = 7) -> int:
    """Generate and push all CloudWatch mock metrics."""
    total_records = 0

    logger.info(f"Generating CloudWatch mock data for {historical_days} days...")

    # EC2 metrics
    logger.info("  Generating EC2 metrics...")
    metrics = generate_cloudwatch_ec2_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_ec2 metrics")
        total_records += len(metrics)

    # EKS metrics
    logger.info("  Generating EKS metrics...")
    metrics = generate_cloudwatch_eks_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_eks metrics")
        total_records += len(metrics)

    # RDS metrics
    logger.info("  Generating RDS metrics...")
    metrics = generate_cloudwatch_rds_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_rds metrics")
        total_records += len(metrics)

    # S3 metrics
    logger.info("  Generating S3 metrics...")
    metrics = generate_cloudwatch_s3_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_s3 metrics")
        total_records += len(metrics)

    # MSK metrics
    logger.info("  Generating MSK metrics...")
    metrics = generate_cloudwatch_msk_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_msk metrics")
        total_records += len(metrics)

    # Glue metrics
    logger.info("  Generating Glue metrics...")
    metrics = generate_cloudwatch_glue_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_glue metrics")
        total_records += len(metrics)

    # VPC metrics
    logger.info("  Generating VPC metrics...")
    metrics = generate_cloudwatch_vpc_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_vpc metrics")
        total_records += len(metrics)

    # Data Transfer metrics
    logger.info("  Generating Data Transfer metrics...")
    metrics = generate_cloudwatch_data_transfer_metrics(historical_days)
    if greptimedb.write_prometheus_metrics(database, metrics):
        logger.info(f"    Generated {len(metrics)} cloudwatch_data_transfer metrics")
        total_records += len(metrics)

    return total_records


# =============================================================================
# Main Functions
# =============================================================================

def generate_all_e6_metrics(greptimedb: GreptimeDBClient, ts: str, e6_tables_created: dict) -> int:
    """Generate and push all E6 metrics for all clusters, writing to customer-specific databases."""
    total_records = 0

    for cluster in MOCK_CLUSTERS:
        cluster_name = cluster['name']
        customer = cluster.get('customer', 'mock')
        database = f"e6_{customer}"

        # Create tables for this customer's database if not done yet
        if database not in e6_tables_created:
            logger.info(f"Creating E6 database '{database}' and tables for customer '{customer}'...")
            if greptimedb.create_e6_tables(database):
                e6_tables_created[database] = True
            else:
                logger.warning(f"Failed to create tables for {database}, skipping...")
                continue

        # Engine metrics
        rows = generate_engine_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_engine_metrics',
            ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        # Gateway metrics
        rows = generate_gateway_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_gateway_metrics',
            ['ts', 'cluster_name', 'workspace', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        # Queue metrics
        rows = generate_queue_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_queue_metrics',
            ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        # Executor metrics
        rows = generate_executor_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_executor_metrics',
            ['ts', 'cluster_name', 'component', 'pod', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        # Schema metrics
        rows = generate_schema_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_schema_metrics',
            ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        # Storage metrics
        rows = generate_storage_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_storage_metrics',
            ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        # Container metrics
        rows = generate_e6_container_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_container_metrics',
            ['ts', 'cluster_name', 'component', 'pod', 'container', 'node', 'resource_type', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        # Cluster metrics
        rows = generate_e6_cluster_metrics(cluster, ts)
        greptimedb.insert_rows(database, 'e6_cluster_metrics',
            ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
        total_records += len(rows)

        logger.info(f"[{cluster_name}] Generated E6 metrics")

    return total_records


def generate_all_k8s_metrics(greptimedb: GreptimeDBClient, database: str, timestamp_ms: int) -> int:
    """Generate and push all Kubernetes/OpenCost metrics for all clusters."""
    total_records = 0

    for cluster in MOCK_CLUSTERS:
        cluster_name = cluster['name']
        metrics = generate_k8s_metrics(cluster, timestamp_ms)

        if greptimedb.write_prometheus_metrics(database, metrics):
            logger.info(f"[{cluster_name}] Generated {len(metrics)} Kubernetes/OpenCost metrics")
            total_records += len(metrics)
        else:
            logger.error(f"[{cluster_name}] Failed to write Kubernetes metrics")

    return total_records


def main():
    logger.info("E6 Mock Exporter starting...")

    # Get settings from config
    settings = CONFIG.get('settings', {})
    historical_days = settings.get('historical_days', {})

    # Configuration from environment (with config file fallbacks)
    greptimedb_url = os.environ.get('GREPTIMEDB_URL', 'http://monitoring-stack-greptimedb-standalone:4000')
    greptimedb_username = os.environ.get('GREPTIMEDB_USERNAME', 'e6data')
    greptimedb_password = os.environ.get('GREPTIMEDB_PASSWORD', 'cloudcosts')
    k8s_database = os.environ.get('K8S_DATABASE', 'kubernetes')
    vantage_database = os.environ.get('VANTAGE_DATABASE', 'vantage')
    cloudwatch_database = os.environ.get('CLOUDWATCH_DATABASE', 'cloudwatch')

    # Use config file settings, with environment variable overrides
    vantage_historical_days = int(os.environ.get('VANTAGE_HISTORICAL_DAYS', historical_days.get('vantage', 90)))
    cloudwatch_historical_days = int(os.environ.get('CLOUDWATCH_HISTORICAL_DAYS', historical_days.get('cloudwatch', 7)))
    scrape_interval = int(os.environ.get('SCRAPE_INTERVAL', settings.get('scrape_interval_seconds', 60)))

    greptimedb = GreptimeDBClient(
        url=greptimedb_url,
        username=greptimedb_username,
        password=greptimedb_password
    )

    # Get unique customer names for E6 databases
    e6_customers = list(set(c.get('customer', 'mock') for c in MOCK_CLUSTERS))

    # Log configuration summary
    logger.info(f"Configuration loaded with {len(CONFIG.get('e6_customers', []))} E6 customer(s)")
    logger.info(f"Configured {len(MOCK_CLUSTERS)} mock E6 cluster(s): {[c['name'] for c in MOCK_CLUSTERS]}")
    logger.info(f"E6 customers (databases): {['e6_' + c for c in e6_customers]}")
    logger.info(f"Configured {len(CLOUDWATCH_EKS_CLUSTERS)} CloudWatch EKS cluster(s): {[c['name'] for c in CLOUDWATCH_EKS_CLUSTERS]}")
    logger.info(f"Kubernetes database: {k8s_database}, Vantage database: {vantage_database}, CloudWatch database: {cloudwatch_database}")
    logger.info(f"Scrape interval: {scrape_interval}s, Vantage historical days: {vantage_historical_days}, CloudWatch historical days: {cloudwatch_historical_days}")

    e6_tables_created = {}  # Dict to track which customer databases have been created
    vantage_initialized = False
    cloudwatch_initialized = False

    # Create databases
    greptimedb.create_database(k8s_database)
    greptimedb.create_database(vantage_database)
    greptimedb.create_database(cloudwatch_database)

    while True:
        ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        try:
            start_time = time.time()

            # Generate E6 metrics (writes to customer-specific databases)
            e6_records = generate_all_e6_metrics(greptimedb, ts, e6_tables_created)

            # Generate Kubernetes/OpenCost metrics using InfluxDB line protocol
            k8s_records = generate_all_k8s_metrics(greptimedb, k8s_database, timestamp_ms)

            # Generate Vantage mock data (only once at startup, since it's daily data)
            vantage_records = 0
            if not vantage_initialized:
                logger.info("Generating Vantage mock data (one-time initialization)...")
                vantage_records = generate_all_vantage_metrics(greptimedb, vantage_database, vantage_historical_days)
                vantage_initialized = True
                logger.info(f"Vantage mock data initialized: {vantage_records} records")

            # Generate CloudWatch mock data (only once at startup, since it's historical data)
            cloudwatch_records = 0
            if not cloudwatch_initialized:
                logger.info("Generating CloudWatch mock data (one-time initialization)...")
                cloudwatch_records = generate_all_cloudwatch_metrics(greptimedb, cloudwatch_database, cloudwatch_historical_days)
                cloudwatch_initialized = True
                logger.info(f"CloudWatch mock data initialized: {cloudwatch_records} records")

            duration = time.time() - start_time
            logger.info(f"Metrics generation complete. E6: {e6_records}, K8s: {k8s_records}, Duration: {duration:.2f}s")

        except Exception as e:
            logger.error(f"Error generating metrics: {e}")
            import traceback
            traceback.print_exc()
            e6_tables_created.clear()  # Reset to retry table creation

        logger.info(f"Sleeping for {scrape_interval}s...")
        time.sleep(scrape_interval)


if __name__ == '__main__':
    main()
