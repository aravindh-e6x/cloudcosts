"""Executor/Engine component metrics (io_e6x_e6engine_* and io_e6x_e6xecutor_*)."""

from prometheus_client import Gauge, Counter
from .base import BaseMetrics


class ExecutorMetrics(BaseMetrics):
    """Metrics for E6 Executor/Engine component - all metrics from METRICS.md."""

    def _init_metrics(self) -> None:
        # ========== TASK METRICS ==========
        self.active_tasks = Gauge(
            "io_e6x_e6engine_currentactivetasks",
            "Current active tasks",
            self.LABELS,
        )
        self.running_tasks = Gauge(
            "io_e6x_e6engine_currentactivetasksrunning",
            "Current running tasks",
            self.LABELS,
        )
        self.new_tasks = Gauge(
            "io_e6x_e6engine_currentactivetasksnew",
            "Current new tasks",
            self.LABELS,
        )
        self.succeeded_tasks = Gauge(
            "io_e6x_e6engine_currentactivetaskssucceeded",
            "Current succeeded tasks",
            self.LABELS,
        )
        self.failed_tasks = Gauge(
            "io_e6x_e6engine_currentactivetasksfailed",
            "Current failed tasks",
            self.LABELS,
        )
        self.aborted_tasks = Gauge(
            "io_e6x_e6engine_currentactivetasksaborted",
            "Current aborted tasks",
            self.LABELS,
        )
        self.cancelled_tasks = Gauge(
            "io_e6x_e6engine_currentactivetaskscancelled",
            "Current cancelled tasks",
            self.LABELS,
        )
        self.tasks_run = Counter(
            "io_e6x_e6engine_tasksrun",
            "Total tasks run",
            self.LABELS,
        )
        self.task_cumulative_time = Counter(
            "io_e6x_e6engine_taskcumulativetimenanos",
            "Cumulative task time in nanoseconds",
            self.LABELS,
        )

        # ========== CONNECTIONS ==========
        self.active_connections = Gauge(
            "io_e6x_e6engine_currentactivee6connections",
            "Current active E6 connections",
            self.LABELS,
        )
        self.succeeded_requests = Counter(
            "io_e6x_e6engine_succeededrequestscount",
            "Total succeeded requests",
            self.LABELS,
        )

        # ========== MEMORY METRICS ==========
        self.executor_allocated_memory = Gauge(
            "io_e6x_e6engine_currentexecutorallocatedmemorybytes",
            "Executor allocated memory in bytes",
            self.LABELS,
        )
        self.executor_used_memory = Gauge(
            "io_e6x_e6engine_currentexecutorusedmemorybytes",
            "Executor used memory in bytes",
            self.LABELS,
        )
        self.executor_occupied_memory = Gauge(
            "io_e6x_e6engine_currentexecutoroccupiedmemorybytes",
            "Executor occupied memory in bytes",
            self.LABELS,
        )
        self.dynamic_rss = Gauge(
            "io_e6x_e6engine_currentdynamicrssbytes",
            "Current dynamic RSS bytes",
            self.LABELS,
        )
        self.free_rss = Gauge(
            "io_e6x_e6engine_currentfreerssbytes",
            "Current free RSS bytes",
            self.LABELS,
        )
        self.static_rss = Gauge(
            "io_e6x_e6engine_currentstaticrssbytes",
            "Current static RSS bytes",
            self.LABELS,
        )
        self.total_rss = Gauge(
            "io_e6x_e6engine_currenttotalrssbytes",
            "Current total RSS bytes",
            self.LABELS,
        )
        self.mmap_pinned = Gauge(
            "io_e6x_e6engine_currentmmappinnedbytes",
            "Current mmap pinned bytes",
            self.LABELS,
        )
        self.mmap_rss = Gauge(
            "io_e6x_e6engine_currentmmaprssbytes",
            "Current mmap RSS bytes",
            self.LABELS,
        )

        # ========== MEMCACHE METRICS ==========
        self.memcache_available_slots = Gauge(
            "io_e6x_e6engine_currentmemcacheavailableslots",
            "Current memcache available slots",
            self.LABELS,
        )
        self.memcache_memory = Gauge(
            "io_e6x_e6engine_currentmemcachememorybytes",
            "Current memcache memory bytes",
            self.LABELS,
        )
        self.memcache_occupied_slots = Gauge(
            "io_e6x_e6engine_currentmemcacheoccupiedslots",
            "Current memcache occupied slots",
            self.LABELS,
        )
        self.memcache_pinned_slots = Gauge(
            "io_e6x_e6engine_currentmemcachepinnedslots",
            "Current memcache pinned slots",
            self.LABELS,
        )
        self.memcache_reclaimed_slots = Gauge(
            "io_e6x_e6engine_currentmemcachereclaimedslots",
            "Current memcache reclaimed slots",
            self.LABELS,
        )
        self.memcache_read_waiters = Gauge(
            "io_e6x_e6engine_currentnumberofmemcachecachereadwaiters",
            "Current number of memcache cache read waiters",
            self.LABELS,
        )

        # ========== PARQUET CACHE METRICS ==========
        self.parquet_cache_file_count = Gauge(
            "io_e6x_e6engine_currentparquetcachefilecount",
            "Current parquet cache file count",
            self.LABELS,
        )
        self.parquet_cache_size = Gauge(
            "io_e6x_e6engine_currentparquetcachefilesizebytes",
            "Current parquet cache file size bytes",
            self.LABELS,
        )

        # ========== FILE METRICS ==========
        self.avg_file_size = Gauge(
            "io_e6x_e6engine_avgfilesizeinbytes",
            "Average file size in bytes",
            self.LABELS,
        )
        self.files_open = Gauge(
            "io_e6x_e6engine_currentnumberoffilesopen",
            "Current number of files open",
            self.LABELS,
        )
        self.num_files_open = Gauge(
            "io_e6x_e6engine_numfilesopen",
            "Number of files open",
            self.LABELS,
        )
        self.num_files_read = Counter(
            "io_e6x_e6engine_numfilesread",
            "Number of files read",
            self.LABELS,
        )
        self.num_files_read_sync = Counter(
            "io_e6x_e6engine_numfilesreadsync",
            "Number of files read synchronously",
            self.LABELS,
        )

        # ========== DATA READ METRICS ==========
        self.files_read_s3 = Counter(
            "io_e6x_e6engine_filesreadfroms3bytes",
            "Total bytes read from S3",
            self.LABELS,
        )
        self.files_read_s3_compressed = Counter(
            "io_e6x_e6engine_filesreadfroms3compressed",
            "Total compressed bytes read from S3",
            self.LABELS,
        )
        self.files_read_cache = Counter(
            "io_e6x_e6engine_filesreadfromcachebytes",
            "Total bytes read from cache",
            self.LABELS,
        )
        self.total_bytes_read = Counter(
            "io_e6x_e6engine_totalbytesread",
            "Total bytes read",
            self.LABELS,
        )
        self.rows_read = Counter(
            "io_e6x_e6engine_numrowsread",
            "Total rows read",
            self.LABELS,
        )
        self.columns_read = Counter(
            "io_e6x_e6engine_numcolumnsread",
            "Total columns read",
            self.LABELS,
        )

        # ========== COLUMN SPLIT METRICS ==========
        self.columnsplit_cache_bytes = Counter(
            "io_e6x_e6engine_columnsplitfilesreadfromcachebytes",
            "Column split bytes read from cache",
            self.LABELS,
        )
        self.columnsplit_s3_bytes = Counter(
            "io_e6x_e6engine_columnsplitfilesreadfroms3bytes",
            "Column split bytes read from S3",
            self.LABELS,
        )
        self.columnsplit_s3_compressed = Counter(
            "io_e6x_e6engine_columnsplitfilesreadfroms3compressed",
            "Column split compressed bytes read from S3",
            self.LABELS,
        )

        # ========== READER METRICS ==========
        self.num_cache_readers = Gauge(
            "io_e6x_e6engine_numcachereaders",
            "Number of cache readers",
            self.LABELS,
        )
        self.num_s3_readers = Gauge(
            "io_e6x_e6engine_nums3readers",
            "Number of S3 readers",
            self.LABELS,
        )

        # ========== SPILL METRICS ==========
        self.spill_writers = Gauge(
            "io_e6x_e6engine_currentspillwriters",
            "Current spill writers",
            self.LABELS,
        )
        self.spilled_bytes_read = Counter(
            "io_e6x_e6engine_numspilledbytesread",
            "Total spilled bytes read from disk",
            self.LABELS,
        )
        self.spilled_bytes_written = Counter(
            "io_e6x_e6engine_numspilledbyteswritten",
            "Total spilled bytes written to disk",
            self.LABELS,
        )
        self.spilled_pages_read = Counter(
            "io_e6x_e6engine_numspilledpagesread",
            "Total spilled pages read",
            self.LABELS,
        )
        self.spilled_pages_written = Counter(
            "io_e6x_e6engine_numspilledpageswritten",
            "Total spilled pages written",
            self.LABELS,
        )
        self.spilled_page_compressed = Counter(
            "io_e6x_e6engine_spilledpagecompressedbytes",
            "Spilled page compressed bytes",
            self.LABELS,
        )
        self.spilled_page_uncompressed = Counter(
            "io_e6x_e6engine_spilledpageuncompressedbytes",
            "Spilled page uncompressed bytes",
            self.LABELS,
        )

        # ========== DISK CACHE METRICS ==========
        self.disk_cache_hit = Counter(
            "io_e6x_e6engine_diskcachegethitbytes",
            "Disk cache hit bytes",
            self.LABELS,
        )
        self.disk_cache_miss = Counter(
            "io_e6x_e6engine_diskcachegetmissbytes",
            "Disk cache miss bytes",
            self.LABELS,
        )
        self.disk_cache_get_time = Counter(
            "io_e6x_e6engine_diskcachegettimenanos",
            "Disk cache get time in nanoseconds",
            self.LABELS,
        )
        self.disk_cache_max_space = Gauge(
            "io_e6x_e6engine_diskcachemaxspacebytes",
            "Disk cache max space bytes",
            self.LABELS,
        )
        self.disk_cache_occupied = Gauge(
            "io_e6x_e6engine_diskcacheoccupiedspacebytes",
            "Disk cache occupied space bytes",
            self.LABELS,
        )
        self.disk_cache_blocks_evicted = Counter(
            "io_e6x_e6engine_diskcachenumblocksevicted",
            "Disk cache blocks evicted",
            self.LABELS,
        )
        self.disk_cache_blocks_get = Counter(
            "io_e6x_e6engine_diskcachenumblocksget",
            "Disk cache block gets",
            self.LABELS,
        )
        self.disk_cache_blocks_put = Counter(
            "io_e6x_e6engine_diskcachenumblocksput",
            "Disk cache block puts",
            self.LABELS,
        )
        self.disk_cache_blocks_put_memory = Counter(
            "io_e6x_e6engine_diskcachenumblocksputinmemory",
            "Disk cache blocks put in memory",
            self.LABELS,
        )
        self.disk_cache_put_time = Counter(
            "io_e6x_e6engine_diskcacheputtimenanos",
            "Disk cache put time in nanoseconds",
            self.LABELS,
        )

        # ========== HEAP CACHE METRICS ==========
        self.heap_cache_hit = Counter(
            "io_e6x_e6engine_heapcachegethitbytes",
            "Heap cache hit bytes",
            self.LABELS,
        )
        self.heap_cache_miss = Counter(
            "io_e6x_e6engine_heapcachegetmissbytes",
            "Heap cache miss bytes",
            self.LABELS,
        )
        self.heap_cache_get_time = Counter(
            "io_e6x_e6engine_heapcachegettimenanos",
            "Heap cache get time in nanoseconds",
            self.LABELS,
        )
        self.heap_cache_max_space = Gauge(
            "io_e6x_e6engine_heapcachemaxspacebytes",
            "Heap cache max space bytes",
            self.LABELS,
        )
        self.heap_cache_occupied = Gauge(
            "io_e6x_e6engine_heapcacheoccupiedspacebytes",
            "Heap cache occupied space bytes",
            self.LABELS,
        )
        self.heap_cache_blocks_evicted = Counter(
            "io_e6x_e6engine_heapcachenumblocksevicted",
            "Heap cache blocks evicted",
            self.LABELS,
        )
        self.heap_cache_blocks_get = Counter(
            "io_e6x_e6engine_heapcachenumblocksget",
            "Heap cache block gets",
            self.LABELS,
        )
        self.heap_cache_blocks_put = Counter(
            "io_e6x_e6engine_heapcachenumblocksput",
            "Heap cache block puts",
            self.LABELS,
        )
        self.heap_cache_put_time = Counter(
            "io_e6x_e6engine_heapcacheputtimenanos",
            "Heap cache put time in nanoseconds",
            self.LABELS,
        )

        # ========== PARQUET WRITE METRICS ==========
        self.parquet_write_rows = Gauge(
            "io_e6x_e6engine_parquetwriterows",
            "Parquet rows written",
            self.LABELS,
        )
        self.parquet_write_rows_cumulative = Counter(
            "io_e6x_e6engine_parquetwriterowscumulative",
            "Cumulative parquet rows written",
            self.LABELS,
        )
        self.parquet_write_size = Gauge(
            "io_e6x_e6engine_parquetwritesize",
            "Parquet write size",
            self.LABELS,
        )
        self.parquet_write_size_cumulative = Counter(
            "io_e6x_e6engine_parquetwritesizecumulative",
            "Cumulative parquet write size",
            self.LABELS,
        )
        self.parquet_write_time = Gauge(
            "io_e6x_e6engine_parquetwritetime",
            "Parquet write time",
            self.LABELS,
        )
        self.parquet_write_time_cumulative = Counter(
            "io_e6x_e6engine_parquetwritetimecumulative",
            "Cumulative parquet write time",
            self.LABELS,
        )

        # ========== PRODUCER NODE METRICS ==========
        self.producer_nodes_closed = Counter(
            "io_e6x_e6engine_cumulativenumberofproducernodesclosed",
            "Cumulative producer nodes closed",
            self.LABELS,
        )
        self.producer_nodes_created = Counter(
            "io_e6x_e6engine_cumulativenumberofproducernodescreated",
            "Cumulative producer nodes created",
            self.LABELS,
        )
        self.producer_nodes_exception = Counter(
            "io_e6x_e6engine_cumulativenumberofproducernodesexception",
            "Cumulative producer node exceptions",
            self.LABELS,
        )
        self.producer_close_time = Counter(
            "io_e6x_e6engine_cumulativetimetakentocloseproducernodes",
            "Cumulative time to close producer nodes",
            self.LABELS,
        )

        # ========== DICTIONARY METRICS ==========
        self.dict_ingest_columns = Counter(
            "io_e6x_e6engine_dictionaryingestcolumnnumber",
            "Dictionary ingest column number",
            self.LABELS,
        )
        self.dict_ingest_inflight = Gauge(
            "io_e6x_e6engine_dictionaryingestinflightnumber",
            "Dictionary ingest in-flight number",
            self.LABELS,
        )
        self.dict_ingest_success = Counter(
            "io_e6x_e6engine_dictionaryingestsuccessnumber",
            "Dictionary ingest success number",
            self.LABELS,
        )

        # ========== TIMING METRICS ==========
        self.read_from_cache_nanos = Counter(
            "io_e6x_e6engine_readfromcachenanos",
            "Time spent reading from cache in nanoseconds",
            self.LABELS,
        )
        self.read_from_s3_nanos = Counter(
            "io_e6x_e6engine_readfroms3nanos",
            "Time spent reading from S3 in nanoseconds",
            self.LABELS,
        )
        self.round_trip_time = Counter(
            "io_e6x_e6engine_roundtriptimenanos",
            "Round trip time in nanoseconds",
            self.LABELS,
        )
        self.server_time = Counter(
            "io_e6x_e6engine_servertimenanos",
            "Server time in nanoseconds",
            self.LABELS,
        )
        self.time_to_first_byte = Counter(
            "io_e6x_e6engine_timetofirstbyte",
            "Time to first byte",
            self.LABELS,
        )

        # ========== THREAD METRICS (io_e6x_e6engine) ==========
        self.engine_blocked_threads = Gauge(
            "io_e6x_e6engine_numblockedthreads",
            "Number of blocked threads (engine)",
            self.LABELS,
        )
        self.engine_deadlocked_threads = Gauge(
            "io_e6x_e6engine_numdeadlockedthreads",
            "Number of deadlocked threads (engine)",
            self.LABELS,
        )

        # ========== UPTIME (io_e6x_e6engine) ==========
        self.engine_uptime = Gauge(
            "io_e6x_e6engine_uptime",
            "Engine uptime in milliseconds",
            self.LABELS,
        )

        # ========== io_e6x_e6xecutor METRICS ==========
        self.uptime = Gauge(
            "io_e6x_e6xecutor_uptime",
            "Executor uptime in milliseconds",
            self.LABELS,
        )
        self.blocked_threads = Gauge(
            "io_e6x_e6xecutor_numblockedthreads",
            "Number of blocked threads",
            self.LABELS,
        )
        self.deadlocked_threads = Gauge(
            "io_e6x_e6xecutor_numdeadlockedthreads",
            "Number of deadlocked threads",
            self.LABELS,
        )

    def update(self) -> None:
        labels = self._labels()
        tf = self.simulator.get_time_factor()

        # Task metrics
        active = self.simulator.engine_active_tasks()
        running = self.simulator.engine_running_tasks()
        self.active_tasks.labels(*labels).set(active)
        self.running_tasks.labels(*labels).set(running)
        self.new_tasks.labels(*labels).set(max(0, active - running))
        self.succeeded_tasks.labels(*labels).set(0)
        self.failed_tasks.labels(*labels).set(0)
        self.aborted_tasks.labels(*labels).set(0)
        self.cancelled_tasks.labels(*labels).set(0)
        self.tasks_run.labels(*labels).inc(int(running * 0.5))
        self.task_cumulative_time.labels(*labels).inc(int(running * 100_000_000))

        # Connections
        self.active_connections.labels(*labels).set(int(active * 0.8))
        self.succeeded_requests.labels(*labels).inc(int(running * 0.4))

        # Memory metrics
        mem = self.simulator.engine_memory_bytes()
        self.executor_allocated_memory.labels(*labels).set(mem["allocated"])
        self.executor_used_memory.labels(*labels).set(mem["used"])
        self.executor_occupied_memory.labels(*labels).set(mem["occupied"])
        self.dynamic_rss.labels(*labels).set(int(mem["used"] * 0.6))
        self.free_rss.labels(*labels).set(int(mem["allocated"] - mem["used"]))
        self.static_rss.labels(*labels).set(int(mem["used"] * 0.2))
        self.total_rss.labels(*labels).set(int(mem["used"] * 0.9))
        self.mmap_pinned.labels(*labels).set(int(mem["used"] * 0.1))
        self.mmap_rss.labels(*labels).set(int(mem["used"] * 0.15))

        # Memcache metrics
        cache_size = int(50 + tf * 100)
        self.memcache_available_slots.labels(*labels).set(int(cache_size * 0.3))
        self.memcache_memory.labels(*labels).set(int(mem["used"] * 0.4))
        self.memcache_occupied_slots.labels(*labels).set(int(cache_size * 0.6))
        self.memcache_pinned_slots.labels(*labels).set(int(cache_size * 0.1))
        self.memcache_reclaimed_slots.labels(*labels).set(int(cache_size * 0.05))
        self.memcache_read_waiters.labels(*labels).set(int(tf * 3))

        # Parquet cache metrics
        self.parquet_cache_file_count.labels(*labels).set(int(100 + tf * 200))
        self.parquet_cache_size.labels(*labels).set(int(1024 * 1024 * 100 * (1 + tf)))

        # File metrics
        self.avg_file_size.labels(*labels).set(int(1024 * 1024 * (5 + tf * 10)))
        self.files_open.labels(*labels).set(int(10 + tf * 20))
        self.num_files_open.labels(*labels).set(int(10 + tf * 20))
        self.num_files_read.labels(*labels).inc(int(5 + tf * 15))
        self.num_files_read_sync.labels(*labels).inc(int(2 + tf * 5))

        # Data read metrics
        bytes_read = self.simulator.engine_bytes_read()
        self.files_read_s3.labels(*labels).inc(bytes_read["s3_bytes"])
        self.files_read_s3_compressed.labels(*labels).inc(int(bytes_read["s3_bytes"] * 0.3))
        self.files_read_cache.labels(*labels).inc(bytes_read["cache_bytes"])
        self.total_bytes_read.labels(*labels).inc(bytes_read["total_bytes"])
        self.rows_read.labels(*labels).inc(self.simulator.engine_rows_read())
        self.columns_read.labels(*labels).inc(int(self.simulator.engine_rows_read() * 0.1))

        # Column split metrics
        self.columnsplit_cache_bytes.labels(*labels).inc(int(bytes_read["cache_bytes"] * 0.2))
        self.columnsplit_s3_bytes.labels(*labels).inc(int(bytes_read["s3_bytes"] * 0.2))
        self.columnsplit_s3_compressed.labels(*labels).inc(int(bytes_read["s3_bytes"] * 0.06))

        # Reader metrics
        self.num_cache_readers.labels(*labels).set(int(3 + tf * 5))
        self.num_s3_readers.labels(*labels).set(int(2 + tf * 8))

        # Spill metrics
        spill = self.simulator.engine_spill_bytes()
        self.spill_writers.labels(*labels).set(int(tf * 2))
        self.spilled_bytes_read.labels(*labels).inc(int(spill * 0.8))
        self.spilled_bytes_written.labels(*labels).inc(spill)
        self.spilled_pages_read.labels(*labels).inc(int(spill / 1024 / 8))
        self.spilled_pages_written.labels(*labels).inc(int(spill / 1024 / 10))
        self.spilled_page_compressed.labels(*labels).inc(int(spill * 0.4))
        self.spilled_page_uncompressed.labels(*labels).inc(spill)

        # Cache metrics
        cache = self.simulator.engine_cache_stats()
        self.disk_cache_hit.labels(*labels).inc(cache["disk_hit"])
        self.disk_cache_miss.labels(*labels).inc(cache["disk_miss"])
        self.disk_cache_get_time.labels(*labels).inc(int(cache["disk_hit"] * 100))
        self.disk_cache_max_space.labels(*labels).set(10 * 1024 * 1024 * 1024)  # 10GB
        self.disk_cache_occupied.labels(*labels).set(int(5 * 1024 * 1024 * 1024 * (0.5 + tf * 0.4)))
        self.disk_cache_blocks_evicted.labels(*labels).inc(int(cache["disk_miss"] / 1024))
        self.disk_cache_blocks_get.labels(*labels).inc(int((cache["disk_hit"] + cache["disk_miss"]) / 1024))
        self.disk_cache_blocks_put.labels(*labels).inc(int(cache["disk_miss"] / 1024))
        self.disk_cache_blocks_put_memory.labels(*labels).inc(int(cache["disk_miss"] / 2048))
        self.disk_cache_put_time.labels(*labels).inc(int(cache["disk_miss"] * 50))

        self.heap_cache_hit.labels(*labels).inc(cache["heap_hit"])
        self.heap_cache_miss.labels(*labels).inc(int(cache["heap_hit"] * 0.1))
        self.heap_cache_get_time.labels(*labels).inc(int(cache["heap_hit"] * 10))
        self.heap_cache_max_space.labels(*labels).set(2 * 1024 * 1024 * 1024)  # 2GB
        self.heap_cache_occupied.labels(*labels).set(int(1 * 1024 * 1024 * 1024 * (0.5 + tf * 0.4)))
        self.heap_cache_blocks_evicted.labels(*labels).inc(int(cache["heap_hit"] * 0.05 / 1024))
        self.heap_cache_blocks_get.labels(*labels).inc(int(cache["heap_hit"] / 1024))
        self.heap_cache_blocks_put.labels(*labels).inc(int(cache["heap_hit"] * 0.1 / 1024))
        self.heap_cache_put_time.labels(*labels).inc(int(cache["heap_hit"] * 5))

        # Parquet write metrics
        parquet_rows = int(1000 * tf)
        self.parquet_write_rows.labels(*labels).set(parquet_rows)
        self.parquet_write_rows_cumulative.labels(*labels).inc(parquet_rows)
        parquet_size = int(parquet_rows * 100)
        self.parquet_write_size.labels(*labels).set(parquet_size)
        self.parquet_write_size_cumulative.labels(*labels).inc(parquet_size)
        parquet_time = int(parquet_rows * 10)
        self.parquet_write_time.labels(*labels).set(parquet_time)
        self.parquet_write_time_cumulative.labels(*labels).inc(parquet_time)

        # Producer node metrics
        producer_count = int(running * 2)
        self.producer_nodes_created.labels(*labels).inc(producer_count)
        self.producer_nodes_closed.labels(*labels).inc(int(producer_count * 0.95))
        self.producer_nodes_exception.labels(*labels).inc(int(producer_count * 0.01))
        self.producer_close_time.labels(*labels).inc(int(producer_count * 1000))

        # Dictionary metrics
        self.dict_ingest_columns.labels(*labels).inc(int(running * 5))
        self.dict_ingest_inflight.labels(*labels).set(int(tf * 3))
        self.dict_ingest_success.labels(*labels).inc(int(running * 4.9))

        # Timing metrics
        self.read_from_cache_nanos.labels(*labels).inc(int(bytes_read["cache_bytes"] * 10))
        self.read_from_s3_nanos.labels(*labels).inc(int(bytes_read["s3_bytes"] * 100))
        self.round_trip_time.labels(*labels).inc(int(running * 50_000_000))
        self.server_time.labels(*labels).inc(int(running * 30_000_000))
        self.time_to_first_byte.labels(*labels).inc(int(running * 5_000_000))

        # Engine thread metrics
        self.engine_blocked_threads.labels(*labels).set(0)
        self.engine_deadlocked_threads.labels(*labels).set(0)

        # Engine uptime
        self.engine_uptime.labels(*labels).set(self.simulator.get_uptime_ms())

        # Executor metrics
        self.uptime.labels(*labels).set(self.simulator.get_uptime_ms())
        self.blocked_threads.labels(*labels).set(0)
        self.deadlocked_threads.labels(*labels).set(0)
