"""Gateway component metrics (io_e6x_e6gateway_*)."""

from prometheus_client import Gauge, Counter
from .base import BaseMetrics


class GatewayMetrics(BaseMetrics):
    """Metrics for E6 Gateway component."""

    def _init_metrics(self) -> None:
        # Gauges (current state)
        self.active_connections = Gauge(
            "io_e6x_e6gateway_currentactiveconnections",
            "Current active connections to gateway",
            self.LABELS,
        )
        self.queries_running = Gauge(
            "io_e6x_e6gateway_currentqueriesrunningcount",
            "Number of queries currently running",
            self.LABELS,
        )
        self.queries_queued = Gauge(
            "io_e6x_e6gateway_currentqueriesqueuedcount",
            "Number of queries currently queued",
            self.LABELS,
        )
        self.uptime = Gauge(
            "io_e6x_e6gateway_uptime",
            "Gateway uptime in milliseconds",
            self.LABELS,
        )
        self.blocked_threads = Gauge(
            "io_e6x_e6gateway_numblockedthreads",
            "Number of blocked threads",
            self.LABELS,
        )
        self.deadlocked_threads = Gauge(
            "io_e6x_e6gateway_numdeadlockedthreads",
            "Number of deadlocked threads",
            self.LABELS,
        )

        # Counters (cumulative)
        self.queries_succeeded = Counter(
            "io_e6x_e6gateway_numsucceededqueries",
            "Total number of succeeded queries",
            self.LABELS,
        )
        self.queries_completed = Counter(
            "io_e6x_e6gateway_totalqueriescompletedcount",
            "Total number of completed queries",
            self.LABELS,
        )
        self.queries_failed = Counter(
            "io_e6x_e6gateway_totalqueriesfailedcount",
            "Total number of failed queries",
            self.LABELS,
        )
        self.queries_created = Counter(
            "io_e6x_e6gateway_totalqueriescreatedcount",
            "Total number of created queries",
            self.LABELS,
        )
        self.queued_queries_created = Counter(
            "io_e6x_e6gateway_queuedqueriescreatedcount",
            "Total queued queries created",
            self.LABELS,
        )
        self.queued_queries_resumed = Counter(
            "io_e6x_e6gateway_queuedqueriesresumedcount",
            "Total queued queries resumed",
            self.LABELS,
        )

    def update(self) -> None:
        labels = self._labels()

        # Update gauges
        self.active_connections.labels(*labels).set(
            self.simulator.gateway_active_connections()
        )
        self.queries_running.labels(*labels).set(
            self.simulator.gateway_queries_running()
        )
        self.queries_queued.labels(*labels).set(
            max(0, self.simulator.gateway_queries_running() - 2)
        )
        self.uptime.labels(*labels).set(self.simulator.get_uptime_ms())
        self.blocked_threads.labels(*labels).set(0)
        self.deadlocked_threads.labels(*labels).set(0)

        # Update counters
        query_stats = self.simulator.gateway_queries_per_interval()
        self.queries_succeeded.labels(*labels).inc(query_stats["succeeded"])
        self.queries_completed.labels(*labels).inc(query_stats["total"])
        self.queries_failed.labels(*labels).inc(query_stats["failed"])
        self.queries_created.labels(*labels).inc(query_stats["total"])

        # Queued query metrics
        queued = max(0, self.simulator.gateway_queries_running() - 2)
        if queued > 0:
            self.queued_queries_created.labels(*labels).inc(int(queued * 0.3))
            self.queued_queries_resumed.labels(*labels).inc(int(queued * 0.25))
