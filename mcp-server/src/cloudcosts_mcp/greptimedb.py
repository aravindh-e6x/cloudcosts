"""GreptimeDB client for executing SQL queries."""

import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)


class GreptimeDBClient:
    """Client for querying GreptimeDB via HTTP SQL API."""

    def __init__(self, url: str, username: str = "", password: str = ""):
        """Initialize the GreptimeDB client.

        Args:
            url: Base URL for GreptimeDB (e.g., https://greptimedb.cloudcosts.in)
            username: Basic auth username
            password: Basic auth password
        """
        self.url = url.rstrip("/")
        self.session = requests.Session()
        if username and password:
            self.session.auth = (username, password)
        self.session.headers.update({"Content-Type": "application/x-www-form-urlencoded"})

    def execute_sql(self, database: str, sql: str, timeout: int = 30) -> dict[str, Any]:
        """Execute a SQL statement against GreptimeDB.

        Args:
            database: Database name to query
            sql: SQL statement to execute
            timeout: Request timeout in seconds

        Returns:
            Response dict with 'output' (results) or 'error' (error message)
        """
        url = f"{self.url}/v1/sql?db={database}"
        try:
            response = self.session.post(url, data={"sql": sql}, timeout=timeout)
            result = response.json()

            if not response.ok:
                error_msg = result.get("error", f"HTTP {response.status_code}")
                logger.error(f"SQL error: {error_msg}")
                return {"error": error_msg}

            return result

        except requests.exceptions.Timeout:
            logger.error(f"Query timeout after {timeout}s")
            return {"error": f"Query timeout after {timeout} seconds"}
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            return {"error": str(e)}
        except ValueError as e:
            logger.error(f"Invalid JSON response: {e}")
            return {"error": "Invalid response from GreptimeDB"}

    def list_databases(self) -> list[str]:
        """List all databases in GreptimeDB.

        Returns:
            List of database names
        """
        result = self.execute_sql("public", "SHOW DATABASES")
        if "error" in result:
            return []

        databases = []
        for output in result.get("output", []):
            if output.get("records") and output["records"].get("rows"):
                for row in output["records"]["rows"]:
                    if row:
                        databases.append(row[0])
        return databases

    def list_tables(self, database: str) -> list[str]:
        """List all tables in a database.

        Args:
            database: Database name

        Returns:
            List of table names
        """
        result = self.execute_sql(database, "SHOW TABLES")
        if "error" in result:
            return []

        tables = []
        for output in result.get("output", []):
            if output.get("records") and output["records"].get("rows"):
                for row in output["records"]["rows"]:
                    if row:
                        tables.append(row[0])
        return tables

    def describe_table(self, database: str, table: str) -> dict[str, Any]:
        """Get schema information for a table.

        Args:
            database: Database name
            table: Table name

        Returns:
            Dict with column information or error
        """
        result = self.execute_sql(database, f"DESCRIBE {table}")
        if "error" in result:
            return result

        columns = []
        for output in result.get("output", []):
            if output.get("records"):
                schema = output["records"].get("schema", {})
                column_schemas = schema.get("column_schemas", [])
                rows = output["records"].get("rows", [])

                # Get column names from schema
                col_names = [col.get("name", f"col_{i}") for i, col in enumerate(column_schemas)]

                for row in rows:
                    col_info = dict(zip(col_names, row))
                    columns.append(col_info)

        return {"columns": columns}

    def query_to_records(self, database: str, sql: str) -> list[dict[str, Any]]:
        """Execute a query and return results as a list of records.

        Args:
            database: Database name
            sql: SQL query to execute

        Returns:
            List of dicts, each representing a row
        """
        result = self.execute_sql(database, sql)
        if "error" in result:
            return []

        records = []
        for output in result.get("output", []):
            if output.get("records"):
                schema = output["records"].get("schema", {})
                column_schemas = schema.get("column_schemas", [])
                rows = output["records"].get("rows", [])

                col_names = [col.get("name", f"col_{i}") for i, col in enumerate(column_schemas)]

                for row in rows:
                    records.append(dict(zip(col_names, row)))

        return records
