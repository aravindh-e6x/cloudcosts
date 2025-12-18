"""MCP tool implementations for CloudCosts."""

import json
import re
from datetime import datetime, timedelta
from typing import Any

from .greptimedb import GreptimeDBClient

# Global client instance, initialized by server
_client: GreptimeDBClient | None = None


def set_client(client: GreptimeDBClient) -> None:
    """Set the global GreptimeDB client instance."""
    global _client
    _client = client


def get_client() -> GreptimeDBClient:
    """Get the global GreptimeDB client instance."""
    if _client is None:
        raise RuntimeError("GreptimeDB client not initialized")
    return _client


def format_result(data: Any) -> str:
    """Format query results as a readable string."""
    if isinstance(data, list):
        if not data:
            return "No results found."
        return json.dumps(data, indent=2, default=str)
    elif isinstance(data, dict):
        if "error" in data:
            return f"Error: {data['error']}"
        return json.dumps(data, indent=2, default=str)
    return str(data)


def validate_sql(sql: str) -> tuple[bool, str]:
    """Validate SQL query for safety.

    Only allows SELECT statements and basic SHOW/DESCRIBE commands.

    Returns:
        Tuple of (is_valid, error_message)
    """
    sql_upper = sql.strip().upper()

    # Allow read-only commands
    allowed_prefixes = ("SELECT", "SHOW", "DESCRIBE", "DESC", "EXPLAIN")
    if not any(sql_upper.startswith(prefix) for prefix in allowed_prefixes):
        return False, "Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are allowed"

    # Block dangerous patterns
    dangerous_patterns = [
        r"\bDROP\b",
        r"\bDELETE\b",
        r"\bINSERT\b",
        r"\bUPDATE\b",
        r"\bCREATE\b",
        r"\bALTER\b",
        r"\bTRUNCATE\b",
        r"\bGRANT\b",
        r"\bREVOKE\b",
    ]
    for pattern in dangerous_patterns:
        if re.search(pattern, sql_upper):
            return False, f"Query contains forbidden keyword"

    return True, ""


# =============================================================================
# Schema Discovery Tools
# =============================================================================


def list_databases() -> str:
    """List all available databases in GreptimeDB.

    Returns a list of database names that can be queried.
    """
    client = get_client()
    databases = client.list_databases()

    if not databases:
        return "No databases found or error occurred."

    # Add descriptions for known databases
    db_info = {
        "vantage": "Cloud cost data from Vantage API (AWS, GCP, Azure, Databricks, Snowflake)",
        "kubernetes": "Kubernetes metrics from EKS clusters (CPU, memory, costs)",
        "public": "System database",
        "information_schema": "Database metadata",
    }

    result = []
    for db in databases:
        desc = db_info.get(db, "Customer or POC database")
        result.append({"database": db, "description": desc})

    return format_result(result)


def list_tables(database: str) -> str:
    """List all tables in a database.

    Args:
        database: The database name (e.g., 'vantage', 'kubernetes')

    Returns a list of table names available for querying.
    """
    client = get_client()
    tables = client.list_tables(database)

    if not tables:
        return f"No tables found in database '{database}' or database does not exist."

    return format_result({"database": database, "tables": tables})


def describe_table(database: str, table: str) -> str:
    """Get schema information for a table.

    Args:
        database: The database name
        table: The table name

    Returns column names, types, and metadata for the table.
    """
    client = get_client()
    result = client.describe_table(database, table)

    if "error" in result:
        return f"Error describing table: {result['error']}"

    return format_result({"database": database, "table": table, "schema": result["columns"]})


# =============================================================================
# Raw SQL Tool
# =============================================================================


def query_sql(database: str, sql: str) -> str:
    """Execute a SQL query against GreptimeDB.

    This tool allows running arbitrary SELECT queries against the metrics database.
    Only read-only queries (SELECT, SHOW, DESCRIBE) are permitted.

    Args:
        database: Database name to query. Common databases:
            - 'vantage': Cloud costs by provider, account, service
            - 'kubernetes': K8s metrics (CPU, memory, pod info, node costs)
        sql: SQL query to execute. Must be a SELECT statement.

    Example queries:
        - SELECT * FROM vantage_daily_cost_by_provider LIMIT 10
        - SELECT provider, SUM(greptime_value) as total FROM vantage_daily_cost_by_provider GROUP BY provider
        - SELECT cluster, namespace, pod FROM kube_pod_info WHERE namespace = 'default'
    """
    # Validate query
    is_valid, error = validate_sql(sql)
    if not is_valid:
        return f"Invalid query: {error}"

    client = get_client()
    result = client.execute_sql(database, sql)

    if "error" in result:
        return f"Query error: {result['error']}"

    # Extract records from result
    records = []
    for output in result.get("output", []):
        if output.get("records"):
            schema = output["records"].get("schema", {})
            column_schemas = schema.get("column_schemas", [])
            rows = output["records"].get("rows", [])

            col_names = [col.get("name", f"col_{i}") for i, col in enumerate(column_schemas)]

            for row in rows:
                records.append(dict(zip(col_names, row)))

    if not records:
        return "Query executed successfully but returned no results."

    return format_result(records)


# =============================================================================
# Cost Analysis Tools
# =============================================================================


def get_default_date_range() -> tuple[str, str]:
    """Get default date range (last 30 days)."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")


def get_total_costs(start_date: str = "", end_date: str = "", group_by: str = "provider") -> str:
    """Get total cloud costs for a date range, grouped by a dimension.

    Args:
        start_date: Start date in YYYY-MM-DD format (default: 30 days ago)
        end_date: End date in YYYY-MM-DD format (default: today)
        group_by: Grouping dimension - 'provider', 'account', or 'service'

    Returns aggregated costs for the specified period.
    """
    if not start_date or not end_date:
        start_date, end_date = get_default_date_range()

    table_map = {
        "provider": "vantage_daily_cost_by_provider",
        "account": "vantage_daily_cost_by_account",
        "service": "vantage_daily_cost_by_service",
    }

    table = table_map.get(group_by, "vantage_daily_cost_by_provider")

    if group_by == "provider":
        sql = f"""
            SELECT provider, SUM(greptime_value) as total_cost_usd
            FROM {table}
            WHERE greptime_timestamp >= '{start_date}'
              AND greptime_timestamp < '{end_date}'
            GROUP BY provider
            ORDER BY total_cost_usd DESC
        """
    elif group_by == "account":
        sql = f"""
            SELECT provider, account_id, account_name, SUM(greptime_value) as total_cost_usd
            FROM {table}
            WHERE greptime_timestamp >= '{start_date}'
              AND greptime_timestamp < '{end_date}'
            GROUP BY provider, account_id, account_name
            ORDER BY total_cost_usd DESC
        """
    else:  # service
        sql = f"""
            SELECT provider, service, SUM(greptime_value) as total_cost_usd
            FROM {table}
            WHERE greptime_timestamp >= '{start_date}'
              AND greptime_timestamp < '{end_date}'
            GROUP BY provider, service
            ORDER BY total_cost_usd DESC
            LIMIT 50
        """

    client = get_client()
    records = client.query_to_records("vantage", sql)

    if not records:
        return f"No cost data found for period {start_date} to {end_date}"

    return format_result({
        "period": {"start": start_date, "end": end_date},
        "group_by": group_by,
        "costs": records,
    })


def get_costs_by_provider(start_date: str = "", end_date: str = "") -> str:
    """Get daily costs grouped by cloud provider.

    Args:
        start_date: Start date in YYYY-MM-DD format (default: 30 days ago)
        end_date: End date in YYYY-MM-DD format (default: today)

    Returns daily cost breakdown for AWS, GCP, Azure, Databricks, Snowflake.
    """
    if not start_date or not end_date:
        start_date, end_date = get_default_date_range()

    sql = f"""
        SELECT
            DATE(greptime_timestamp) as date,
            provider,
            SUM(greptime_value) as cost_usd
        FROM vantage_daily_cost_by_provider
        WHERE greptime_timestamp >= '{start_date}'
          AND greptime_timestamp < '{end_date}'
        GROUP BY DATE(greptime_timestamp), provider
        ORDER BY date DESC, cost_usd DESC
    """

    client = get_client()
    records = client.query_to_records("vantage", sql)

    if not records:
        return f"No provider cost data found for period {start_date} to {end_date}"

    return format_result({
        "period": {"start": start_date, "end": end_date},
        "daily_costs": records,
    })


def get_costs_by_account(
    start_date: str = "", end_date: str = "", provider: str = ""
) -> str:
    """Get daily costs grouped by account.

    Args:
        start_date: Start date in YYYY-MM-DD format (default: 30 days ago)
        end_date: End date in YYYY-MM-DD format (default: today)
        provider: Optional provider filter (aws, gcp, azure, etc.)

    Returns daily cost breakdown per account.
    """
    if not start_date or not end_date:
        start_date, end_date = get_default_date_range()

    where_clause = f"""
        WHERE greptime_timestamp >= '{start_date}'
          AND greptime_timestamp < '{end_date}'
    """
    if provider:
        where_clause += f" AND provider = '{provider}'"

    sql = f"""
        SELECT
            DATE(greptime_timestamp) as date,
            provider,
            account_id,
            account_name,
            SUM(greptime_value) as cost_usd
        FROM vantage_daily_cost_by_account
        {where_clause}
        GROUP BY DATE(greptime_timestamp), provider, account_id, account_name
        ORDER BY date DESC, cost_usd DESC
    """

    client = get_client()
    records = client.query_to_records("vantage", sql)

    if not records:
        return f"No account cost data found for period {start_date} to {end_date}"

    return format_result({
        "period": {"start": start_date, "end": end_date},
        "provider_filter": provider or "all",
        "daily_costs": records,
    })


def get_costs_by_service(
    start_date: str = "",
    end_date: str = "",
    provider: str = "",
    account_id: str = "",
) -> str:
    """Get costs grouped by service.

    Args:
        start_date: Start date in YYYY-MM-DD format (default: 30 days ago)
        end_date: End date in YYYY-MM-DD format (default: today)
        provider: Optional provider filter (aws, gcp, azure, etc.)
        account_id: Optional account ID filter

    Returns cost breakdown by service.
    """
    if not start_date or not end_date:
        start_date, end_date = get_default_date_range()

    where_clause = f"""
        WHERE greptime_timestamp >= '{start_date}'
          AND greptime_timestamp < '{end_date}'
    """
    if provider:
        where_clause += f" AND provider = '{provider}'"
    if account_id:
        where_clause += f" AND account_id = '{account_id}'"

    sql = f"""
        SELECT
            provider,
            account_name,
            service,
            SUM(greptime_value) as total_cost_usd
        FROM vantage_daily_cost_by_service
        {where_clause}
        GROUP BY provider, account_name, service
        ORDER BY total_cost_usd DESC
        LIMIT 100
    """

    client = get_client()
    records = client.query_to_records("vantage", sql)

    if not records:
        return f"No service cost data found for period {start_date} to {end_date}"

    return format_result({
        "period": {"start": start_date, "end": end_date},
        "filters": {"provider": provider or "all", "account_id": account_id or "all"},
        "services": records,
    })


def get_top_services(start_date: str = "", end_date: str = "", limit: int = 10) -> str:
    """Get the top N most expensive services across all providers.

    Args:
        start_date: Start date in YYYY-MM-DD format (default: 30 days ago)
        end_date: End date in YYYY-MM-DD format (default: today)
        limit: Number of top services to return (default: 10, max: 50)

    Returns the most expensive services ranked by total cost.
    """
    if not start_date or not end_date:
        start_date, end_date = get_default_date_range()

    limit = min(max(1, limit), 50)  # Clamp between 1 and 50

    sql = f"""
        SELECT
            provider,
            service,
            SUM(greptime_value) as total_cost_usd
        FROM vantage_daily_cost_by_service
        WHERE greptime_timestamp >= '{start_date}'
          AND greptime_timestamp < '{end_date}'
        GROUP BY provider, service
        ORDER BY total_cost_usd DESC
        LIMIT {limit}
    """

    client = get_client()
    records = client.query_to_records("vantage", sql)

    if not records:
        return f"No service cost data found for period {start_date} to {end_date}"

    # Add rank
    for i, record in enumerate(records, 1):
        record["rank"] = i

    return format_result({
        "period": {"start": start_date, "end": end_date},
        "top_services": records,
    })


# =============================================================================
# Kubernetes Tools
# =============================================================================


def get_kubernetes_costs(
    cluster: str = "", namespace: str = "", start_date: str = "", end_date: str = ""
) -> str:
    """Get Kubernetes infrastructure costs from node hourly rates.

    Args:
        cluster: Optional cluster name filter
        namespace: Optional namespace filter (for pod-level cost attribution)
        start_date: Start date in YYYY-MM-DD format (default: 7 days ago)
        end_date: End date in YYYY-MM-DD format (default: today)

    Returns node costs aggregated by cluster and instance type.
    """
    if not start_date or not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    where_clause = f"""
        WHERE greptime_timestamp >= '{start_date}'
          AND greptime_timestamp < '{end_date}'
    """
    if cluster:
        where_clause += f" AND cluster = '{cluster}'"

    sql = f"""
        SELECT
            cluster,
            node,
            instance_type,
            region,
            AVG(greptime_value) as avg_hourly_cost_usd,
            COUNT(*) as data_points
        FROM node_total_hourly_cost
        {where_clause}
        GROUP BY cluster, node, instance_type, region
        ORDER BY avg_hourly_cost_usd DESC
    """

    client = get_client()
    records = client.query_to_records("kubernetes", sql)

    if not records:
        return f"No Kubernetes cost data found for period {start_date} to {end_date}"

    # Calculate estimated daily and monthly costs
    for record in records:
        hourly = record.get("avg_hourly_cost_usd", 0)
        record["estimated_daily_cost_usd"] = round(hourly * 24, 2)
        record["estimated_monthly_cost_usd"] = round(hourly * 24 * 30, 2)

    return format_result({
        "period": {"start": start_date, "end": end_date},
        "cluster_filter": cluster or "all",
        "node_costs": records,
    })


def get_resource_usage(cluster: str = "", namespace: str = "") -> str:
    """Get current CPU and memory usage for Kubernetes workloads.

    Args:
        cluster: Optional cluster name filter
        namespace: Optional namespace filter

    Returns current resource usage by namespace and pod.
    """
    where_clause = "WHERE 1=1"
    if cluster:
        where_clause += f" AND cluster = '{cluster}'"
    if namespace:
        where_clause += f" AND namespace = '{namespace}'"

    # Get CPU allocation
    cpu_sql = f"""
        SELECT cluster, namespace, pod, container,
               greptime_value as cpu_cores
        FROM container_cpu_allocation
        {where_clause}
        ORDER BY greptime_timestamp DESC
        LIMIT 100
    """

    # Get memory allocation
    mem_sql = f"""
        SELECT cluster, namespace, pod, container,
               greptime_value / 1073741824 as memory_gb
        FROM container_memory_allocation_bytes
        {where_clause}
        ORDER BY greptime_timestamp DESC
        LIMIT 100
    """

    client = get_client()
    cpu_records = client.query_to_records("kubernetes", cpu_sql)
    mem_records = client.query_to_records("kubernetes", mem_sql)

    if not cpu_records and not mem_records:
        return "No resource usage data found."

    return format_result({
        "filters": {"cluster": cluster or "all", "namespace": namespace or "all"},
        "cpu_allocation": cpu_records[:20],  # Limit output
        "memory_allocation_gb": mem_records[:20],
    })


def get_cluster_summary(cluster: str = "") -> str:
    """Get a summary of Kubernetes cluster resources and costs.

    Args:
        cluster: Optional cluster name filter

    Returns node count, total capacity, and cost summary.
    """
    where_clause = ""
    if cluster:
        where_clause = f"WHERE cluster = '{cluster}'"

    # Get node info
    node_sql = f"""
        SELECT cluster, COUNT(DISTINCT node) as node_count
        FROM kube_node_info
        {where_clause}
        GROUP BY cluster
    """

    # Get namespace count
    ns_sql = f"""
        SELECT cluster, COUNT(DISTINCT namespace) as namespace_count
        FROM kube_pod_info
        {where_clause}
        GROUP BY cluster
    """

    # Get pod count
    pod_sql = f"""
        SELECT cluster, COUNT(DISTINCT pod) as pod_count
        FROM kube_pod_info
        {where_clause}
        GROUP BY cluster
    """

    client = get_client()
    node_records = client.query_to_records("kubernetes", node_sql)
    ns_records = client.query_to_records("kubernetes", ns_sql)
    pod_records = client.query_to_records("kubernetes", pod_sql)

    # Merge results
    summary = {}
    for r in node_records:
        c = r.get("cluster", "unknown")
        summary.setdefault(c, {})["node_count"] = r.get("node_count", 0)

    for r in ns_records:
        c = r.get("cluster", "unknown")
        summary.setdefault(c, {})["namespace_count"] = r.get("namespace_count", 0)

    for r in pod_records:
        c = r.get("cluster", "unknown")
        summary.setdefault(c, {})["pod_count"] = r.get("pod_count", 0)

    if not summary:
        return "No cluster summary data found."

    result = [{"cluster": k, **v} for k, v in summary.items()]
    return format_result({"cluster_filter": cluster or "all", "clusters": result})


# =============================================================================
# Tool Registry
# =============================================================================

TOOLS = {
    # Schema discovery
    "list_databases": {
        "function": list_databases,
        "description": "List all available databases in GreptimeDB",
        "parameters": {},
    },
    "list_tables": {
        "function": list_tables,
        "description": "List all tables in a database",
        "parameters": {
            "database": {
                "type": "string",
                "description": "Database name (e.g., 'vantage', 'kubernetes')",
                "required": True,
            }
        },
    },
    "describe_table": {
        "function": describe_table,
        "description": "Get schema information for a table",
        "parameters": {
            "database": {
                "type": "string",
                "description": "Database name",
                "required": True,
            },
            "table": {
                "type": "string",
                "description": "Table name",
                "required": True,
            },
        },
    },
    # Raw SQL
    "query_sql": {
        "function": query_sql,
        "description": "Execute a SQL query against GreptimeDB. Only SELECT queries are allowed.",
        "parameters": {
            "database": {
                "type": "string",
                "description": "Database name to query (vantage, kubernetes, etc.)",
                "required": True,
            },
            "sql": {
                "type": "string",
                "description": "SQL query to execute (SELECT only)",
                "required": True,
            },
        },
    },
    # Cost analysis
    "get_total_costs": {
        "function": get_total_costs,
        "description": "Get total cloud costs for a date range, grouped by provider/account/service",
        "parameters": {
            "start_date": {
                "type": "string",
                "description": "Start date (YYYY-MM-DD). Default: 30 days ago",
                "required": False,
            },
            "end_date": {
                "type": "string",
                "description": "End date (YYYY-MM-DD). Default: today",
                "required": False,
            },
            "group_by": {
                "type": "string",
                "description": "Grouping: 'provider', 'account', or 'service'. Default: provider",
                "required": False,
            },
        },
    },
    "get_costs_by_provider": {
        "function": get_costs_by_provider,
        "description": "Get daily costs grouped by cloud provider (AWS, GCP, Azure, etc.)",
        "parameters": {
            "start_date": {
                "type": "string",
                "description": "Start date (YYYY-MM-DD)",
                "required": False,
            },
            "end_date": {
                "type": "string",
                "description": "End date (YYYY-MM-DD)",
                "required": False,
            },
        },
    },
    "get_costs_by_account": {
        "function": get_costs_by_account,
        "description": "Get daily costs grouped by account",
        "parameters": {
            "start_date": {
                "type": "string",
                "description": "Start date (YYYY-MM-DD)",
                "required": False,
            },
            "end_date": {
                "type": "string",
                "description": "End date (YYYY-MM-DD)",
                "required": False,
            },
            "provider": {
                "type": "string",
                "description": "Optional provider filter (aws, gcp, azure)",
                "required": False,
            },
        },
    },
    "get_costs_by_service": {
        "function": get_costs_by_service,
        "description": "Get costs grouped by service",
        "parameters": {
            "start_date": {
                "type": "string",
                "description": "Start date (YYYY-MM-DD)",
                "required": False,
            },
            "end_date": {
                "type": "string",
                "description": "End date (YYYY-MM-DD)",
                "required": False,
            },
            "provider": {
                "type": "string",
                "description": "Optional provider filter",
                "required": False,
            },
            "account_id": {
                "type": "string",
                "description": "Optional account ID filter",
                "required": False,
            },
        },
    },
    "get_top_services": {
        "function": get_top_services,
        "description": "Get the top N most expensive services",
        "parameters": {
            "start_date": {
                "type": "string",
                "description": "Start date (YYYY-MM-DD)",
                "required": False,
            },
            "end_date": {
                "type": "string",
                "description": "End date (YYYY-MM-DD)",
                "required": False,
            },
            "limit": {
                "type": "integer",
                "description": "Number of top services to return (default: 10, max: 50)",
                "required": False,
            },
        },
    },
    # Kubernetes
    "get_kubernetes_costs": {
        "function": get_kubernetes_costs,
        "description": "Get Kubernetes infrastructure costs from node hourly rates",
        "parameters": {
            "cluster": {
                "type": "string",
                "description": "Optional cluster name filter",
                "required": False,
            },
            "namespace": {
                "type": "string",
                "description": "Optional namespace filter",
                "required": False,
            },
            "start_date": {
                "type": "string",
                "description": "Start date (YYYY-MM-DD). Default: 7 days ago",
                "required": False,
            },
            "end_date": {
                "type": "string",
                "description": "End date (YYYY-MM-DD). Default: today",
                "required": False,
            },
        },
    },
    "get_resource_usage": {
        "function": get_resource_usage,
        "description": "Get current CPU and memory usage for Kubernetes workloads",
        "parameters": {
            "cluster": {
                "type": "string",
                "description": "Optional cluster name filter",
                "required": False,
            },
            "namespace": {
                "type": "string",
                "description": "Optional namespace filter",
                "required": False,
            },
        },
    },
    "get_cluster_summary": {
        "function": get_cluster_summary,
        "description": "Get a summary of Kubernetes cluster resources (nodes, namespaces, pods)",
        "parameters": {
            "cluster": {
                "type": "string",
                "description": "Optional cluster name filter",
                "required": False,
            },
        },
    },
}
