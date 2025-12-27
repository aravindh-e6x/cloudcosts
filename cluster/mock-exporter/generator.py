"""Mock data generation logic."""

import math
import random
from datetime import datetime
from typing import Any

from constants import (
    GB,
    MB,
    INSTANCE_SPECS,
    COMPONENT_SPECS,
    BASE_UTILIZATION,
)


def generate_nodes(workspace_name: str, region: str, min_cpu_needed: int = 0) -> list[dict[str, Any]]:
    """Generate nodes with enough capacity for pods.

    Creates 4-8 nodes with larger instance types to ensure good packing.
    """
    # Use larger instances to ensure pods fit
    instance_types = ['m5.4xlarge', 'r5.2xlarge', 'm5.2xlarge']
    node_count = random.randint(4, 8)

    # Ensure we have enough CPU for pods
    total_cpu = 0
    nodes = []
    i = 0
    while total_cpu < min_cpu_needed or i < node_count:
        instance_type = random.choice(instance_types)
        spec = INSTANCE_SPECS[instance_type]

        nodes.append({
            'node': f'{workspace_name}-node-{i}',
            'instance_type': instance_type,
            'region': region,
            'cpu_allocatable': spec['cpu'],
            'memory_allocatable': spec['memory'],
            'hourly_cost': spec['cost'],
            'cpu_hourly_cost': spec['cpu_cost'],
            'ram_hourly_cost': spec['ram_cost'],
        })
        total_cpu += spec['cpu']
        i += 1

    return nodes


def generate_pods(workspace_name: str, e6_clusters: list[str]) -> tuple[list[dict[str, Any]], int]:
    """Generate pods for workspace and e6 cluster components.

    Returns (pods, total_cpu_needed) so nodes can be sized appropriately.
    """
    pods = []

    # Workspace-level components (namespace: "workspace")
    gateway_count = min(2, max(1, len(e6_clusters)))
    pods += _create_component_pods(workspace_name, 'workspace', 'gateway', gateway_count)
    pods += _create_component_pods(workspace_name, 'workspace', 'schema', 1)
    pods += _create_component_pods(workspace_name, 'workspace', 'storage', 1)

    # E6 cluster-level components (namespace: e6_cluster name)
    # Reduce executor count to ensure packing is 40-80%
    for e6_cluster in e6_clusters:
        pods += _create_component_pods(workspace_name, e6_cluster, 'executor', random.randint(2, 4))
        pods += _create_component_pods(workspace_name, e6_cluster, 'queue', 1)
        pods += _create_component_pods(workspace_name, e6_cluster, 'planner', 1)

    # Calculate total CPU needed
    total_cpu = sum(p['cpu_request'] for p in pods)

    return pods, total_cpu


def _create_component_pods(workspace: str, namespace: str, component: str, count: int) -> list[dict[str, Any]]:
    """Create pods for a specific component."""
    spec = COMPONENT_SPECS[component]

    return [{
        'pod': f'{component}-{namespace}-{i}',
        'namespace': namespace,
        'component': component,
        'container': component,
        'cpu_request': spec['cpu_request'],
        'memory_request': spec['memory_request'],
        'node': None,  # Assigned later by bin packing
    } for i in range(count)]


def assign_pods_to_nodes(pods: list[dict[str, Any]], nodes: list[dict[str, Any]]) -> None:
    """Simple first-fit bin packing algorithm."""
    node_remaining = {
        node['node']: {
            'cpu': node['cpu_allocatable'],
            'memory': node['memory_allocatable'],
        }
        for node in nodes
    }

    sorted_pods = sorted(pods, key=lambda p: p['cpu_request'] + p['memory_request'] / GB, reverse=True)

    for pod in sorted_pods:
        for node in nodes:
            remaining = node_remaining[node['node']]
            if remaining['cpu'] >= pod['cpu_request'] and remaining['memory'] >= pod['memory_request']:
                pod['node'] = node['node']
                remaining['cpu'] -= pod['cpu_request']
                remaining['memory'] -= pod['memory_request']
                break

        if pod['node'] is None:
            pod['node'] = random.choice(nodes)['node']


def generate_usage(pod: dict[str, Any], timestamp: datetime, query_rate: int) -> dict[str, float]:
    """Generate CPU/memory usage based on time and query rate."""
    component = pod['component']
    base_util = BASE_UTILIZATION.copy()

    if component == 'executor':
        base_util['executor'] = 0.30 + (query_rate / 200) * 0.50

    hour = timestamp.hour
    minute = timestamp.minute
    # Time-based variation: peaks at 10am-2pm, low at night
    time_factor = 0.5 + 0.5 * math.sin((hour - 6) * math.pi / 12)
    # Add minute-level noise for variation in time series
    minute_noise = 0.9 + 0.2 * math.sin(minute * math.pi / 30)
    random_noise = random.uniform(0.90, 1.10)
    utilization = min(0.95, base_util[component] * time_factor * minute_noise * random_noise)

    return {
        'cpu_usage': pod['cpu_request'] * utilization,
        'memory_usage': pod['memory_request'] * utilization,
    }


def calculate_allocation_factor(timestamp: datetime) -> float:
    """Calculate allocation factor that varies over time for realistic packing.

    Returns a factor between 0.85 and 1.0 that varies by hour.
    This simulates pods being scaled up/down over time.
    """
    hour = timestamp.hour
    minute = timestamp.minute
    # Base variation by hour: more pods during business hours
    hour_factor = 0.85 + 0.15 * math.sin((hour - 6) * math.pi / 12)
    # Small minute-level variation
    minute_factor = 0.97 + 0.03 * math.sin(minute * math.pi / 30)
    return hour_factor * minute_factor


def generate_e6_metrics(e6_cluster: str, timestamp: datetime, is_idle: bool = False) -> dict[str, Any]:
    """Generate E6 gateway and engine metrics."""
    if is_idle:
        return {
            'queries_completed': 0,
            'queries_succeeded': 0,
            'queries_failed': 0,
            'queries_running': 0,
            'active_connections': random.randint(0, 2),
            'active_tasks': 0,
            'running_tasks': 0,
            's3_bytes_read': 0,
            'total_bytes_read': 0,
            'rows_read': 0,
            'network_in': 0,
            'network_out': 0,
        }

    hour = timestamp.hour
    time_factor = 0.3 + 0.7 * math.sin((hour - 6) * math.pi / 12)
    base_rate = random.randint(50, 200)
    queries_per_hour = int(base_rate * time_factor)

    return {
        'queries_completed': queries_per_hour,
        'queries_succeeded': int(queries_per_hour * random.uniform(0.96, 0.99)),
        'queries_failed': int(queries_per_hour * random.uniform(0.01, 0.04)),
        'queries_running': random.randint(1, max(1, queries_per_hour // 20)),
        'active_connections': random.randint(10, 50),
        'active_tasks': random.randint(5, 30),
        'running_tasks': random.randint(3, 20),
        's3_bytes_read': queries_per_hour * random.randint(50, 200) * MB,
        'total_bytes_read': queries_per_hour * random.randint(100, 400) * MB,
        'rows_read': queries_per_hour * random.randint(1_000_000, 10_000_000),
        'network_in': queries_per_hour * random.randint(20, 100) * MB,
        'network_out': queries_per_hour * random.randint(10, 50) * MB,
    }


def select_idle_clusters(e6_clusters: list[str]) -> set[str]:
    """Randomly select 1 cluster to be idle (for Gaps detection testing)."""
    if len(e6_clusters) <= 1:
        return set()

    if random.random() < 0.3:
        return {random.choice(e6_clusters)}

    return set()
