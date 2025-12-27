"""Storage component metrics (io_e6x_e6storage_*)."""

from prometheus_client import Gauge, Counter
from .base import BaseMetrics


class StorageMetrics(BaseMetrics):
    """Metrics for E6 Storage component."""

    def _init_metrics(self) -> None:
        # Cache metrics
        self.file_metadata_cache_size = Gauge(
            "io_e6x_e6storage_filemetadatacachesize",
            "File metadata cache size in bytes",
            self.LABELS,
        )
        self.avg_file_metadata_size = Gauge(
            "io_e6x_e6storage_avgfilemetadatasize",
            "Average file metadata size in bytes",
            self.LABELS,
        )

        # Request metrics
        self.thrift_queued = Gauge(
            "io_e6x_e6storage_numthriftrequestsqueued",
            "Queued Thrift requests",
            self.LABELS,
        )
        self.thrift_in_progress = Gauge(
            "io_e6x_e6storage_numthriftrequestsinprogress",
            "In-progress Thrift requests",
            self.LABELS,
        )
        self.metadata_requests_in_progress = Gauge(
            "io_e6x_e6storage_tablemetadatarequestsinprogress",
            "In-progress table metadata requests",
            self.LABELS,
        )
        self.partition_requests_in_progress = Gauge(
            "io_e6x_e6storage_tablepartitionsrequestsinprogress",
            "In-progress table partitions requests",
            self.LABELS,
        )
        self.stats_requests_in_progress = Gauge(
            "io_e6x_e6storage_tablestatisticsrequestsinprogress",
            "In-progress table statistics requests",
            self.LABELS,
        )
        self.partition_file_metadata_in_progress = Gauge(
            "io_e6x_e6storage_tablepartitionfileandmetadatarequestsinprogress",
            "In-progress partition file and metadata requests",
            self.LABELS,
        )

        # Listing tasks
        self.listing_in_progress = Gauge(
            "io_e6x_e6storage_numpartfileandmetadatalistingtasksinprogress",
            "In-progress listing tasks",
            self.LABELS,
        )
        self.listing_queued = Gauge(
            "io_e6x_e6storage_numpartfileandmetadatalistingtasksinqueue",
            "Queued listing tasks",
            self.LABELS,
        )

        # Thread metrics
        self.blocked_threads = Gauge(
            "io_e6x_e6storage_numblockedthreads",
            "Number of blocked threads",
            self.LABELS,
        )
        self.deadlocked_threads = Gauge(
            "io_e6x_e6storage_numdeadlockedthreads",
            "Number of deadlocked threads",
            self.LABELS,
        )

        # Uptime
        self.uptime = Gauge(
            "io_e6x_e6storage_uptime",
            "Storage service uptime in milliseconds",
            self.LABELS,
        )

    def update(self) -> None:
        labels = self._labels()
        stats = self.simulator.storage_stats()

        # Cache metrics
        self.file_metadata_cache_size.labels(*labels).set(stats["cache_size"])
        self.avg_file_metadata_size.labels(*labels).set(stats["avg_metadata_size"])

        # Request metrics
        self.thrift_queued.labels(*labels).set(stats["thrift_queued"])
        self.thrift_in_progress.labels(*labels).set(int(stats["thrift_queued"] * 0.5))
        self.metadata_requests_in_progress.labels(*labels).set(stats["requests_in_progress"])
        self.partition_requests_in_progress.labels(*labels).set(int(stats["requests_in_progress"] * 0.8))
        self.stats_requests_in_progress.labels(*labels).set(int(stats["requests_in_progress"] * 0.3))
        self.partition_file_metadata_in_progress.labels(*labels).set(int(stats["requests_in_progress"] * 0.6))

        # Listing tasks
        self.listing_in_progress.labels(*labels).set(int(stats["requests_in_progress"] * 0.5))
        self.listing_queued.labels(*labels).set(int(stats["thrift_queued"]))

        # Thread metrics
        self.blocked_threads.labels(*labels).set(0)
        self.deadlocked_threads.labels(*labels).set(0)

        # Uptime
        self.uptime.labels(*labels).set(self.simulator.get_uptime_ms())
