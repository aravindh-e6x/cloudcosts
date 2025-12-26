"""Mock data exporter for CloudCosts dashboard."""

import argparse
import random
from datetime import datetime, timedelta
from pathlib import Path

import yaml

from db import GreptimeDB
from generator import (
    generate_nodes,
    generate_pods,
    assign_pods_to_nodes,
    generate_usage,
    generate_e6_metrics,
    select_idle_clusters,
)


def load_config(config_path: str) -> dict:
    """Load configuration from YAML file."""
    with open(config_path) as f:
        return yaml.safe_load(f)


def write_node_metrics(db: GreptimeDB, eks_cluster: str, node: dict, ts: datetime) -> None:
    """Write node-related metrics to database."""
    # node_total_hourly_cost
    db.insert('node_total_hourly_cost', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'instance_type': node['instance_type'],
        'region': node['region'],
        'value': node['hourly_cost'],
        'ts': ts,
    })

    # node_cpu_hourly_cost
    db.insert('node_cpu_hourly_cost', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'value': node['cpu_hourly_cost'],
        'ts': ts,
    })

    # node_ram_hourly_cost
    db.insert('node_ram_hourly_cost', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'value': node['ram_hourly_cost'],
        'ts': ts,
    })

    # kube_node_info
    db.insert('kube_node_info', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'kernel_version': '5.10.0-aws',
        'os_image': 'Amazon Linux 2',
        'container_runtime_version': 'containerd://1.6.6',
        'value': 1,
        'ts': ts,
    })

    # kube_node_status_allocatable (cpu)
    db.insert('kube_node_status_allocatable', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'resource': 'cpu',
        'value': node['cpu_allocatable'],
        'ts': ts,
    })

    # kube_node_status_allocatable (memory)
    db.insert('kube_node_status_allocatable', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'resource': 'memory',
        'value': node['memory_allocatable'],
        'ts': ts,
    })

    # kube_node_labels
    db.insert('kube_node_labels', {
        'eks_cluster': eks_cluster,
        'node': node['node'],
        'label_node_kubernetes_io_instance_type': node['instance_type'],
        'label_topology_kubernetes_io_region': node['region'],
        'label_topology_kubernetes_io_zone': f"{node['region']}a",
        'value': 1,
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
        'value': 1,
        'ts': ts,
    })

    db.insert('kube_pod_labels', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'label_component': pod['component'],
        'label_app': 'e6data',
        'value': 1,
        'ts': ts,
    })


def write_container_metrics(db: GreptimeDB, eks_cluster: str, pod: dict, usage: dict, ts: datetime) -> None:
    """Write container allocation and usage metrics."""
    db.insert('container_cpu_allocation', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'value': pod['cpu_request'],
        'ts': ts,
    })

    db.insert('container_memory_allocation_bytes', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'value': pod['memory_request'],
        'ts': ts,
    })

    db.insert('kube_pod_container_resource_requests', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'resource': 'cpu',
        'unit': 'core',
        'value': pod['cpu_request'],
        'ts': ts,
    })

    db.insert('kube_pod_container_resource_requests', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'resource': 'memory',
        'unit': 'byte',
        'value': pod['memory_request'],
        'ts': ts,
    })

    db.insert('container_cpu_usage_seconds_total', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'value': usage['cpu_usage'] * 300,  # 5 min interval
        'ts': ts,
    })

    db.insert('container_memory_working_set_bytes', {
        'eks_cluster': eks_cluster,
        'namespace': pod['namespace'],
        'pod': pod['pod'],
        'container': pod['container'],
        'node': pod['node'],
        'value': usage['memory_usage'],
        'ts': ts,
    })


def write_e6_metrics(db: GreptimeDB, e6_workspace: str, e6_cluster: str, metrics: dict, ts: datetime) -> None:
    """Write E6 gateway and engine metrics."""
    # Gateway metrics
    db.insert('io_e6x_E6Gateway_TotalQueriesCompletedCount', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': f'gateway-workspace-0',
        'component': 'gateway',
        'value': metrics['queries_completed'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_NumSucceededQueries', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': f'gateway-workspace-0',
        'component': 'gateway',
        'value': metrics['queries_succeeded'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_TotalQueriesFailedCount', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': f'gateway-workspace-0',
        'component': 'gateway',
        'value': metrics['queries_failed'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_CurrentQueriesRunningCount', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': f'gateway-workspace-0',
        'component': 'gateway',
        'value': metrics['queries_running'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Gateway_CurrentActiveConnections', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': 'workspace',
        'pod': f'gateway-workspace-0',
        'component': 'gateway',
        'value': metrics['active_connections'],
        'ts': ts,
    })

    # Engine metrics
    db.insert('io_e6x_E6Engine_CurrentActiveTasks', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'value': metrics['active_tasks'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_CurrentActiveTasksRunning', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'value': metrics['running_tasks'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_FilesReadFromS3Bytes', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'value': metrics['s3_bytes_read'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_TotalBytesRead', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'value': metrics['total_bytes_read'],
        'ts': ts,
    })

    db.insert('io_e6x_E6Engine_NumRowsRead', {
        'e6_cluster': e6_cluster,
        'e6_workspace': e6_workspace,
        'namespace': e6_cluster,
        'pod': f'executor-{e6_cluster}-0',
        'component': 'executor',
        'value': metrics['rows_read'],
        'ts': ts,
    })


def write_network_metrics(db: GreptimeDB, eks_cluster: str, namespace: str, pod: str, metrics: dict, ts: datetime) -> None:
    """Write network metrics."""
    db.insert('container_network_receive_bytes_total', {
        'eks_cluster': eks_cluster,
        'namespace': namespace,
        'pod': pod,
        'value': metrics['network_in'],
        'ts': ts,
    })

    db.insert('container_network_transmit_bytes_total', {
        'eks_cluster': eks_cluster,
        'namespace': namespace,
        'pod': pod,
        'value': metrics['network_out'],
        'ts': ts,
    })


def generate_all_data(config: dict) -> None:
    """Main data generation loop."""
    db_config = config['greptimedb']
    db_names = config['databases']

    # Create K8s database connection
    k8s_db = GreptimeDB(
        host=db_config['host'],
        port=db_config['port'],
        user=db_config['user'],
        password=db_config['password'],
        database=db_names['kubernetes'],
    )
    k8s_db.create_database()

    gen_config = config['generation']
    start_date = datetime.fromisoformat(gen_config['start_date'])
    end_date = datetime.fromisoformat(gen_config['end_date'])
    interval = timedelta(minutes=gen_config['interval_minutes'])

    # Track E6 database connections per customer
    e6_dbs: dict[str, GreptimeDB] = {}

    for workspace in config['workspaces']:
        workspace_name = workspace['name']
        eks_cluster = workspace['eks_cluster']
        region = workspace['region']
        e6_clusters = workspace['e6_clusters']

        # Create E6 database for this customer
        e6_db_name = f"{db_names['e6_prefix']}{workspace_name}"
        if workspace_name not in e6_dbs:
            e6_db = GreptimeDB(
                host=db_config['host'],
                port=db_config['port'],
                user=db_config['user'],
                password=db_config['password'],
                database=e6_db_name,
            )
            e6_db.create_database()
            e6_dbs[workspace_name] = e6_db

        e6_db = e6_dbs[workspace_name]

        print(f"Generating data for {eks_cluster} -> k8s:{db_names['kubernetes']}, e6:{e6_db_name}")

        # Generate static topology
        nodes = generate_nodes(workspace_name, region)
        pods = generate_pods(workspace_name, e6_clusters)
        assign_pods_to_nodes(pods, nodes)

        # Select idle clusters
        idle_clusters = select_idle_clusters(e6_clusters)
        if idle_clusters:
            print(f"  Idle clusters: {idle_clusters}")

        # Generate time-series data
        current = start_date
        data_points = 0

        while current <= end_date:
            # Node metrics -> kubernetes database
            for node in nodes:
                write_node_metrics(k8s_db, eks_cluster, node, current)

            # Pod/container metrics -> kubernetes database
            for pod in pods:
                e6_cluster = pod['namespace'] if pod['namespace'] != 'workspace' else None
                is_idle = e6_cluster in idle_clusters if e6_cluster else False
                query_rate = 0 if is_idle else random.randint(50, 200)

                usage = generate_usage(pod, current, query_rate)
                write_pod_metrics(k8s_db, eks_cluster, pod, current)
                write_container_metrics(k8s_db, eks_cluster, pod, usage, current)

            # E6 metrics -> e6_{customer} database
            for e6_cluster in e6_clusters:
                is_idle = e6_cluster in idle_clusters
                e6_metrics = generate_e6_metrics(e6_cluster, current, is_idle)
                write_e6_metrics(e6_db, workspace_name, e6_cluster, e6_metrics, current)

                # Network metrics -> kubernetes database
                write_network_metrics(
                    k8s_db, eks_cluster, e6_cluster,
                    f'executor-{e6_cluster}-0', e6_metrics, current
                )

            current += interval
            data_points += 1

            if data_points % 100 == 0:
                print(f"  Generated {data_points} data points...")

        print(f"  Completed: {data_points} data points for {eks_cluster}")

    # Close all connections
    k8s_db.close()
    for db in e6_dbs.values():
        db.close()

    print("Done!")


def main():
    parser = argparse.ArgumentParser(description='Generate mock data for CloudCosts dashboard')
    parser.add_argument('--config', '-c', default='config.yaml', help='Path to config file')
    args = parser.parse_args()

    config = load_config(args.config)
    generate_all_data(config)


if __name__ == '__main__':
    main()
