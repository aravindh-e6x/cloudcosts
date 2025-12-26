"""GreptimeDB client for writing mock metrics."""

from datetime import datetime
from typing import Any
import pymysql


class GreptimeDB:
    """Client for interacting with GreptimeDB."""

    def __init__(self, host: str, port: int, user: str, password: str, database: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self._conn = None

    def connect(self) -> pymysql.Connection:
        """Get or create database connection."""
        if self._conn is None or not self._conn.open:
            self._conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                autocommit=True,
            )
        return self._conn

    def execute(self, sql: str) -> None:
        """Execute a SQL statement."""
        conn = self.connect()
        with conn.cursor() as cursor:
            cursor.execute(sql)

    def create_database(self) -> None:
        """Create the database if it doesn't exist."""
        # Connect without database first
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
        print(f"Database '{self.database}' ready")

    def insert(self, table: str, data: dict[str, Any]) -> None:
        """Insert a row into a table."""
        columns = list(data.keys())
        values = []
        for v in data.values():
            if isinstance(v, str):
                values.append(f"'{v}'")
            elif isinstance(v, datetime):
                values.append(f"'{v.isoformat()}'")
            elif v is None:
                values.append("NULL")
            else:
                values.append(str(v))

        sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(values)})"
        self.execute(sql)

    def insert_batch(self, table: str, rows: list[dict[str, Any]]) -> None:
        """Insert multiple rows into a table efficiently."""
        if not rows:
            return

        columns = list(rows[0].keys())
        value_rows = []

        for data in rows:
            values = []
            for col in columns:
                v = data.get(col)
                if isinstance(v, str):
                    values.append(f"'{v}'")
                elif isinstance(v, datetime):
                    values.append(f"'{v.isoformat()}'")
                elif v is None:
                    values.append("NULL")
                else:
                    values.append(str(v))
            value_rows.append(f"({', '.join(values)})")

        sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES {', '.join(value_rows)}"
        self.execute(sql)

    def close(self) -> None:
        """Close the database connection."""
        if self._conn is not None:
            self._conn.close()
            self._conn = None
