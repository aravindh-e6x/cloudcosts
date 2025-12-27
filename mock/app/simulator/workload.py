"""Workload simulation for realistic metric patterns."""

import math
import random
from datetime import datetime


class WorkloadSimulator:
    """Simulates realistic workload patterns based on time of day."""

    def __init__(self, base_qpm: int = 100):
        self.base_qpm = base_qpm
        self.start_time = datetime.now()

    def get_time_factor(self) -> float:
        """Get workload factor based on time of day.

        Peak: 9am-5pm (factor ~1.0)
        Off-peak: 8pm-6am (factor ~0.3)
        """
        hour = datetime.now().hour
        # Sinusoidal pattern peaking at noon
        return 0.3 + 0.7 * max(0, math.sin((hour - 6) * math.pi / 12))

    def get_noise(self, variance: float = 0.1) -> float:
        """Add random noise to metrics."""
        return 1.0 + random.uniform(-variance, variance)

    def get_uptime_ms(self) -> int:
        """Get uptime in milliseconds since start."""
        delta = datetime.now() - self.start_time
        return int(delta.total_seconds() * 1000)

    # Gateway workload
    def gateway_active_connections(self) -> int:
        base = 20 * self.get_time_factor()
        return max(1, int(base * self.get_noise(0.3)))

    def gateway_queries_running(self) -> int:
        base = 5 * self.get_time_factor()
        return max(0, int(base * self.get_noise(0.4)))

    def gateway_queries_per_interval(self) -> dict:
        """Returns succeeded and failed query counts for this interval."""
        base = self.base_qpm * self.get_time_factor() / 4  # Per 15s interval
        total = max(0, int(base * self.get_noise(0.2)))
        failed = int(total * random.uniform(0.01, 0.05))
        return {
            "succeeded": total - failed,
            "failed": failed,
            "total": total,
        }

    # Executor/Engine workload
    def engine_active_tasks(self) -> int:
        base = 10 * self.get_time_factor()
        return max(0, int(base * self.get_noise(0.3)))

    def engine_running_tasks(self) -> int:
        base = 6 * self.get_time_factor()
        return max(0, int(base * self.get_noise(0.3)))

    def engine_bytes_read(self) -> dict:
        """Returns S3 and cache bytes read."""
        factor = self.get_time_factor() * self.get_noise(0.3)
        s3_bytes = int(100 * 1024 * 1024 * factor)  # ~100MB base
        cache_bytes = int(50 * 1024 * 1024 * factor)  # ~50MB base
        return {
            "s3_bytes": s3_bytes,
            "cache_bytes": cache_bytes,
            "total_bytes": s3_bytes + cache_bytes,
        }

    def engine_rows_read(self) -> int:
        base = 1_000_000 * self.get_time_factor()
        return max(0, int(base * self.get_noise(0.4)))

    def engine_memory_bytes(self) -> dict:
        """Returns executor memory usage."""
        base_allocated = 8 * 1024 * 1024 * 1024  # 8GB allocated
        usage_factor = 0.4 + 0.4 * self.get_time_factor()  # 40-80% usage
        used = int(base_allocated * usage_factor * self.get_noise(0.1))
        return {
            "allocated": base_allocated,
            "used": used,
            "occupied": int(used * 0.9),
        }

    def engine_spill_bytes(self) -> int:
        """Spill to disk when memory pressure is high."""
        if self.get_time_factor() > 0.7 and random.random() > 0.7:
            return int(10 * 1024 * 1024 * self.get_noise(0.5))
        return 0

    def engine_cache_stats(self) -> dict:
        """Disk and heap cache hit/miss bytes."""
        factor = self.get_time_factor()
        disk_hit = int(200 * 1024 * 1024 * factor * self.get_noise(0.2))
        disk_miss = int(50 * 1024 * 1024 * factor * self.get_noise(0.3))
        heap_hit = int(100 * 1024 * 1024 * factor * self.get_noise(0.2))
        return {
            "disk_hit": disk_hit,
            "disk_miss": disk_miss,
            "heap_hit": heap_hit,
        }

    # Queue workload
    def queue_active_requests(self) -> int:
        base = 8 * self.get_time_factor()
        return max(0, int(base * self.get_noise(0.3)))

    def queue_active_tasks(self) -> int:
        base = 15 * self.get_time_factor()
        return max(0, int(base * self.get_noise(0.3)))

    def queue_requests_per_interval(self) -> int:
        """Succeeded requests per interval."""
        base = self.base_qpm * self.get_time_factor() / 4
        return max(0, int(base * self.get_noise(0.2)))

    # Schema workload
    def schema_tasks(self) -> dict:
        """Table listing and metadata tasks."""
        factor = self.get_time_factor() * self.get_noise(0.3)
        return {
            "listing_success": int(50 * factor),
            "listing_failed": int(2 * factor) if random.random() > 0.9 else 0,
            "listing_queued": int(3 * factor),
            "metadata_success": int(100 * factor),
            "metadata_failed": int(1 * factor) if random.random() > 0.95 else 0,
            "thrift_queued": int(5 * factor),
        }

    # Storage workload
    def storage_stats(self) -> dict:
        """Storage service stats."""
        factor = self.get_time_factor() * self.get_noise(0.2)
        return {
            "cache_size": int(500 * 1024 * 1024 * factor),
            "avg_metadata_size": int(2048 * self.get_noise(0.1)),
            "thrift_queued": int(3 * factor),
            "requests_in_progress": int(5 * factor),
        }
