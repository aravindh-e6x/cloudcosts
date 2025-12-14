#!/usr/bin/env python3
"""
POC Cost Exporter
Pulls capacity and workload data from Mimir via Grafana proxy and pushes structured data to GreptimeDB.
"""

import os
import sys
import time
import json
import yaml
import logging
import requests
from datetime import datetime, timezone
from collections import defaultdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('poc-cost-exporter')


class GrafanaClient:
    """Client to query Mimir via Grafana's datasource proxy."""

    def __init__(self, url: str, username: str, password: str):
        self.url = url.rstrip('/')
        self.auth = (username, password)
        self.session = requests.Session()
        self.session.auth = self.auth

    def query_instant(self, datasource_id: int, query: str) -> dict:
        """Execute an instant PromQL query."""
        url = f"{self.url}/api/datasources/proxy/{datasource_id}/api/v1/query"
        resp = self.session.get(url, params={'query': query}, timeout=60)
        resp.raise_for_status()
        return resp.json()


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

    def create_tables(self, database: str):
        """Create required tables if they don't exist."""
        tables = [
            """
            CREATE TABLE IF NOT EXISTS cluster_composition (
                ts TIMESTAMP TIME INDEX,
                e6cluster STRING,
                component STRING,
                pod_count INT,
                PRIMARY KEY (e6cluster, component)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS pod_specs (
                ts TIMESTAMP TIME INDEX,
                e6cluster STRING,
                component STRING,
                pod STRING,
                node STRING,
                cpu_cores DOUBLE,
                memory_gi DOUBLE,
                PRIMARY KEY (e6cluster, component, pod)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS node_packing (
                ts TIMESTAMP TIME INDEX,
                node STRING,
                pod_count INT,
                total_cpu_cores DOUBLE,
                total_memory_gi DOUBLE,
                PRIMARY KEY (node)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS resource_usage (
                ts TIMESTAMP TIME INDEX,
                e6cluster STRING,
                component STRING,
                pod STRING,
                cpu_used_cores DOUBLE,
                memory_used_gi DOUBLE,
                PRIMARY KEY (e6cluster, component, pod)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS query_metrics (
                ts TIMESTAMP TIME INDEX,
                e6cluster STRING,
                workspace STRING,
                query_count DOUBLE,
                PRIMARY KEY (e6cluster, workspace)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS workload_metrics (
                ts TIMESTAMP TIME INDEX,
                e6cluster STRING,
                component STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (e6cluster, component, metric_name)
            )
            """
        ]

        # Create database first
        self.execute_sql("public", f"CREATE DATABASE IF NOT EXISTS {database}")

        for table_sql in tables:
            result = self.execute_sql(database, table_sql)
            if result.get('error'):
                logger.warning(f"Table creation warning: {result.get('error')}")

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
                    formatted.append(f"'{v}'")
                elif v is None:
                    formatted.append("NULL")
                else:
                    formatted.append(str(v))
            values.append(f"({', '.join(formatted)})")

        sql = f"INSERT INTO {table} ({col_str}) VALUES {', '.join(values)}"
        result = self.execute_sql(database, sql)

        if result.get('error'):
            logger.error(f"Insert error: {result.get('error')}")
            return False
        return True


def collect_cluster_composition(grafana: GrafanaClient, datasource_id: int) -> list:
    """Collect pod counts per cluster per component."""
    query = 'count by (cluster, component) (e6data_container_requests{resource="cpu"})'
    result = grafana.query_instant(datasource_id, query)

    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    for series in result.get('data', {}).get('result', []):
        metric = series.get('metric', {})
        value = series.get('value', [0, 0])
        rows.append((
            ts,
            metric.get('cluster', 'unknown'),
            metric.get('component', 'unknown'),
            int(float(value[1]))
        ))

    return rows


def collect_pod_specs(grafana: GrafanaClient, datasource_id: int) -> list:
    """Collect pod specifications (CPU/memory requests)."""
    query = 'e6data_container_requests'
    result = grafana.query_instant(datasource_id, query)

    # Group by pod to combine CPU and memory
    pods = defaultdict(dict)
    for series in result.get('data', {}).get('result', []):
        metric = series.get('metric', {})
        value = float(series.get('value', [0, 0])[1])

        pod_key = metric.get('pod', 'unknown')
        pods[pod_key]['cluster'] = metric.get('cluster', 'unknown')
        pods[pod_key]['component'] = metric.get('component', 'unknown')
        pods[pod_key]['node'] = metric.get('node', 'unknown')

        resource = metric.get('resource', '')
        if resource == 'cpu':
            pods[pod_key]['cpu'] = value
        elif resource == 'memory':
            pods[pod_key]['memory'] = value / (1024 * 1024 * 1024)  # Convert to Gi

    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    for pod, info in pods.items():
        rows.append((
            ts,
            info.get('cluster', 'unknown'),
            info.get('component', 'unknown'),
            pod,
            info.get('node', 'unknown'),
            info.get('cpu', 0),
            round(info.get('memory', 0), 2)
        ))

    return rows


def collect_node_packing(grafana: GrafanaClient, datasource_id: int) -> list:
    """Collect node packing information."""
    # Get pod count per node
    count_query = 'count by (node) (e6data_container_requests{resource="cpu"})'
    count_result = grafana.query_instant(datasource_id, count_query)

    # Get total CPU per node
    cpu_query = 'sum by (node) (e6data_container_requests{resource="cpu"})'
    cpu_result = grafana.query_instant(datasource_id, cpu_query)

    # Get total memory per node
    mem_query = 'sum by (node) (e6data_container_requests{resource="memory"})'
    mem_result = grafana.query_instant(datasource_id, mem_query)

    # Combine results
    nodes = defaultdict(lambda: {'pod_count': 0, 'cpu': 0, 'memory': 0})

    for series in count_result.get('data', {}).get('result', []):
        node = series.get('metric', {}).get('node', 'unknown')
        nodes[node]['pod_count'] = int(float(series.get('value', [0, 0])[1]))

    for series in cpu_result.get('data', {}).get('result', []):
        node = series.get('metric', {}).get('node', 'unknown')
        nodes[node]['cpu'] = float(series.get('value', [0, 0])[1])

    for series in mem_result.get('data', {}).get('result', []):
        node = series.get('metric', {}).get('node', 'unknown')
        nodes[node]['memory'] = float(series.get('value', [0, 0])[1]) / (1024 * 1024 * 1024)

    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    for node, info in nodes.items():
        if node and node != 'unknown':
            rows.append((
                ts,
                node,
                info['pod_count'],
                info['cpu'],
                round(info['memory'], 2)
            ))

    return rows


def collect_resource_usage(grafana: GrafanaClient, datasource_id: int) -> list:
    """Collect actual resource usage."""
    # CPU usage rate over 5 minutes
    cpu_query = 'sum by (cluster, component, pod) (rate(e6data_container_cpu_usage_seconds_total[5m]))'
    cpu_result = grafana.query_instant(datasource_id, cpu_query)

    # Memory usage
    mem_query = 'sum by (cluster, component, pod) (e6data_container_memory_usage_bytes)'
    mem_result = grafana.query_instant(datasource_id, mem_query)

    # Combine results
    pods = defaultdict(lambda: {'cpu': 0, 'memory': 0})

    for series in cpu_result.get('data', {}).get('result', []):
        metric = series.get('metric', {})
        key = (metric.get('cluster', ''), metric.get('component', ''), metric.get('pod', ''))
        pods[key]['cluster'] = metric.get('cluster', 'unknown')
        pods[key]['component'] = metric.get('component', 'unknown')
        pods[key]['pod'] = metric.get('pod', 'unknown')
        pods[key]['cpu'] = float(series.get('value', [0, 0])[1])

    for series in mem_result.get('data', {}).get('result', []):
        metric = series.get('metric', {})
        key = (metric.get('cluster', ''), metric.get('component', ''), metric.get('pod', ''))
        pods[key]['cluster'] = metric.get('cluster', 'unknown')
        pods[key]['component'] = metric.get('component', 'unknown')
        pods[key]['pod'] = metric.get('pod', 'unknown')
        pods[key]['memory'] = float(series.get('value', [0, 0])[1]) / (1024 * 1024 * 1024)

    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    for key, info in pods.items():
        if info.get('pod'):
            rows.append((
                ts,
                info.get('cluster', 'unknown'),
                info.get('component', 'unknown'),
                info.get('pod', 'unknown'),
                round(info.get('cpu', 0), 4),
                round(info.get('memory', 0), 2)
            ))

    return rows


def collect_query_metrics(grafana: GrafanaClient, datasource_id: int) -> list:
    """Collect query volume metrics."""
    query = 'sum by (cluster, workspace) (increase(io_e6x_E6Gateway_QueryCount_total[5m]))'
    result = grafana.query_instant(datasource_id, query)

    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    for series in result.get('data', {}).get('result', []):
        metric = series.get('metric', {})
        value = float(series.get('value', [0, 0])[1])
        if value > 0:
            rows.append((
                ts,
                metric.get('cluster', 'unknown'),
                metric.get('workspace', 'unknown'),
                round(value, 2)
            ))

    return rows


def collect_workload_metrics(grafana: GrafanaClient, datasource_id: int) -> list:
    """Collect workload metrics from HAProxy and Flask."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    # HAProxy backend metrics
    haproxy_queries = [
        ('haproxy_sessions', 'sum by (cluster) (haproxy_backend_sessions_total)'),
        ('haproxy_responses', 'sum by (cluster) (haproxy_backend_http_responses_total)'),
        ('haproxy_active_servers', 'sum by (cluster) (haproxy_backend_active_servers)'),
        ('haproxy_current_sessions', 'sum by (cluster) (haproxy_backend_current_sessions)'),
    ]

    for metric_name, query in haproxy_queries:
        try:
            result = grafana.query_instant(datasource_id, query)
            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                rows.append((
                    ts,
                    metric.get('cluster', 'unknown'),
                    'haproxy',
                    metric_name,
                    round(value, 2)
                ))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    # Flask HTTP request metrics
    flask_queries = [
        ('flask_requests_total', 'sum by (cluster) (flask_http_request_total)'),
        ('flask_request_duration_sum', 'sum by (cluster) (flask_http_request_duration_seconds_sum)'),
        ('flask_request_count', 'sum by (cluster) (flask_http_request_duration_seconds_count)'),
    ]

    for metric_name, query in flask_queries:
        try:
            result = grafana.query_instant(datasource_id, query)
            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                rows.append((
                    ts,
                    metric.get('cluster', 'unknown'),
                    'flask',
                    metric_name,
                    round(value, 2)
                ))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    # Cluster uptime (max per cluster to avoid duplicates)
    try:
        result = grafana.query_instant(datasource_id, 'max by (cluster) (e6data_cluster_uptime)')
        for series in result.get('data', {}).get('result', []):
            metric = series.get('metric', {})
            value = float(series.get('value', [0, 0])[1])
            rows.append((
                ts,
                metric.get('cluster', 'unknown'),
                'cluster',
                'uptime_seconds',
                round(value, 2)
            ))
    except Exception as e:
        logger.warning(f"Error collecting cluster_uptime: {e}")

    return rows


def scrape_customer(grafana: GrafanaClient, greptimedb: GreptimeDBClient, customer: dict):
    """Scrape capacity data for a single customer."""
    name = customer['name']
    datasource_id = customer['datasourceId']
    database = customer['database']

    logger.info(f"[{name}] Starting capacity data collection from datasource {datasource_id}")

    # Create tables if needed
    greptimedb.create_tables(database)

    # Collect and write cluster composition
    try:
        rows = collect_cluster_composition(grafana, datasource_id)
        if rows:
            greptimedb.insert_rows(database, 'cluster_composition',
                ['ts', 'e6cluster', 'component', 'pod_count'], rows)
            logger.info(f"[{name}] Wrote {len(rows)} cluster_composition rows")
    except Exception as e:
        logger.error(f"[{name}] Error collecting cluster_composition: {e}")

    # Collect and write pod specs
    try:
        rows = collect_pod_specs(grafana, datasource_id)
        if rows:
            greptimedb.insert_rows(database, 'pod_specs',
                ['ts', 'e6cluster', 'component', 'pod', 'node', 'cpu_cores', 'memory_gi'], rows)
            logger.info(f"[{name}] Wrote {len(rows)} pod_specs rows")
    except Exception as e:
        logger.error(f"[{name}] Error collecting pod_specs: {e}")

    # Collect and write node packing
    try:
        rows = collect_node_packing(grafana, datasource_id)
        if rows:
            greptimedb.insert_rows(database, 'node_packing',
                ['ts', 'node', 'pod_count', 'total_cpu_cores', 'total_memory_gi'], rows)
            logger.info(f"[{name}] Wrote {len(rows)} node_packing rows")
    except Exception as e:
        logger.error(f"[{name}] Error collecting node_packing: {e}")

    # Collect and write resource usage
    try:
        rows = collect_resource_usage(grafana, datasource_id)
        if rows:
            greptimedb.insert_rows(database, 'resource_usage',
                ['ts', 'e6cluster', 'component', 'pod', 'cpu_used_cores', 'memory_used_gi'], rows)
            logger.info(f"[{name}] Wrote {len(rows)} resource_usage rows")
    except Exception as e:
        logger.error(f"[{name}] Error collecting resource_usage: {e}")

    # Collect and write query metrics
    try:
        rows = collect_query_metrics(grafana, datasource_id)
        if rows:
            greptimedb.insert_rows(database, 'query_metrics',
                ['ts', 'e6cluster', 'workspace', 'query_count'], rows)
            logger.info(f"[{name}] Wrote {len(rows)} query_metrics rows")
    except Exception as e:
        logger.error(f"[{name}] Error collecting query_metrics: {e}")

    # Collect and write workload metrics (HAProxy, Flask, etc.)
    try:
        rows = collect_workload_metrics(grafana, datasource_id)
        if rows:
            greptimedb.insert_rows(database, 'workload_metrics',
                ['ts', 'e6cluster', 'component', 'metric_name', 'metric_value'], rows)
            logger.info(f"[{name}] Wrote {len(rows)} workload_metrics rows")
    except Exception as e:
        logger.error(f"[{name}] Error collecting workload_metrics: {e}")

    logger.info(f"[{name}] Capacity data collection complete")


def load_config() -> dict:
    """Load configuration from file or environment."""
    config_path = os.environ.get('CONFIG_PATH', '/app/config.yaml')

    if os.path.exists(config_path):
        with open(config_path) as f:
            config = yaml.safe_load(f)
            logger.info(f"Loaded config from {config_path}")
            return config

    logger.info("Loading config from environment variables")
    return {
        'grafana': {
            'url': os.environ.get('GRAFANA_URL', 'https://grafana.e6.run'),
            'username': os.environ.get('GRAFANA_USERNAME', ''),
            'password': os.environ.get('GRAFANA_PASSWORD', ''),
        },
        'greptimedb': {
            'url': os.environ.get('GREPTIMEDB_URL', ''),
            'username': os.environ.get('GREPTIMEDB_USERNAME', 'e6data'),
            'password': os.environ.get('GREPTIMEDB_PASSWORD', 'cloudcosts'),
        },
        'customers': json.loads(os.environ.get('CUSTOMERS', '[]'))
    }


def main():
    logger.info("POC Cost Exporter starting...")

    config = load_config()

    grafana = GrafanaClient(
        url=config['grafana']['url'],
        username=config['grafana']['username'],
        password=config['grafana']['password']
    )

    greptimedb = GreptimeDBClient(
        url=config['greptimedb']['url'],
        username=config['greptimedb']['username'],
        password=config['greptimedb']['password']
    )

    customers = config.get('customers', [])
    if not customers:
        logger.error("No customers configured")
        sys.exit(1)

    logger.info(f"Configured {len(customers)} customer(s): {[c['name'] for c in customers]}")

    while True:
        for customer in customers:
            try:
                scrape_customer(grafana, greptimedb, customer)
            except Exception as e:
                logger.error(f"[{customer['name']}] Scrape failed: {e}")

        min_interval = min(c.get('scrapeInterval', 300) for c in customers)
        logger.info(f"Sleeping for {min_interval}s...")
        time.sleep(min_interval)


if __name__ == '__main__':
    main()
