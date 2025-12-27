"""Base class for component metrics."""

from abc import ABC, abstractmethod
from prometheus_client import Gauge, Counter

from app.simulator.workload import WorkloadSimulator


class BaseMetrics(ABC):
    """Base class for E6 component metrics."""

    # Labels used by all E6 metrics
    LABELS = ["cluster", "workspace", "namespace", "pod", "component"]

    def __init__(
        self,
        cluster: str,
        workspace: str,
        namespace: str,
        pod: str,
        component: str,
        simulator: WorkloadSimulator,
    ):
        self.label_values = {
            "cluster": cluster,
            "workspace": workspace,
            "namespace": namespace,
            "pod": pod,
            "component": component,
        }
        self.simulator = simulator
        self._init_metrics()

    @abstractmethod
    def _init_metrics(self) -> None:
        """Initialize Prometheus metrics for this component."""
        pass

    @abstractmethod
    def update(self) -> None:
        """Update all metrics with current simulated values."""
        pass

    def _labels(self) -> list[str]:
        """Get label values in order."""
        return [self.label_values[k] for k in self.LABELS]
