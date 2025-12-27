"""FastAPI application exposing Prometheus metrics for mock E6 components."""

import asyncio
import logging
import sys

from fastapi import FastAPI
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, REGISTRY
from starlette.responses import Response

from app.config import settings
from app.metrics import COMPONENT_METRICS
from app.simulator.workload import WorkloadSimulator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=f"Mock E6 {settings.component.title()}",
    description=f"Mock {settings.component} component exposing Prometheus metrics",
)

# Initialize simulator and metrics
simulator = WorkloadSimulator(base_qpm=settings.base_qpm)

# Get the right metrics class for this component
MetricsClass = COMPONENT_METRICS.get(settings.component.lower())
if not MetricsClass:
    log.error(f"Unknown component: {settings.component}")
    log.error(f"Valid components: {list(COMPONENT_METRICS.keys())}")
    sys.exit(1)

metrics = MetricsClass(
    cluster=settings.cluster,
    workspace=settings.workspace,
    namespace=settings.namespace,
    pod=settings.pod_name,
    component=settings.component,
    simulator=simulator,
)

log.info(f"Initialized {settings.component} metrics")
log.info(f"  Cluster: {settings.cluster}")
log.info(f"  Workspace: {settings.workspace}")
log.info(f"  Namespace: {settings.namespace}")
log.info(f"  Pod: {settings.pod_name}")


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint."""
    return Response(generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "component": settings.component,
        "cluster": settings.cluster,
        "workspace": settings.workspace,
        "uptime_ms": simulator.get_uptime_ms(),
    }


@app.get("/")
async def root():
    """Root endpoint with component info."""
    return {
        "name": f"mock-{settings.component}",
        "component": settings.component,
        "cluster": settings.cluster,
        "workspace": settings.workspace,
        "endpoints": {
            "metrics": "/metrics",
            "health": "/health",
        },
    }


async def update_metrics_loop():
    """Background task to update metrics periodically."""
    while True:
        try:
            metrics.update()
            log.debug(f"Updated {settings.component} metrics")
        except Exception as e:
            log.error(f"Error updating metrics: {e}")
        await asyncio.sleep(settings.update_interval)


@app.on_event("startup")
async def startup():
    """Start background metric update task."""
    log.info(f"Starting metric update loop (interval: {settings.update_interval}s)")
    asyncio.create_task(update_metrics_loop())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
