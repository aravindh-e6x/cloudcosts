# CloudCosts MCP Server

MCP (Model Context Protocol) server for querying cloud costs and infrastructure metrics from GreptimeDB.

## Features

- **Cost Analysis Tools**: Query cloud costs by provider, account, service
- **Kubernetes Tools**: Get K8s infrastructure costs, resource usage
- **Raw SQL Access**: Execute custom SQL queries against GreptimeDB
- **Schema Discovery**: List databases, tables, and describe schemas

## Available Tools

| Tool | Description |
|------|-------------|
| `list_databases` | List all available databases |
| `list_tables` | List tables in a database |
| `describe_table` | Get schema for a table |
| `query_sql` | Execute raw SQL (SELECT only) |
| `get_total_costs` | Get total costs grouped by dimension |
| `get_costs_by_provider` | Daily costs by provider |
| `get_costs_by_account` | Daily costs by account |
| `get_costs_by_service` | Costs by service |
| `get_top_services` | Top N most expensive services |
| `get_kubernetes_costs` | K8s node costs |
| `get_resource_usage` | K8s CPU/memory usage |
| `get_cluster_summary` | K8s cluster overview |

## Installation

### Local (Claude Desktop / Claude Code)

1. Install dependencies:

```bash
cd mcp-server
uv venv
uv pip install -e .
```

2. Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cloudcosts": {
      "command": "uv",
      "args": ["--directory", "/path/to/cloudcosts/mcp-server", "run", "cloudcosts-mcp"],
      "env": {
        "GREPTIMEDB_URL": "https://greptimedb.cloudcosts.in",
        "GREPTIMEDB_USERNAME": "e6data",
        "GREPTIMEDB_PASSWORD": "cloudcosts"
      }
    }
  }
}
```

3. Restart Claude Desktop

### Kubernetes Deployment

The MCP server is deployed as part of the monitoring-stack Helm chart.

1. Build and push the container:

```bash
cd mcp-server
docker build -t cloudcosts-mcp:latest .

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_PRIMARY_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag cloudcosts-mcp:latest $AWS_PRIMARY_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cloudcosts/mcp-server:latest
docker push $AWS_PRIMARY_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/cloudcosts/mcp-server:latest
```

2. Deploy with the monitoring stack:

```bash
cd monitoring-stack
task upgrade
```

The MCP server configuration is in `monitoring-stack/values.yaml` under `mcpServer`.

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `GREPTIMEDB_URL` | `https://greptimedb.cloudcosts.in` | GreptimeDB HTTP endpoint |
| `GREPTIMEDB_USERNAME` | (empty) | Basic auth username |
| `GREPTIMEDB_PASSWORD` | (empty) | Basic auth password |

## Example Usage

Once connected, you can ask Claude questions like:

- "What were our top 5 most expensive AWS services last month?"
- "Show me the cost trend for our preprod account"
- "Which Kubernetes clusters have the highest costs?"
- "Find namespaces using more than 10GB of memory"
- "Compare costs between AWS and GCP for November"

### Example Tool Calls

```
# Get top expensive services
get_top_services(start_date="2024-11-01", end_date="2024-11-30", limit=5)

# Query costs for a specific account
get_costs_by_account(provider="aws", start_date="2024-11-01", end_date="2024-11-30")

# Custom SQL query
query_sql(
  database="kubernetes",
  sql="SELECT namespace, SUM(greptime_value)/1073741824 as memory_gb FROM container_memory_allocation_bytes GROUP BY namespace ORDER BY memory_gb DESC LIMIT 10"
)
```

## Data Sources

### Vantage Database
- `vantage_daily_cost_by_provider`: Daily costs by cloud provider
- `vantage_daily_cost_by_account`: Daily costs by account
- `vantage_daily_cost_by_service`: Daily costs by service

### Kubernetes Database
- `container_cpu_allocation`: CPU allocation per container
- `container_memory_allocation_bytes`: Memory allocation per container
- `kube_pod_info`: Pod metadata
- `kube_node_info`: Node metadata
- `node_total_hourly_cost`: Node hourly costs from OpenCost

## Security

- Only read-only queries (SELECT, SHOW, DESCRIBE) are allowed
- SQL injection patterns are blocked
- Credentials are passed via environment variables
- Container runs as non-root user

## Development

```bash
# Install dev dependencies
uv pip install -e ".[dev]"

# Run locally
GREPTIMEDB_URL=https://greptimedb.cloudcosts.in \
GREPTIMEDB_USERNAME=e6data \
GREPTIMEDB_PASSWORD=cloudcosts \
cloudcosts-mcp
```

## License

Internal use only.
