"""Mock data exporter for CloudCosts dashboard."""

import argparse
import logging
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone

import yaml

from db import GreptimeDB
from generator import (
    generate_nodes,
    generate_pods,
    assign_pods_to_nodes,
    generate_usage,
    generate_e6_metrics,
    select_idle_clusters,
    calculate_allocation_factor,
)

# Configure logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    stream=sys.stdout,
)
log = logging.getLogger(__name__)

BACKFILL_DAYS = 30


def load_config(config_path: str) -> dict:
    """Load configuration from YAML file."""
    with open(config_path) as f:
        return yaml.safe_load(f)


def get_latest_timestamp(db: GreptimeDB, table: str) -> datetime | None:
    """Get the latest timestamp from a table."""
    try:
        conn = db.connect()
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT MAX(ts) as latest FROM {table}")
            result = cursor.fetchone()
            if result and result[0]:
                return result[0]
    except Exception:
        pass
    return None


def write_node_metrics(db: GreptimeDB, eks_cluster: str, node: dict, ts: datetime) -> None:
    """Write node-related metrics to database."""
    db.insert('node_total_hourly_cost', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'instance_type': node['instance_type'],
        'region': node['region'],
        'metric_value': node['hourly_cost'],
        'ts': ts,
    })

    db.insert('node_cpu_hourly_cost', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'metric_value': node['cpu_hourly_cost'],
        'ts': ts,
    })

    db.insert('node_ram_hourly_cost', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'metric_value': node['ram_hourly_cost'],
        'ts': ts,
    })

    db.insert('kube_node_info', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'kernel_version': '5.10.0-aws',
        'os_image': 'Amazon Linux 2',
        'container_runtime_version': 'containerd://1.6.6',
        'metric_value': 1,
        'ts': ts,
    })

    db.insert('kube_node_status_allocatable', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'resource_type': 'cpu',
        'metric_value': node['cpu_allocatable'],
        'ts': ts,
    })

    db.insert('kube_node_status_allocatable', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'resource_type': 'memory',
        'metric_value': node['memory_allocatable'],
        'ts': ts,
    })

    db.insert('kube_node_labels', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'label_node_kubernetes_io_instance_type': node['instance_type'],
        'label_topology_kubernetes_io_region': node['region'],
        'label_topology_kubernetes_io_zone': f"{node['region']}a",
        'metric_value': 1,
        'ts': ts,
    })


def write_pod_metrics(db: GreptimeDB, eks_cluster: str, pod: dict, ts: datetime) -> None:
    """Write pod info and labels."""
    db.insert('kube_pod_info', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'node': pod['node'],
        'created_by_kind': 'StatefulSet',
        'created_by_name': pod['component'],
        'metric_value': 1,
        'ts': ts,
    })

    db.insert('kube_pod_labels', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'label_component': pod['component'],
        'label_app': 'e6data',
        'metric_value': 1,
        'ts': ts,
    })


def write_container_metrics(db: GreptimeDB, eks_cluster: str, pod: dict, usage: dict, ts: datetime, alloc_factor: float = 1.0) -> None:
    """Write container allocation and usage metrics."""
    # Apply allocation factor to simulate varying allocation over time
    # Cast to float explicitly to ensure DOUBLE column type in GreptimeDB
    cpu_allocation = float(pod['cpu_request'] * alloc_factor)
    memory_allocation = float(pod['memory_request'] * alloc_factor)

    db.insert('container_cpu_allocation', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'metric_value': cpu_allocation,
        'ts': ts,
    })

    db.insert('container_memory_allocation_bytes', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'metric_value': memory_allocation,
        'ts': ts,
    })

    db.insert('kube_pod_container_resource_requests', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'resource_type': 'cpu',
        'unit': 'core',
        'metric_value': pod['cpu_request'],
        'ts': ts,
    })

    db.insert('kube_pod_container_resource_requests', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'resource_type': 'memory',
        'unit': 'byte',
        'metric_value': pod['memory_request'],
        'ts': ts,
    })

    db.insert('container_cpu_usage_seconds_total', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'metric_value': usage['cpu_usage'] * 300,  # 5 min interval
        'ts': ts,
    })

    db.insert('container_memory_working_set_bytes', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'metric_value': usage['memory_usage'],
        'ts': ts,
    })


def write_e6_metrics(db: GreptimeDB, e6_workspace: str, e6_cluster: str, metrics: dict, ts: datetime) -> None:
    """Write E6 gateway and engine metrics."""
    db.insert('io_e6x_E6Gateway_TotalQueriesCompletedCount', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': 'gateway-workspace-0',
        'component': 'gateway',
        'metric_value': metrics['queries_completed'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_NumSucceededQueries', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': 'gateway-workspace-0',
        'component': 'gateway',
        'metric_value': metrics['queries_succeeded'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_TotalQueriesFailedCount', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': 'gateway-workspace-0',
        'component': 'gateway',
        'metric_value': metrics['queries_failed'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_CurrentQueriesRunningCount', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': 'gateway-workspace-0',
        'component': 'gateway',
        'metric_value': metrics['queries_running'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_CurrentActiveConnections', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': 'gateway-workspace-0',
        'component': 'gateway',
        'metric_value': metrics['active_connections'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_CurrentActiveTasks', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'metric_value': metrics['active_tasks'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_CurrentActiveTasksRunning', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'metric_value': metrics['running_tasks'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_FilesReadFromS3Bytes', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'metric_value': metrics['s3_bytes_read'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_TotalBytesRead', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'metric_value': metrics['total_bytes_read'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_NumRowsRead', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'metric_value': metrics['rows_read'],
        'ts': ts,
    })


def write_network_metrics(db: GreptimeDB, eks_cluster: str, namespace: str, pod: str, metrics: dict, ts: datetime) -> None:
    """Write network metrics."""
    db.insert('container_network_receive_bytes_total', {
        'eks_cluster': eks_cluster,
        'namespace': namespace,
        'pod': pod,
        'metric_value': metrics['network_in'],
        'ts': ts,
    })

    db.insert('container_network_transmit_bytes_total', {
        'eks_cluster': eks_cluster,
        'namespace': namespace,
        'pod': pod,
        'metric_value': metrics['network_out'],
        'ts': ts,
    })


def generate_data_point(config: dict, k8s_db: GreptimeDB, e6_dbs: dict, workspaces_data: dict, ts: datetime) -> None:
    """Generate a single data point for all workspaces."""
    # Calculate allocation factor for this timestamp (varies over time)
    alloc_factor = calculate_allocation_factor(ts)

    for workspace in config['workspaces']:
        workspace_name = workspace['name']
        eks_cluster = workspace['eks_cluster']
        e6_clusters = workspace['e6_clusters']

        data = workspaces_data[workspace_name]
        nodes = data['nodes']
        pods = data['pods']
        idle_clusters = data['idle_clusters']
        e6_db = e6_dbs[workspace_name]

        # Node metrics -> kubernetes database
        for node in nodes:
            write_node_metrics(k8s_db, eks_cluster, node, ts)

        # Pod/container metrics -> kubernetes database
        for pod in pods:
            e6_cluster = pod['namespace'] if pod['namespace'] != 'workspace' else None
            is_idle = e6_cluster in idle_clusters if e6_cluster else False
            query_rate = 0 if is_idle else random.randint(50, 200)

            usage = generate_usage(pod, ts, query_rate)
            write_pod_metrics(k8s_db, eks_cluster, pod, ts)
            write_container_metrics(k8s_db, eks_cluster, pod, usage, ts, alloc_factor)

        # E6 metrics -> e6_{customer} database
        for e6_cluster in e6_clusters:
            is_idle = e6_cluster in idle_clusters
            e6_metrics = generate_e6_metrics(e6_cluster, ts, is_idle)
            write_e6_metrics(e6_db, workspace_name, e6_cluster, e6_metrics, ts)

            # Network metrics -> kubernetes database
            write_network_metrics(
                k8s_db, eks_cluster, e6_cluster,
                f'executor-{e6_cluster}-0', e6_metrics, ts
            )


def _precreate_tables(config: dict, k8s_db: GreptimeDB, e6_dbs: dict, workspaces_data: dict) -> None:
    """Pre-create all tables to ensure they exist before backfilling."""
    now = datetime.now(timezone.utc)

    for workspace in config['workspaces']:
        workspace_name = workspace['name']
        eks_cluster = workspace['eks_cluster']
        e6_clusters = workspace['e6_clusters']
        data = workspaces_data[workspace_name]
        nodes = data['nodes']
        pods = data['pods']
        e6_db = e6_dbs[workspace_name]

        # Create K8s tables
        for node in nodes[:1]:  # Just need one sample to create table schema
            k8s_db._create_table('node_total_hourly_cost', {
                'eks_cluster': eks_cluster, 'node': node['node'],
                'instance_type': node['instance_type'], 'region': node['region'],
                'metric_value': node['hourly_cost'], 'ts': now,
            })
            k8s_db._create_table('node_cpu_hourly_cost', {
                'eks_cluster': eks_cluster, 'node': node['node'],
                'metric_value': node['cpu_hourly_cost'], 'ts': now,
            })
            k8s_db._create_table('node_ram_hourly_cost', {
                'eks_cluster': eks_cluster, 'node': node['node'],
                'metric_value': node['ram_hourly_cost'], 'ts': now,
            })
            k8s_db._create_table('kube_node_info', {
                'eks_cluster': eks_cluster, 'node': node['node'],
                'kernel_version': '5.10.0-aws', 'os_image': 'Amazon Linux 2',
                'container_runtime_version': 'containerd://1.6.6',
                'metric_value': 1, 'ts': now,
            })
            k8s_db._create_table('kube_node_status_allocatable', {
                'eks_cluster': eks_cluster, 'node': node['node'],
                'resource_type': 'cpu', 'metric_value': node['cpu_allocatable'], 'ts': now,
            })
            k8s_db._create_table('kube_node_labels', {
                'eks_cluster': eks_cluster, 'node': node['node'],
                'label_node_kubernetes_io_instance_type': node['instance_type'],
                'label_topology_kubernetes_io_region': node['region'],
                'label_topology_kubernetes_io_zone': f"{node['region']}a",
                'metric_value': 1, 'ts': now,
            })

        for pod in pods[:1]:  # Just need one sample
            k8s_db._create_table('kube_pod_info', {
                'eks_cluster': eks_cluster, 'namespace': pod['namespace'],
                'pod': pod['pod'], 'node': pod['node'],
                'created_by_kind': 'StatefulSet', 'created_by_name': pod['component'],
                'metric_value': 1, 'ts': now,
            })
            k8s_db._create_table('kube_pod_labels', {
                'eks_cluster': eks_cluster, 'namespace': pod['namespace'],
                'pod': pod['pod'], 'label_component': pod['component'],
                'label_app': 'e6data', 'metric_value': 1, 'ts': now,
            })
            k8s_db._create_table('container_cpu_allocation', {
                'eks_cluster': eks_cluster, 'namespace': pod['namespace'],
                'pod': pod['pod'], 'container': pod['container'],
                'node': pod['node'], 'metric_value': pod['cpu_request'], 'ts': now,
            })
            k8s_db._create_table('container_memory_allocation_bytes', {
                'eks_cluster': eks_cluster, 'namespace': pod['namespace'],
                'pod': pod['pod'], 'container': pod['container'],
                'node': pod['node'], 'metric_value': pod['memory_request'], 'ts': now,
            })
            k8s_db._create_table('kube_pod_container_resource_requests', {
                'eks_cluster': eks_cluster, 'namespace': pod['namespace'],
                'pod': pod['pod'], 'container': pod['container'],
                'resource_type': 'cpu', 'unit': 'core',
                'metric_value': pod['cpu_request'], 'ts': now,
            })
            k8s_db._create_table('container_cpu_usage_seconds_total', {
                'eks_cluster': eks_cluster, 'namespace': pod['namespace'],
                'pod': pod['pod'], 'container': pod['container'],
                'node': pod['node'], 'metric_value': 0.0, 'ts': now,
            })
            k8s_db._create_table('container_memory_working_set_bytes', {
                'eks_cluster': eks_cluster, 'namespace': pod['namespace'],
                'pod': pod['pod'], 'container': pod['container'],
                'node': pod['node'], 'metric_value': 0.0, 'ts': now,
            })

        # Create E6 tables
        for e6_cluster in e6_clusters[:1]:  # Just need one sample
            e6_db._create_table('io_e6x_E6Gateway_TotalQueriesCompletedCount', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': 'workspace', 'pod': 'gateway-workspace-0',
                'component': 'gateway', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Gateway_NumSucceededQueries', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': 'workspace', 'pod': 'gateway-workspace-0',
                'component': 'gateway', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Gateway_TotalQueriesFailedCount', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': 'workspace', 'pod': 'gateway-workspace-0',
                'component': 'gateway', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Gateway_CurrentQueriesRunningCount', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': 'workspace', 'pod': 'gateway-workspace-0',
                'component': 'gateway', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Gateway_CurrentActiveConnections', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': 'workspace', 'pod': 'gateway-workspace-0',
                'component': 'gateway', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Engine_CurrentActiveTasks', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': e6_cluster, 'pod': f'executor-{e6_cluster}-0',
                'component': 'executor', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Engine_CurrentActiveTasksRunning', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': e6_cluster, 'pod': f'executor-{e6_cluster}-0',
                'component': 'executor', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Engine_FilesReadFromS3Bytes', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': e6_cluster, 'pod': f'executor-{e6_cluster}-0',
                'component': 'executor', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Engine_TotalBytesRead', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': e6_cluster, 'pod': f'executor-{e6_cluster}-0',
                'component': 'executor', 'metric_value': 0, 'ts': now,
            })
            e6_db._create_table('io_e6x_E6Engine_NumRowsRead', {
                'e6_cluster': e6_cluster, 'e6_workspace': workspace_name,
                'namespace': e6_cluster, 'pod': f'executor-{e6_cluster}-0',
                'component': 'executor', 'metric_value': 0, 'ts': now,
            })

        # Create network metrics tables
        k8s_db._create_table('container_network_receive_bytes_total', {
            'eks_cluster': eks_cluster, 'namespace': 'test',
            'pod': 'test-0', 'metric_value': 0, 'ts': now,
        })
        k8s_db._create_table('container_network_transmit_bytes_total', {
            'eks_cluster': eks_cluster, 'namespace': 'test',
            'pod': 'test-0', 'metric_value': 0, 'ts': now,
        })


def run_exporter(config: dict) -> None:
    """Main exporter loop."""
    db_config = config['greptimedb']
    db_names = config['databases']
    interval_minutes = config['generation']['interval_minutes']
    interval_seconds = interval_minutes * 60

    # Create K8s database connection
    k8s_db = GreptimeDB(
        host=db_config['host'],
        port=db_config['port'],
        user=db_config['user'],
        password=db_config['password'],
        database=db_names['kubernetes'],
    )
    k8s_db.create_database()

    # Create E6 database connections and generate topology
    e6_dbs: dict[str, GreptimeDB] = {}
    workspaces_data: dict[str, dict] = {}

    for workspace in config['workspaces']:
        workspace_name = workspace['name']
        region = workspace['region']
        e6_clusters = workspace['e6_clusters']

        # Create E6 database
        e6_db_name = f"{db_names['e6_prefix']}{workspace_name}"
        e6_db = GreptimeDB(
            host=db_config['host'],
            port=db_config['port'],
            user=db_config['user'],
            password=db_config['password'],
            database=e6_db_name,
        )
        e6_db.create_database()
        e6_dbs[workspace_name] = e6_db

        # Generate static topology
        # First generate pods to know how much CPU we need
        pods, total_cpu_needed = generate_pods(workspace_name, e6_clusters)
        # Add 50% headroom so packing is 40-80%, not 100%
        nodes = generate_nodes(workspace_name, region, int(total_cpu_needed * 1.5))
        assign_pods_to_nodes(pods, nodes)
        idle_clusters = select_idle_clusters(e6_clusters)

        workspaces_data[workspace_name] = {
            'nodes': nodes,
            'pods': pods,
            'idle_clusters': idle_clusters,
        }

        log.info(f"Initialized {workspace_name}: {len(nodes)} nodes, {len(pods)} pods")
        if idle_clusters:
            log.info(f"  Idle clusters: {idle_clusters}")

    # Pre-create all tables and wait for them to be ready
    log.info("Pre-creating all tables...")
    _precreate_tables(config, k8s_db, e6_dbs, workspaces_data)
    log.info("All tables created. Waiting 5s for GreptimeDB to sync...")
    time.sleep(5)

    # Check if backfill is needed
    latest_ts = get_latest_timestamp(k8s_db, 'node_total_hourly_cost')
    now = datetime.now(timezone.utc)
    backfill_start = now - timedelta(days=BACKFILL_DAYS)

    if latest_ts is None:
        log.info(f"No existing data found. Backfilling {BACKFILL_DAYS} days...")
        start_from = backfill_start
    elif latest_ts.replace(tzinfo=timezone.utc) < backfill_start:
        log.info(f"Data is older than {BACKFILL_DAYS} days. Backfilling from {backfill_start}...")
        start_from = backfill_start
    else:
        log.info(f"Latest data: {latest_ts}. Resuming from there...")
        start_from = latest_ts.replace(tzinfo=timezone.utc) + timedelta(minutes=interval_minutes)

    # Backfill if needed
    if start_from < now:
        log.info(f"Backfilling from {start_from} to {now}...")
        current = start_from
        count = 0
        while current < now:
            generate_data_point(config, k8s_db, e6_dbs, workspaces_data, current)
            current += timedelta(minutes=interval_minutes)
            count += 1
            if count % 100 == 0:
                log.info(f"Backfilled {count} data points...")
        log.info(f"Backfill complete: {count} data points")

    # Run continuously
    log.info(f"Starting continuous export every {interval_minutes} minutes...")
    while True:
        now = datetime.now(timezone.utc)
        log.info(f"Generating data point for {now.isoformat()}...")
        generate_data_point(config, k8s_db, e6_dbs, workspaces_data, now)
        log.debug(f"Done. Sleeping {interval_seconds}s...")
        time.sleep(interval_seconds)


def main():
    parser = argparse.ArgumentParser(description='Mock data exporter for CloudCosts dashboard')
    parser.add_argument('--config', '-c', default='config.yaml', help='Path to config file')
    args = parser.parse_args()

    config = load_config(args.config)
    run_exporter(config)


if __name__ == '__main__':
    main()
