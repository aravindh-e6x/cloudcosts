"""Prometheus metrics for mock E6 components."""

from .gateway import GatewayMetrics
from .executor import ExecutorMetrics
from .queue import QueueMetrics
from .schema import SchemaMetrics
from .storage import StorageMetrics

COMPONENT_METRICS = {
    "gateway": GatewayMetrics,
    "executor": ExecutorMetrics,
    "queue": QueueMetrics,
    "schema": SchemaMetrics,
    "storage": StorageMetrics,
    # Aliases
    "planner": ExecutorMetrics,  # Planner uses similar metrics
}

__all__ = [
    "GatewayMetrics",
    "ExecutorMetrics",
    "QueueMetrics",
    "SchemaMetrics",
    "StorageMetrics",
    "COMPONENT_METRICS",
]
