"""CloudCosts MCP Server - Query cloud costs and metrics via Model Context Protocol."""

import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    TextContent,
    Tool,
)

from .greptimedb import GreptimeDBClient
from .tools import TOOLS, set_client

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("cloudcosts-mcp")

# Configuration
GREPTIMEDB_URL = os.environ.get("GREPTIMEDB_URL", "https://greptimedb.cloudcosts.in")
GREPTIMEDB_USERNAME = os.environ.get("GREPTIMEDB_USERNAME", "")
GREPTIMEDB_PASSWORD = os.environ.get("GREPTIMEDB_PASSWORD", "")

# Schema documentation
SCHEMA_DOCS = """# CloudCosts Metrics Schema

## Databases

| Database | Description |
|----------|-------------|
| vantage | Cloud cost data from Vantage API (AWS, GCP, Azure, Databricks, Snowflake) |
| kubernetes | Kubernetes metrics from EKS clusters (CPU, memory, costs, pod info) |

## Vantage Database Tables

### vantage_daily_cost_by_provider
Daily costs aggregated by cloud provider.
- Columns: greptime_timestamp, provider, greptime_value (cost in USD)

### vantage_daily_cost_by_account
Daily costs aggregated by provider and account.
- Columns: greptime_timestamp, provider, account_id, account_name, greptime_value

### vantage_daily_cost_by_service
Daily costs aggregated by provider, account, and service.
- Columns: greptime_timestamp, provider, account_id, account_name, service, greptime_value

## Kubernetes Database Tables

### container_cpu_allocation
CPU allocation for containers (cores).
- Columns: greptime_timestamp, cluster, namespace, pod, container, node, greptime_value

### container_memory_allocation_bytes
Memory allocation for containers (bytes).
- Columns: greptime_timestamp, cluster, namespace, pod, container, node, greptime_value

### kube_pod_info
Information about pods.
- Columns: greptime_timestamp, cluster, namespace, pod, node, host_ip, pod_ip, uid, created_by_kind, created_by_name

### kube_node_info
Information about nodes.
- Columns: greptime_timestamp, cluster, node, internal_ip, provider_id, kubelet_version, instance_type

### node_total_hourly_cost
Hourly cost of nodes (USD/hour) from OpenCost.
- Columns: greptime_timestamp, cluster, node, instance_type, region, arch, greptime_value

## Example Queries

```sql
-- Total costs by provider for last 30 days
SELECT provider, SUM(greptime_value) as total
FROM vantage_daily_cost_by_provider
WHERE greptime_timestamp >= '2024-11-01'
GROUP BY provider
ORDER BY total DESC

-- Top 10 most expensive services
SELECT provider, service, SUM(greptime_value) as total
FROM vantage_daily_cost_by_service
GROUP BY provider, service
ORDER BY total DESC
LIMIT 10

-- Node costs by cluster
SELECT cluster, node, instance_type, AVG(greptime_value) as hourly_cost
FROM node_total_hourly_cost
GROUP BY cluster, node, instance_type
ORDER BY hourly_cost DESC
```
"""

DATABASE_INFO = """# Available Databases

## vantage
Cloud cost data from Vantage API. Contains daily cost metrics for:
- AWS, GCP, Azure, Databricks, Snowflake

Tables:
- vantage_daily_cost_by_provider
- vantage_daily_cost_by_account
- vantage_daily_cost_by_service

## kubernetes
Kubernetes metrics from EKS clusters. Contains:
- Container CPU/memory allocation and usage
- Pod and node information
- Node hourly costs from OpenCost

Tables:
- container_cpu_allocation
- container_memory_allocation_bytes
- container_cpu_usage_seconds_total
- container_memory_working_set_bytes
- kube_pod_info
- kube_node_info
- node_total_hourly_cost
- kube_node_status_capacity
- kube_node_status_allocatable
"""


def create_server() -> Server:
    """Create and configure the MCP server."""
    server = Server("cloudcosts")

    # Initialize GreptimeDB client
    client = GreptimeDBClient(
        url=GREPTIMEDB_URL,
        username=GREPTIMEDB_USERNAME,
        password=GREPTIMEDB_PASSWORD,
    )
    set_client(client)
    logger.info(f"Connected to GreptimeDB at {GREPTIMEDB_URL}")

    @server.list_resources()
    async def list_resources() -> list[Resource]:
        """List available resources."""
        return [
            Resource(
                uri="cloudcosts://schema",
                name="CloudCosts Schema",
                description="Database schema documentation for cloud cost metrics",
                mimeType="text/markdown",
            ),
            Resource(
                uri="cloudcosts://databases",
                name="Available Databases",
                description="List of available databases and their tables",
                mimeType="text/markdown",
            ),
        ]

    @server.read_resource()
    async def read_resource(uri: str) -> str:
        """Read a resource by URI."""
        if uri == "cloudcosts://schema":
            return SCHEMA_DOCS
        elif uri == "cloudcosts://databases":
            return DATABASE_INFO
        else:
            raise ValueError(f"Unknown resource: {uri}")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available tools."""
        tools = []
        for name, config in TOOLS.items():
            # Build input schema from parameters
            properties = {}
            required = []

            for param_name, param_config in config.get("parameters", {}).items():
                prop = {"type": param_config.get("type", "string")}
                if "description" in param_config:
                    prop["description"] = param_config["description"]
                properties[param_name] = prop

                if param_config.get("required", False):
                    required.append(param_name)

            input_schema = {
                "type": "object",
                "properties": properties,
            }
            if required:
                input_schema["required"] = required

            tools.append(
                Tool(
                    name=name,
                    description=config["description"],
                    inputSchema=input_schema,
                )
            )

        return tools

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        """Execute a tool and return results."""
        if name not in TOOLS:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

        tool_config = TOOLS[name]
        func = tool_config["function"]

        try:
            # Call the tool function with provided arguments
            result = func(**arguments)
            return [TextContent(type="text", text=result)]
        except Exception as e:
            logger.error(f"Tool {name} failed: {e}", exc_info=True)
            return [TextContent(type="text", text=f"Error executing {name}: {str(e)}")]

    return server


async def run_server():
    """Run the MCP server."""
    server = create_server()

    async with stdio_server() as (read_stream, write_stream):
        logger.info("CloudCosts MCP server starting...")
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def main():
    """Main entry point."""
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
