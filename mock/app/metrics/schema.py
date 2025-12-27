"""Schema component metrics (io_e6x_e6schema_*)."""

from prometheus_client import Gauge, Counter
from .base import BaseMetrics


class SchemaMetrics(BaseMetrics):
    """Metrics for E6 Schema component - all metrics from METRICS.md."""

    def _init_metrics(self) -> None:
        # ========== TABLE LISTING TASKS ==========
        self.table_listing_success = Counter(
            "io_e6x_e6schema_numtablelistingtaskssuccess",
            "Successful table listing tasks",
            self.LABELS,
        )
        self.table_listing_failed = Counter(
            "io_e6x_e6schema_numtablelistingtasksfailed",
            "Failed table listing tasks",
            self.LABELS,
        )
        self.table_listing_queued = Gauge(
            "io_e6x_e6schema_numtablelistingtasksqueued",
            "Queued table listing tasks",
            self.LABELS,
        )
        self.table_listing_in_progress = Gauge(
            "io_e6x_e6schema_numtablelistingtasksinprogress",
            "In-progress table listing tasks",
            self.LABELS,
        )

        # ========== TABLE METADATA READ TASKS ==========
        self.metadata_success = Counter(
            "io_e6x_e6schema_numtablemetadatareadtaskssuccess",
            "Successful metadata read tasks",
            self.LABELS,
        )
        self.metadata_failed = Counter(
            "io_e6x_e6schema_numtablemetadatareadtasksfailed",
            "Failed metadata read tasks",
            self.LABELS,
        )
        self.metadata_queued = Gauge(
            "io_e6x_e6schema_numtablemetadatareadtasksqueued",
            "Queued metadata read tasks",
            self.LABELS,
        )
        self.metadata_in_progress = Gauge(
            "io_e6x_e6schema_numtablemetadatareadtasksinprogress",
            "In-progress metadata read tasks",
            self.LABELS,
        )

        # ========== TABLE METADATA READ INNER TASKS ==========
        self.metadata_inner_success = Counter(
            "io_e6x_e6schema_numtablemetadatareadinnertaskssuccess",
            "Successful metadata inner tasks",
            self.LABELS,
        )
        self.metadata_inner_failed = Counter(
            "io_e6x_e6schema_numtablemetadatareadinnertasksfailed",
            "Failed metadata inner tasks",
            self.LABELS,
        )
        self.metadata_inner_queued = Gauge(
            "io_e6x_e6schema_numtablemetadatareadinnertasksqueued",
            "Queued metadata inner tasks",
            self.LABELS,
        )
        self.metadata_inner_in_progress = Gauge(
            "io_e6x_e6schema_numtablemetadatareadinnertasksinprogress",
            "In-progress metadata inner tasks",
            self.LABELS,
        )

        # ========== PARTITION LISTING TASKS ==========
        self.partition_listing_success = Counter(
            "io_e6x_e6schema_nummultiplepartitionlistingtaskssuccess",
            "Successful partition listing tasks",
            self.LABELS,
        )
        self.partition_listing_failed = Counter(
            "io_e6x_e6schema_nummultiplepartitionlistingtasksfailed",
            "Failed partition listing tasks",
            self.LABELS,
        )
        self.partition_listing_queued = Gauge(
            "io_e6x_e6schema_nummultiplepartitionlistingtasksqueued",
            "Queued partition listing tasks",
            self.LABELS,
        )
        self.partition_listing_in_progress = Gauge(
            "io_e6x_e6schema_nummultiplepartitionlistingtasksinprogress",
            "In-progress partition listing tasks",
            self.LABELS,
        )

        # ========== TABLE PARTITIONS READ TASKS ==========
        self.partitions_read_success = Counter(
            "io_e6x_e6schema_tablepartitionsreadtaskssuccess",
            "Successful partition read tasks",
            self.LABELS,
        )
        self.partitions_read_failed = Counter(
            "io_e6x_e6schema_tablepartitionsreadtasksfailed",
            "Failed partition read tasks",
            self.LABELS,
        )
        self.partitions_read_queued = Gauge(
            "io_e6x_e6schema_tablepartitionsreadtasksqueued",
            "Queued partition read tasks",
            self.LABELS,
        )
        self.partitions_read_in_progress = Gauge(
            "io_e6x_e6schema_tablepartitionsreadtasksinprogress",
            "In-progress partition read tasks",
            self.LABELS,
        )

        # ========== TABLE STATS READ TASKS ==========
        self.stats_read_success = Counter(
            "io_e6x_e6schema_tablestatsreadtaskssuccess",
            "Successful stats read tasks",
            self.LABELS,
        )
        self.stats_read_failed = Counter(
            "io_e6x_e6schema_tablestatsreadtasksfailed",
            "Failed stats read tasks",
            self.LABELS,
        )
        self.stats_read_queued = Gauge(
            "io_e6x_e6schema_tablestatsreadtasksqueued",
            "Queued stats read tasks",
            self.LABELS,
        )
        self.stats_read_in_progress = Gauge(
            "io_e6x_e6schema_tablestatsreadtasksinprogress",
            "In-progress stats read tasks",
            self.LABELS,
        )

        # ========== THRIFT REQUESTS ==========
        self.thrift_queued = Gauge(
            "io_e6x_e6schema_numthriftrequestsqueued",
            "Queued Thrift requests",
            self.LABELS,
        )
        self.thrift_in_progress = Gauge(
            "io_e6x_e6schema_numthriftrequestsinprogress",
            "In-progress Thrift requests",
            self.LABELS,
        )

        # ========== UPTIME ==========
        self.uptime = Gauge(
            "io_e6x_e6schema_uptime",
            "Schema service uptime in milliseconds",
            self.LABELS,
        )

    def update(self) -> None:
        labels = self._labels()
        tasks = self.simulator.schema_tasks()
        tf = self.simulator.get_time_factor()

        # Table listing
        self.table_listing_success.labels(*labels).inc(tasks["listing_success"])
        self.table_listing_failed.labels(*labels).inc(tasks["listing_failed"])
        self.table_listing_queued.labels(*labels).set(tasks["listing_queued"])
        self.table_listing_in_progress.labels(*labels).set(int(tasks["listing_queued"] * 0.5))

        # Metadata
        self.metadata_success.labels(*labels).inc(tasks["metadata_success"])
        self.metadata_failed.labels(*labels).inc(tasks["metadata_failed"])
        self.metadata_queued.labels(*labels).set(int(tasks["listing_queued"] * 2))
        self.metadata_in_progress.labels(*labels).set(int(tasks["listing_queued"]))

        # Metadata inner tasks
        self.metadata_inner_success.labels(*labels).inc(int(tasks["metadata_success"] * 3))
        self.metadata_inner_failed.labels(*labels).inc(int(tasks["metadata_failed"] * 0.5))
        self.metadata_inner_queued.labels(*labels).set(int(tasks["listing_queued"] * 1.5))
        self.metadata_inner_in_progress.labels(*labels).set(int(tasks["listing_queued"] * 0.8))

        # Partition listing
        self.partition_listing_success.labels(*labels).inc(int(tasks["listing_success"] * 3))
        self.partition_listing_failed.labels(*labels).inc(int(tasks["listing_failed"] * 0.2))
        self.partition_listing_queued.labels(*labels).set(int(tasks["listing_queued"]))
        self.partition_listing_in_progress.labels(*labels).set(int(tasks["listing_queued"] * 0.6))

        # Partitions read tasks
        self.partitions_read_success.labels(*labels).inc(int(tasks["listing_success"] * 5))
        self.partitions_read_failed.labels(*labels).inc(int(tasks["listing_failed"] * 0.1))
        self.partitions_read_queued.labels(*labels).set(int(tf * 5))
        self.partitions_read_in_progress.labels(*labels).set(int(tf * 3))

        # Stats read tasks
        self.stats_read_success.labels(*labels).inc(int(tasks["listing_success"] * 2))
        self.stats_read_failed.labels(*labels).inc(0)
        self.stats_read_queued.labels(*labels).set(int(tf * 2))
        self.stats_read_in_progress.labels(*labels).set(int(tf * 1))

        # Thrift
        self.thrift_queued.labels(*labels).set(tasks["thrift_queued"])
        self.thrift_in_progress.labels(*labels).set(int(tasks["thrift_queued"] * 0.5))

        # Uptime
        self.uptime.labels(*labels).set(self.simulator.get_uptime_ms())
