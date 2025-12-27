# Mock E6 Components

Mock services that expose Prometheus metrics simulating E6 engine components.

## Components

| Component | Level | Metrics Prefix | Description |
|-----------|-------|----------------|-------------|
| **Gateway** | Workspace | `io_e6x_e6gateway_*` | Query routing, connections |
| **Schema** | Workspace | `io_e6x_e6schema_*` | Table/partition metadata |
| **Storage** | Workspace | `io_e6x_e6storage_*` | File metadata cache |
| **Executor** | Cluster | `io_e6x_e6engine_*` | Query execution, data read |
| **Planner** | Cluster | `io_e6x_e6engine_*` | Query planning |
| **Queue** | Cluster | `io_e6x_e6queue_*` | Request queuing |

## Quick Start

### Local Development

```bash
# Create virtual environment
cd /Users/aravindhs/e6/cloudcosts/mock
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run as executor
E6_COMPONENT=executor E6_CLUSTER=analytics E6_WORKSPACE=demo \
  python -m uvicorn app.main:app --port 8080

# Test metrics endpoint
curl http://localhost:8080/metrics
curl http://localhost:8080/health
```

### Docker Build

```bash
cd /Users/aravindhs/e6/cloudcosts/mock
docker build -t mock-e6:latest .

# Run as different components
docker run -p 8080:8080 -e E6_COMPONENT=gateway mock-e6:latest
docker run -p 8081:8080 -e E6_COMPONENT=executor -e E6_CLUSTER=analytics mock-e6:latest
```

### Kubernetes Deployment

```bash
# Build and load image (k3d)
docker build -t mock-e6:latest .
k3d image import mock-e6:latest -c cloudcosts

# Deploy with Helm
helm install mock-e6 ./helm

# Or with custom values
helm install mock-e6 ./helm \
  --set workspace.name=production \
  --set clusters[0].name=main \
  --set clusters[0].executors=5
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `E6_COMPONENT` | `executor` | Component type: gateway, schema, storage, executor, planner, queue |
| `E6_CLUSTER` | `default` | E6 cluster name |
| `E6_WORKSPACE` | `demo` | Workspace name |
| `E6_NAMESPACE` | `default` | Kubernetes namespace |
| `E6_POD_NAME` | `mock-0` | Pod name (from downward API) |
| `E6_BASE_QPM` | `100` | Base queries per minute |
| `E6_UPDATE_INTERVAL` | `15.0` | Metric update interval (seconds) |
| `E6_PORT` | `8080` | HTTP port |

## Endpoints

- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check
- `GET /` - Component info

## Architecture

```
mock/
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings from env vars
│   ├── metrics/
│   │   ├── base.py          # Base metrics class
│   │   ├── gateway.py       # Gateway metrics
│   │   ├── executor.py      # Executor/Engine metrics
│   │   ├── queue.py         # Queue metrics
│   │   ├── schema.py        # Schema metrics
│   │   └── storage.py       # Storage metrics
│   └── simulator/
│       └── workload.py      # Time-based workload simulation
├── helm/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── workspace-components.yaml
│       ├── cluster-components.yaml
│       └── servicemonitor.yaml
├── Dockerfile
└── requirements.txt
```

## Metrics Generated

### Gateway (io_e6x_e6gateway_*)
- `currentactiveconnections` - Active connections
- `currentqueriesrunningcount` - Running queries
- `numsucceededqueries` - Succeeded queries (counter)
- `totalqueriesfailedcount` - Failed queries (counter)
- `uptime` - Uptime in ms

### Executor (io_e6x_e6engine_*)
- `currentactivetasks` - Active tasks
- `currentexecutorusedmemorybytes` - Memory usage
- `filesreadfroms3bytes` - S3 reads (counter)
- `filesreadfromcachebytes` - Cache reads (counter)
- `totalbytesread` - Total bytes read (counter)
- `numrowsread` - Rows read (counter)

### Queue (io_e6x_e6queue_*)
- `currentactiverequests` - Active requests
- `currentactivetasks` - Active tasks
- `nume6requestssucceeded` - Succeeded requests (counter)
- `uptime` - Uptime in ms

### Schema (io_e6x_e6schema_*)
- `numtablelistingtaskssuccess` - Table listing tasks (counter)
- `numtablemetadatareadtaskssuccess` - Metadata tasks (counter)
- `uptime` - Uptime in ms

### Storage (io_e6x_e6storage_*)
- `filemetadatacachesize` - Cache size
- `numthriftrequestsqueued` - Queued requests
- `uptime` - Uptime in ms
