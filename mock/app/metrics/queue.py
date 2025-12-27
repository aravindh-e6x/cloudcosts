"""Queue component metrics (io_e6x_e6queue_*)."""

from prometheus_client import Gauge, Counter
from .base import BaseMetrics


class QueueMetrics(BaseMetrics):
    """Metrics for E6 Queue component."""

    def _init_metrics(self) -> None:
        # Request/task gauges
        self.active_requests = Gauge(
            "io_e6x_e6queue_currentactiverequests",
            "Current active requests",
            self.LABELS,
        )
        self.active_tasks = Gauge(
            "io_e6x_e6queue_currentactivetasks",
            "Current active tasks",
            self.LABELS,
        )
        self.active_splits = Gauge(
            "io_e6x_e6queue_currentactivesplits",
            "Current active splits",
            self.LABELS,
        )
        self.num_tasks = Gauge(
            "io_e6x_e6queue_currentnumtasks",
            "Current number of tasks",
            self.LABELS,
        )

        # Task state gauges
        self.tasks_running = Gauge(
            "io_e6x_e6queue_currentactivetasksrunning",
            "Current running tasks",
            self.LABELS,
        )
        self.tasks_new = Gauge(
            "io_e6x_e6queue_currentactivetasksnew",
            "Current new tasks",
            self.LABELS,
        )
        self.tasks_succeeded = Gauge(
            "io_e6x_e6queue_currentactivetaskssucceeded",
            "Current succeeded tasks",
            self.LABELS,
        )
        self.tasks_failed = Gauge(
            "io_e6x_e6queue_currentactivetasksfailed",
            "Current failed tasks",
            self.LABELS,
        )
        self.tasks_cancelled = Gauge(
            "io_e6x_e6queue_currentactivetaskscancelled",
            "Current cancelled tasks",
            self.LABELS,
        )
        self.tasks_aborted = Gauge(
            "io_e6x_e6queue_currentactivetasksaborted",
            "Current aborted tasks",
            self.LABELS,
        )
        self.tasks_created = Gauge(
            "io_e6x_e6queue_currentactivetaskscreated",
            "Current created tasks",
            self.LABELS,
        )
        self.max_completed_requests = Gauge(
            "io_e6x_e6queue_maxcompletede6requests",
            "Max completed E6 requests",
            self.LABELS,
        )

        # Counters
        self.requests_succeeded = Counter(
            "io_e6x_e6queue_nume6requestssucceeded",
            "Total succeeded requests",
            self.LABELS,
        )
        self.requests_failed = Counter(
            "io_e6x_e6queue_nume6requestsfailed",
            "Total failed requests",
            self.LABELS,
        )
        self.requests_completed = Counter(
            "io_e6x_e6queue_numcompletede6requests",
            "Total completed requests",
            self.LABELS,
        )

        # Uptime and threads
        self.uptime = Gauge(
            "io_e6x_e6queue_uptime",
            "Queue uptime in milliseconds",
            self.LABELS,
        )
        self.blocked_threads = Gauge(
            "io_e6x_e6queue_numblockedthreads",
            "Number of blocked threads",
            self.LABELS,
        )
        self.deadlocked_threads = Gauge(
            "io_e6x_e6queue_numdeadlockedthreads",
            "Number of deadlocked threads",
            self.LABELS,
        )

    def update(self) -> None:
        labels = self._labels()

        # Request/task gauges
        self.active_requests.labels(*labels).set(self.simulator.queue_active_requests())
        self.active_tasks.labels(*labels).set(self.simulator.queue_active_tasks())
        self.active_splits.labels(*labels).set(self.simulator.queue_active_tasks() * 2)
        self.num_tasks.labels(*labels).set(self.simulator.queue_active_tasks())

        # Task states
        active = self.simulator.queue_active_tasks()
        self.tasks_running.labels(*labels).set(int(active * 0.6))
        self.tasks_new.labels(*labels).set(int(active * 0.2))
        self.tasks_succeeded.labels(*labels).set(0)
        self.tasks_failed.labels(*labels).set(0)
        self.tasks_cancelled.labels(*labels).set(0)
        self.tasks_aborted.labels(*labels).set(0)
        self.tasks_created.labels(*labels).set(int(active * 1.2))
        self.max_completed_requests.labels(*labels).set(1000)

        # Counters
        succeeded = self.simulator.queue_requests_per_interval()
        self.requests_succeeded.labels(*labels).inc(succeeded)
        self.requests_completed.labels(*labels).inc(succeeded)
        self.requests_failed.labels(*labels).inc(int(succeeded * 0.02))

        # Uptime and threads
        self.uptime.labels(*labels).set(self.simulator.get_uptime_ms())
        self.blocked_threads.labels(*labels).set(0)
        self.deadlocked_threads.labels(*labels).set(0)
