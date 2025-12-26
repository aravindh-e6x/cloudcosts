#!/usr/bin/env python3
"""
E6 Mock Exporter
Generates mock E6 metrics and Kubernetes/OpenCost metrics, pushes them to GreptimeDB.
Uses Prometheus remote write for Kubernetes metrics (same as monitoring agent).
Uses SQL for E6 metrics.
"""

import os
import time
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

# Mock cluster configurations - shared between E6 and Kubernetes metrics
MOCK_CLUSTERS = [
    {
        'name': 'mock-prod-cluster',
        'executors': 5,
        'containers': 12,
        'nodes': ['prod-node-1', 'prod-node-2', 'prod-node-3'],
        'namespaces': ['e6data', 'default', 'kube-system'],
    },
    {
        'name': 'mock-dev-cluster',
        'executors': 2,
        'containers': 6,
        'nodes': ['dev-node-1', 'dev-node-2'],
        'namespaces': ['e6data', 'default'],
    },
    {
        'name': 'mock-staging-cluster',
        'executors': 3,
        'containers': 8,
        'nodes': ['staging-node-1', 'staging-node-2'],
        'namespaces': ['e6data', 'default', 'monitoring'],
    },
]

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
        metrics.append({
            'name': 'container_cpu_allocation',
            'labels': {'cluster': cluster['name'], 'namespace': namespace, 'pod': pod, 'container': container, 'node': node, 'job': 'opencost', 'instance': 'opencost:9003'},
            'value': random.uniform(0.5, 4),
            'timestamp_ms': timestamp_ms,
        })

        # container_memory_allocation_bytes (from OpenCost)
        metrics.append({
            'name': 'container_memory_allocation_bytes',
            'labels': {'cluster': cluster['name'], 'namespace': namespace, 'pod': pod, 'container': container, 'node': node, 'job': 'opencost', 'instance': 'opencost:9003'},
            'value': random.uniform(2e9, 16e9),
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
# Main Functions
# =============================================================================

def generate_all_e6_metrics(greptimedb: GreptimeDBClient, database: str, ts: str) -> int:
    """Generate and push all E6 metrics for all clusters."""
    total_records = 0

    for cluster in MOCK_CLUSTERS:
        cluster_name = cluster['name']

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

    # Configuration from environment
    greptimedb_url = os.environ.get('GREPTIMEDB_URL', 'http://monitoring-stack-greptimedb-standalone:4000')
    greptimedb_username = os.environ.get('GREPTIMEDB_USERNAME', 'e6data')
    greptimedb_password = os.environ.get('GREPTIMEDB_PASSWORD', 'cloudcosts')
    e6_database = os.environ.get('DATABASE', 'e6_mock')
    k8s_database = os.environ.get('K8S_DATABASE', 'kubernetes')
    scrape_interval = int(os.environ.get('SCRAPE_INTERVAL', '60'))

    greptimedb = GreptimeDBClient(
        url=greptimedb_url,
        username=greptimedb_username,
        password=greptimedb_password
    )

    logger.info(f"Configured {len(MOCK_CLUSTERS)} mock cluster(s): {[c['name'] for c in MOCK_CLUSTERS]}")
    logger.info(f"E6 database: {e6_database}, Kubernetes database: {k8s_database}")
    logger.info(f"Scrape interval: {scrape_interval}s")

    e6_tables_created = False
    retry_count = 0
    max_retries = 10

    # Create kubernetes database
    greptimedb.create_database(k8s_database)

    while True:
        ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        # Create E6 tables if needed
        if not e6_tables_created:
            logger.info(f"Creating E6 database '{e6_database}' and tables...")
            e6_tables_created = greptimedb.create_e6_tables(e6_database)
            if not e6_tables_created:
                retry_count += 1
                if retry_count >= max_retries:
                    logger.error(f"Failed to create E6 tables after {max_retries} attempts")
                    retry_count = 0
                time.sleep(min(30, 5 * retry_count))
                continue

        try:
            start_time = time.time()

            # Generate E6 metrics
            e6_records = generate_all_e6_metrics(greptimedb, e6_database, ts)

            # Generate Kubernetes/OpenCost metrics using InfluxDB line protocol
            k8s_records = generate_all_k8s_metrics(greptimedb, k8s_database, timestamp_ms)

            duration = time.time() - start_time
            logger.info(f"Metrics generation complete. E6: {e6_records}, K8s: {k8s_records}, Duration: {duration:.2f}s")

        except Exception as e:
            logger.error(f"Error generating metrics: {e}")
            import traceback
            traceback.print_exc()
            e6_tables_created = False

        logger.info(f"Sleeping for {scrape_interval}s...")
        time.sleep(scrape_interval)


if __name__ == '__main__':
    main()
