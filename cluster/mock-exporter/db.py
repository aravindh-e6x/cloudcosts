"""GreptimeDB client for writing mock metrics."""

import logging
import time
from datetime import datetime
from typing import Any
import pymysql

log = logging.getLogger(__name__)


class GreptimeDB:
    """Client for interacting with GreptimeDB."""

    def __init__(self, host: str, port: int, user: str, password: str, database: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self._conn = None
        self._tables_created: set[str] = set()

    def connect(self) -> pymysql.Connection:
        """Get or create database connection."""
        if self._conn is None or not self._conn.open:
            # Must specify database in connection - USE command doesn't work in GreptimeDB
            self._conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                autocommit=True,
            )
            log.info(f"Connected to database: {self.database}")
        return self._conn

    def execute(self, sql: str) -> None:
        """Execute a SQL statement."""
        conn = self.connect()
        with conn.cursor() as cursor:
            log.debug(f"[{self.database}] Executing: {sql[:200]}...")
            cursor.execute(sql)

    def create_database(self) -> None:
        """Create the database if it doesn't exist."""
        conn = pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            autocommit=True,
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.database}")
        conn.close()
        log.info(f"Database '{self.database}' ready")

    def _infer_type(self, value: Any) -> str:
        """Infer GreptimeDB column type from Python value."""
        if isinstance(value, bool):
            return "BOOLEAN"
        elif isinstance(value, int):
            return "BIGINT"
        elif isinstance(value, float):
            return "DOUBLE"
        elif isinstance(value, datetime):
            return "TIMESTAMP(3) TIME INDEX"
        else:
            return "STRING"

    def _format_value(self, value: Any) -> str:
        """Format a Python value for SQL."""
        if isinstance(value, str):
            return f"'{value}'"
        elif isinstance(value, datetime):
            # GreptimeDB expects milliseconds
            return str(int(value.timestamp() * 1000))
        elif value is None:
            return "NULL"
        else:
            return str(value)

    def _create_table(self, table: str, data: dict[str, Any]) -> None:
        """Create table if it doesn't exist."""
        # GreptimeDB converts table names to lowercase
        table = table.lower()
        if table in self._tables_created:
            return

        columns = []
        time_index = None
        for col, val in data.items():
            col_type = self._infer_type(val)
            if "TIME INDEX" in col_type:
                time_index = col
                columns.append(f"{col} {col_type.replace(' TIME INDEX', '')}")
            else:
                columns.append(f"{col} {col_type}")

        if time_index is None:
            raise ValueError(f"Table {table} must have a timestamp column")

        sql = f"""CREATE TABLE IF NOT EXISTS {table} (
            {', '.join(columns)},
            TIME INDEX ({time_index})
        )"""

        try:
            log.info(f"[{self.database}] Creating table: {table}")
            self.execute(sql)
            self._tables_created.add(table)
            log.info(f"[{self.database}] Table created: {table}")
        except Exception as e:
            log.error(f"[{self.database}] Failed to create table {table}: {e}")
            # Table might already exist with different schema
            if "already exists" in str(e).lower():
                self._tables_created.add(table)
            else:
                raise

    def table_exists(self, table: str) -> bool:
        """Check if a table exists in the database."""
        try:
            conn = self.connect()
            with conn.cursor() as cursor:
                cursor.execute(f"SELECT 1 FROM {table} LIMIT 0")
            return True
        except Exception:
            return False

    def wait_for_table(self, table: str, timeout: int = 30) -> bool:
        """Wait for a table to become available."""
        start = time.time()
        while time.time() - start < timeout:
            if self.table_exists(table):
                return True
            time.sleep(1)
        return False

    def verify_tables(self, tables: list[str]) -> bool:
        """Verify all tables exist before inserting data."""
        log.info(f"[{self.database}] Verifying {len(tables)} tables...")
        for table in tables:
            if not self.table_exists(table):
                log.warning(f"[{self.database}] Table {table} does not exist")
                return False
        log.info(f"[{self.database}] All tables verified")
        return True

    def insert(self, table: str, data: dict[str, Any]) -> None:
        """Insert a row into a table (creates table if needed)."""
        # GreptimeDB converts table names to lowercase
        table = table.lower()
        self._create_table(table, data)

        columns = list(data.keys())
        values = [self._format_value(v) for v in data.values()]

        sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(values)})"

        # Retry logic for table not found (GreptimeDB eventual consistency)
        max_retries = 3
        for attempt in range(max_retries):
            try:
                self.execute(sql)
                return
            except Exception as e:
                if "TableNotFound" in str(e) and attempt < max_retries - 1:
                    log.warning(f"[{self.database}] Table {table} not ready, retrying in 5s... (attempt {attempt + 1})")
                    time.sleep(5)
                    # Force re-creation of the table
                    self._tables_created.discard(table)
                    self._create_table(table, data)
                else:
                    raise

    def insert_batch(self, table: str, rows: list[dict[str, Any]]) -> None:
        """Insert multiple rows into a table efficiently."""
        if not rows:
            return

        self._create_table(table, rows[0])

        columns = list(rows[0].keys())
        value_rows = []

        for data in rows:
            values = [self._format_value(data.get(col)) for col in columns]
            value_rows.append(f"({', '.join(values)})")

        sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES {', '.join(value_rows)}"
        self.execute(sql)

    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
