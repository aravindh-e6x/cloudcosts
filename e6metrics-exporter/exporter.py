#!/usr/bin/env python3
"""
E6 Metrics Exporter
Pulls e6data metrics from Mimir via Grafana proxy and pushes to GreptimeDB.
Collects all io_e6x_* and e6data_* metrics.
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
logger = logging.getLogger('e6metrics-exporter')


class GrafanaClient:
    """Client to query Mimir via Grafana's datasource proxy."""

    def __init__(self, url: str, username: str, password: str):
        self.url = url.rstrip('/')
        self.auth = (username, password)
        self.session = requests.Session()
        self.session.auth = self.auth

    def get_metric_names(self, datasource_id: int) -> list:
        """Get all available metric names."""
        url = f"{self.url}/api/datasources/proxy/{datasource_id}/api/v1/label/__name__/values"
        resp = self.session.get(url, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data.get('data', [])

    def query_instant(self, datasource_id: int, query: str) -> dict:
        """Execute an instant PromQL query."""
        url = f"{self.url}/api/datasources/proxy/{datasource_id}/api/v1/query"
        resp = self.session.get(url, params={'query': query}, timeout=120)
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

    def create_database(self, database: str):
        """Create database if not exists."""
        self.execute_sql("public", f"CREATE DATABASE IF NOT EXISTS {database}")

    def create_metrics_tables(self, database: str):
        """Create required tables for e6 metrics."""
        tables = [
            # E6 Engine metrics
            """
            CREATE TABLE IF NOT EXISTS e6_engine_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            # E6 Gateway metrics
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
            # E6 Queue metrics
            """
            CREATE TABLE IF NOT EXISTS e6_queue_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            # E6 Executor metrics
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
            # E6 Schema metrics
            """
            CREATE TABLE IF NOT EXISTS e6_schema_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            # E6 Storage metrics
            """
            CREATE TABLE IF NOT EXISTS e6_storage_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            # E6 Container metrics
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
            # E6 Cluster metrics
            """
            CREATE TABLE IF NOT EXISTS e6_cluster_metrics (
                ts TIMESTAMP TIME INDEX,
                cluster_name STRING,
                metric_name STRING,
                metric_value DOUBLE,
                PRIMARY KEY (cluster_name, metric_name)
            )
            """,
            # Generic metrics table for any other io_e6x metrics
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

        self.create_database(database)
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
                    # Escape single quotes
                    v = v.replace("'", "''")
                    formatted.append(f"'{v}'")
                elif v is None:
                    formatted.append("NULL")
                else:
                    formatted.append(str(v))
            values.append(f"({', '.join(formatted)})")

        # Batch inserts to avoid too large queries
        batch_size = 100
        for i in range(0, len(values), batch_size):
            batch = values[i:i+batch_size]
            sql = f"INSERT INTO {table} ({col_str}) VALUES {', '.join(batch)}"
            result = self.execute_sql(database, sql)
            if result.get('error'):
                logger.error(f"Insert error: {result.get('error')}")
                return False
        return True


def collect_e6_engine_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect io_e6x_E6Engine_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    engine_metrics = [m for m in metrics if m.startswith('io_e6x_E6Engine_')]
    logger.info(f"Collecting {len(engine_metrics)} E6Engine metrics")

    for metric_name in engine_metrics:
        try:
            query = f'sum by (cluster) ({metric_name})'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')

                rows.append((ts, cluster, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_e6_gateway_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect io_e6x_E6Gateway_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    gateway_metrics = [m for m in metrics if m.startswith('io_e6x_E6Gateway_')]
    logger.info(f"Collecting {len(gateway_metrics)} E6Gateway metrics")

    for metric_name in gateway_metrics:
        try:
            query = f'sum by (cluster, workspace) ({metric_name})'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')
                workspace = metric.get('workspace', 'default')

                rows.append((ts, cluster, workspace, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_e6_queue_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect io_e6x_E6Queue_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    queue_metrics = [m for m in metrics if m.startswith('io_e6x_E6Queue_')]
    logger.info(f"Collecting {len(queue_metrics)} E6Queue metrics")

    for metric_name in queue_metrics:
        try:
            query = f'sum by (cluster) ({metric_name})'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')

                rows.append((ts, cluster, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_e6_executor_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect io_e6x_E6xecutor_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    executor_metrics = [m for m in metrics if m.startswith('io_e6x_E6xecutor_')]
    logger.info(f"Collecting {len(executor_metrics)} E6xecutor metrics")

    for metric_name in executor_metrics:
        try:
            query = f'sum by (cluster, component, pod) ({metric_name})'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')
                component = metric.get('component', 'executor')
                pod = metric.get('pod', 'unknown')

                rows.append((ts, cluster, component, pod, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_e6_schema_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect io_e6x_E6Schema_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    schema_metrics = [m for m in metrics if m.startswith('io_e6x_E6Schema_')]
    logger.info(f"Collecting {len(schema_metrics)} E6Schema metrics")

    for metric_name in schema_metrics:
        try:
            query = f'sum by (cluster) ({metric_name})'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')

                rows.append((ts, cluster, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_e6_storage_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect io_e6x_E6Storage_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    storage_metrics = [m for m in metrics if m.startswith('io_e6x_E6Storage_')]
    logger.info(f"Collecting {len(storage_metrics)} E6Storage metrics")

    for metric_name in storage_metrics:
        try:
            query = f'sum by (cluster) ({metric_name})'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')

                rows.append((ts, cluster, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_e6_container_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect e6data_container_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    container_metrics = [m for m in metrics if m.startswith('e6data_container_')]
    logger.info(f"Collecting {len(container_metrics)} e6data_container metrics")

    for metric_name in container_metrics:
        try:
            query = f'{metric_name}'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')
                component = metric.get('component', 'unknown')
                pod = metric.get('pod', 'unknown')
                container = metric.get('container', 'unknown')
                node = metric.get('node', 'unknown')
                resource = metric.get('resource', '')

                rows.append((ts, cluster, component, pod, container, node, resource, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_e6_cluster_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect e6data_cluster_* and e6data_component_* metrics."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    cluster_metrics = [m for m in metrics if m.startswith('e6data_cluster_') or m.startswith('e6data_component_')]
    logger.info(f"Collecting {len(cluster_metrics)} e6data_cluster/component metrics")

    for metric_name in cluster_metrics:
        try:
            query = f'sum by (cluster) ({metric_name})'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')

                rows.append((ts, cluster, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def collect_other_io_e6x_metrics(grafana: GrafanaClient, datasource_id: int, metrics: list) -> list:
    """Collect remaining io_e6x_* metrics not covered by specific collectors."""
    rows = []
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

    # Patterns already handled by specific collectors
    handled_prefixes = [
        'io_e6x_E6Engine_',
        'io_e6x_E6Gateway_',
        'io_e6x_E6Queue_',
        'io_e6x_E6xecutor_',
        'io_e6x_E6Schema_',
        'io_e6x_E6Storage_',
    ]

    other_metrics = [m for m in metrics if m.startswith('io_e6x_') and not any(m.startswith(p) for p in handled_prefixes)]
    logger.info(f"Collecting {len(other_metrics)} other io_e6x metrics")

    for metric_name in other_metrics:
        try:
            query = f'{metric_name}'
            result = grafana.query_instant(datasource_id, query)

            for series in result.get('data', {}).get('result', []):
                metric = series.get('metric', {})
                value = float(series.get('value', [0, 0])[1])
                cluster = metric.get('cluster', 'unknown')

                # Serialize remaining labels
                labels = {k: v for k, v in metric.items() if k not in ['__name__', 'cluster']}
                labels_str = json.dumps(labels) if labels else '{}'

                rows.append((ts, cluster, labels_str, metric_name, round(value, 4)))
        except Exception as e:
            logger.warning(f"Error collecting {metric_name}: {e}")

    return rows


def push_heartbeat(greptimedb: GreptimeDBClient, database: str, customer_name: str,
                   status: str, records_collected: int, duration: float):
    """Push exporter heartbeat metric."""
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    timestamp_epoch = int(datetime.now(timezone.utc).timestamp())

    # Create heartbeat table if not exists
    greptimedb.execute_sql(database, """
        CREATE TABLE IF NOT EXISTS exporter_heartbeat (
            ts TIMESTAMP TIME INDEX,
            exporter STRING,
            customer STRING,
            status STRING,
            records_collected DOUBLE,
            duration_seconds DOUBLE,
            PRIMARY KEY (exporter, customer)
        )
    """)

    # Insert heartbeat
    greptimedb.insert_rows(
        database,
        'exporter_heartbeat',
        ['ts', 'exporter', 'customer', 'status', 'records_collected', 'duration_seconds'],
        [(ts, 'e6metrics-exporter', customer_name, status, records_collected, round(duration, 2))]
    )
    logger.info(f"[{customer_name}] Pushed heartbeat: status={status}, records={records_collected}, duration={duration:.2f}s")


def scrape_customer(grafana: GrafanaClient, greptimedb: GreptimeDBClient, customer: dict):
    """Scrape all e6 metrics for a single customer."""
    name = customer['name']
    datasource_id = customer['datasourceId']
    database = customer['database']

    start_time = time.time()
    status = 'success'
    total_records = 0

    logger.info(f"[{name}] Starting e6 metrics collection from datasource {datasource_id}")

    # Create tables if needed
    greptimedb.create_metrics_tables(database)

    # Get all available metrics
    try:
        all_metrics = grafana.get_metric_names(datasource_id)
        logger.info(f"[{name}] Found {len(all_metrics)} total metrics")

        # Filter to only e6 metrics
        e6_metrics = [m for m in all_metrics if m.startswith('io_e6x_') or m.startswith('e6data_')]
        logger.info(f"[{name}] Found {len(e6_metrics)} e6 metrics to collect")
    except Exception as e:
        logger.error(f"[{name}] Failed to get metric names: {e}")
        return

    # Collect E6 Engine metrics
    try:
        rows = collect_e6_engine_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_engine_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_engine_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_engine_metrics: {e}")

    # Collect E6 Gateway metrics
    try:
        rows = collect_e6_gateway_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_gateway_metrics',
                ['ts', 'cluster_name', 'workspace', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_gateway_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_gateway_metrics: {e}")

    # Collect E6 Queue metrics
    try:
        rows = collect_e6_queue_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_queue_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_queue_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_queue_metrics: {e}")

    # Collect E6 Executor metrics
    try:
        rows = collect_e6_executor_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_executor_metrics',
                ['ts', 'cluster_name', 'component', 'pod', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_executor_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_executor_metrics: {e}")

    # Collect E6 Schema metrics
    try:
        rows = collect_e6_schema_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_schema_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_schema_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_schema_metrics: {e}")

    # Collect E6 Storage metrics
    try:
        rows = collect_e6_storage_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_storage_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_storage_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_storage_metrics: {e}")

    # Collect E6 Container metrics
    try:
        rows = collect_e6_container_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_container_metrics',
                ['ts', 'cluster_name', 'component', 'pod', 'container', 'node', 'resource_type', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_container_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_container_metrics: {e}")

    # Collect E6 Cluster metrics
    try:
        rows = collect_e6_cluster_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_cluster_metrics',
                ['ts', 'cluster_name', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_cluster_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_cluster_metrics: {e}")

    # Collect other io_e6x metrics
    try:
        rows = collect_other_io_e6x_metrics(grafana, datasource_id, e6_metrics)
        if rows:
            greptimedb.insert_rows(database, 'e6_generic_metrics',
                ['ts', 'cluster_name', 'labels', 'metric_name', 'metric_value'], rows)
            total_records += len(rows)
            logger.info(f"[{name}] Wrote {len(rows)} e6_generic_metrics rows")
    except Exception as e:
        status = 'partial'
        logger.error(f"[{name}] Error collecting e6_generic_metrics: {e}")

    # Push heartbeat
    duration = time.time() - start_time
    try:
        push_heartbeat(greptimedb, database, name, status, total_records, duration)
    except Exception as e:
        logger.warning(f"[{name}] Failed to push heartbeat: {e}")

    logger.info(f"[{name}] E6 metrics collection complete")


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
    logger.info("E6 Metrics Exporter starting...")

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
