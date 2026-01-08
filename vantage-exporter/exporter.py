#!/usr/bin/env python3
"""
Vantage Exporter - Pushes Vantage cloud cost data directly to Mimir.

Queries Vantage API and pushes metrics to Mimir via Prometheus remote write protocol.
Collects:
- Daily costs by provider
- Daily costs by account
- Daily costs by service (per account)
- Cost report data (for POC customers)
"""

import os
import time
import logging
import struct
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

import requests
import snappy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('vantage-exporter')

# Configuration from environment variables
VANTAGE_API_TOKEN = os.environ.get('VANTAGE_API_TOKEN', 'vntg_tkn_883ebd03ad6b99710eee1d152a33d52994cb822b')
VANTAGE_API_URL = os.environ.get('VANTAGE_API_URL', 'https://api.vantage.sh')
VANTAGE_WORKSPACE_TOKEN = os.environ.get('VANTAGE_WORKSPACE_TOKEN', 'wrkspc_835ba35b0dc804f9')
GREPTIMEDB_URL = os.environ.get('GREPTIMEDB_URL', 'https://greptimedb.cloudcosts.in')
GREPTIMEDB_USERNAME = os.environ.get('GREPTIMEDB_USERNAME', 'e6data')
GREPTIMEDB_PASSWORD = os.environ.get('GREPTIMEDB_PASSWORD', 'cloudcosts')
GREPTIMEDB_DATABASE = os.environ.get('GREPTIMEDB_DATABASE', 'vantagesql')
PUSH_INTERVAL = int(os.environ.get('PUSH_INTERVAL', '3600'))  # 1 hour default
HISTORICAL_DAYS = int(os.environ.get('HISTORICAL_DAYS', '120'))  # 90 days of daily data

# Collection flags
COLLECT_BY_PROVIDER = os.environ.get('COLLECT_BY_PROVIDER', 'true').lower() == 'true'
COLLECT_BY_ACCOUNT = os.environ.get('COLLECT_BY_ACCOUNT', 'true').lower() == 'true'
COLLECT_BY_SERVICE = os.environ.get('COLLECT_BY_SERVICE', 'true').lower() == 'true'
COLLECT_BY_RESOURCE = os.environ.get('COLLECT_BY_RESOURCE', 'false').lower() == 'true'

# Cost report tokens for POC customers (comma-separated)
COST_REPORT_TOKENS = os.environ.get('COST_REPORT_TOKENS', '')

# VQL filter for all providers
ALL_PROVIDERS_VQL = "((costs.provider = 'aws') OR (costs.provider = 'azure') OR (costs.provider = 'gcp') OR (costs.provider = 'databricks') OR (costs.provider = 'snowflake'))"


class VantageClient:
    """Client for Vantage API using VQL filter queries."""

    def __init__(self, api_token: str, api_url: str, workspace_token: str):
        self.api_token = api_token
        self.api_url = api_url.rstrip('/')
        self.workspace_token = workspace_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Accept': 'application/json'
        })

    def _make_request(self, endpoint: str, params: Optional[Dict] = None, max_retries: int = 3) -> Optional[Dict]:
        """Make a request to the Vantage API with retry logic."""
        url = f"{self.api_url}{endpoint}"

        for attempt in range(max_retries):
            try:
                # Small delay between requests to avoid rate limiting
                if attempt > 0:
                    time.sleep(0.5)

                response = self.session.get(url, params=params, timeout=60)

                if response.status_code == 429:
                    # Rate limited - get wait time from headers
                    rate_reset = response.headers.get('x-rate-limit-reset', '')
                    wait_time = 10  # default

                    if rate_reset:
                        try:
                            reset_timestamp = int(rate_reset)
                            wait_time = max(1, reset_timestamp - int(time.time()))
                            wait_time = min(wait_time, 120)  # Cap at 2 minutes
                        except:
                            pass

                    logger.warning(f"Rate limited (429), waiting {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue

                if not response.ok:
                    logger.error(f"API error {response.status_code}: {response.text[:200]}")
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                        continue
                    return None

                return response.json()

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed for {endpoint}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                return None

        return None

    def query_costs(self, vql_filter: str, start_date: str, end_date: str,
                    groupings: Optional[List[str]] = None,
                    date_bin: str = "day") -> List[Dict]:
        """Query costs using VQL filter with optional groupings."""
        params = {
            'workspace_token': self.workspace_token,
            'filter': vql_filter,
            'start_date': start_date,
            'end_date': end_date,
            'date_bin': date_bin,
        }

        if groupings:
            params['groupings'] = ','.join(groupings)

        all_costs = []
        page = 1

        while True:
            params['page'] = page
            logger.debug(f"Querying costs page {page}: {vql_filter[:50]}...")

            data = self._make_request('/v2/costs', params=params)

            if data and 'costs' in data:
                costs = data['costs']
                all_costs.extend(costs)
                logger.debug(f"  Got {len(costs)} records (total: {len(all_costs)})")

                # Check if there are more pages
                links = data.get('links', {})
                if not links.get('next'):
                    break
                page += 1
            else:
                break

        return all_costs

    def get_cost_reports(self) -> List[Dict]:
        """Get list of all cost reports."""
        data = self._make_request('/v2/cost_reports')
        if data and 'cost_reports' in data:
            return data['cost_reports']
        return []

    def query_cost_report(self, report_token: str, start_date: str, end_date: str,
                          groupings: Optional[List[str]] = None) -> List[Dict]:
        """Query costs from a specific cost report."""
        params = {
            'cost_report_token': report_token,
            'start_date': start_date,
            'end_date': end_date,
        }

        if groupings:
            params['groupings'] = ','.join(groupings)

        all_costs = []
        page = 1

        while True:
            params['page'] = page
            data = self._make_request('/v2/costs', params=params)

            if data and 'costs' in data:
                costs = data['costs']
                all_costs.extend(costs)

                links = data.get('links', {})
                if not links.get('next'):
                    break
                page += 1
            else:
                break

        return all_costs


class GreptimeDBClient:
    """Client for pushing metrics to GreptimeDB.

    Supports:
    - Prometheus remote write (default, time-series style)
    - Direct SQL inserts (optional, easier for SQL-based dashboards)
    """

    def __init__(
        self,
        greptimedb_url: str,
        username: str = '',
        password: str = '',
        database: str = 'vantage',
        write_mode: str = 'prom'
    ):
        self.greptimedb_url = greptimedb_url.rstrip('/')
        self.database = database
        self.username = username
        self.password = password
        self.write_mode = write_mode.lower() if write_mode else 'prom'

        # Prometheus remote write endpoint (used when write_mode == 'prom')
        self.push_url = f"{self.greptimedb_url}/v1/prometheus/write?db={database}"
        self.session = requests.Session()
        # Note: headers are configured per-request depending on write_mode
        if username and password:
            self.session.auth = (username, password)

        self._ensure_database_exists()

    def _ensure_database_exists(self):
        """Create the database if it doesn't exist."""
        sql_url = f"{self.greptimedb_url}/v1/sql"
        try:
            response = requests.post(
                sql_url,
                data={'sql': f'CREATE DATABASE IF NOT EXISTS {self.database}'},
                auth=(self.username, self.password) if self.username else None,
                timeout=10
            )
            if response.ok:
                logger.info(f"Database '{self.database}' ensured to exist")
            else:
                logger.warning(f"Failed to ensure database exists: {response.status_code} - {response.text}")
        except Exception as e:
            logger.warning(f"Failed to ensure database exists: {e}")

    def _quote_identifier(self, identifier: str) -> str:
        """Quote an SQL identifier to handle reserved keywords."""
        # Use double quotes for GreptimeDB identifiers
        return f'"{identifier}"'
    
    def _ensure_table_exists_sql(self, table_name: str, label_keys: List[str]) -> bool:
        """Ensure a table exists for SQL mode, creating it if needed.
        
        Returns True if table exists or was created successfully, False otherwise.
        """
        sql_url = f"{self.greptimedb_url}/v1/sql?db={self.database}"
        
        # Build column definitions - quote all identifiers to handle reserved keywords
        columns = ['greptime_timestamp TIMESTAMP TIME INDEX']
        for key in label_keys:
            quoted_key = self._quote_identifier(key)
            columns.append(f"{quoted_key} STRING")
        columns.append('greptime_value DOUBLE')
        
        create_table_sql = (
            f"CREATE TABLE IF NOT EXISTS {table_name} (\n"
            f"  {', '.join(columns)}\n"
            f")"
        )
        
        try:
            logger.debug(f"Creating table '{table_name}' in database '{self.database}' with SQL: {create_table_sql[:200]}...")
            response = self.session.post(
                sql_url,
                data={'sql': create_table_sql},
                auth=(self.username, self.password) if self.username else None,
                timeout=10
            )
            if response.ok:
                try:
                    result = response.json()
                    if result.get('error'):
                        error_msg = result.get('error', 'Unknown error')
                        logger.error(f"Table creation failed for '{table_name}' in database '{self.database}': {error_msg}")
                        logger.debug(f"Full SQL: {create_table_sql}")
                        return False
                    else:
                        logger.info(f"Table '{table_name}' ensured to exist in database '{self.database}'")
                        return True
                except ValueError:
                    # Response is not JSON, but status is OK - assume success
                    logger.info(f"Table '{table_name}' creation request succeeded (non-JSON response)")
                    return True
            else:
                logger.error(f"Failed to ensure table exists: HTTP {response.status_code} - {response.text}")
                logger.debug(f"Full SQL: {create_table_sql}")
                return False
        except Exception as e:
            logger.error(f"Exception while ensuring table exists: {e}")
            return False

    def _encode_varint(self, value: int) -> bytes:
        """Encode an integer as a varint."""
        bits = value & 0x7f
        value >>= 7
        result = b''
        while value:
            result += bytes([0x80 | bits])
            bits = value & 0x7f
            value >>= 7
        result += bytes([bits])
        return result

    def _encode_string(self, field_num: int, s: str) -> bytes:
        """Encode a string field in protobuf format."""
        encoded = s.encode('utf-8')
        return self._encode_varint((field_num << 3) | 2) + self._encode_varint(len(encoded)) + encoded

    def _encode_label(self, name: str, value: str) -> bytes:
        """Encode a Label message."""
        return self._encode_string(1, name) + self._encode_string(2, value)

    def _encode_sample(self, value: float, timestamp_ms: int) -> bytes:
        """Encode a Sample message."""
        result = self._encode_varint((1 << 3) | 1)  # wire type 1 = fixed64
        result += struct.pack('<d', value)
        result += self._encode_varint((2 << 3) | 0)  # wire type 0 = varint
        result += self._encode_varint(timestamp_ms)
        return result

    def _encode_timeseries(self, labels: List[tuple], samples: List[tuple]) -> bytes:
        """Encode a TimeSeries message."""
        result = b''
        for name, value in labels:
            label_data = self._encode_label(name, value)
            result += self._encode_varint((1 << 3) | 2)
            result += self._encode_varint(len(label_data))
            result += label_data
        for value, timestamp_ms in samples:
            sample_data = self._encode_sample(value, timestamp_ms)
            result += self._encode_varint((2 << 3) | 2)
            result += self._encode_varint(len(sample_data))
            result += sample_data
        return result

    def _encode_write_request(self, timeseries_list: List[bytes]) -> bytes:
        """Encode a WriteRequest message."""
        result = b''
        for ts_data in timeseries_list:
            result += self._encode_varint((1 << 3) | 2)
            result += self._encode_varint(len(ts_data))
            result += ts_data
        return result

    def push_metrics(self, metrics: List[Dict], batch_size: int = 500) -> bool:
        """Push metrics to GreptimeDB in batches."""
        if not metrics:
            return True

        success = True
        if self.write_mode == 'sql':
            logger.info("GreptimeDBClient running in SQL write mode")
            for i in range(0, len(metrics), batch_size):
                batch = metrics[i:i + batch_size]
                if not self._push_batch_sql(batch):
                    success = False
        else:
            logger.info("GreptimeDBClient running in Prometheus remote write mode")
            for i in range(0, len(metrics), batch_size):
                batch = metrics[i:i + batch_size]
                if not self._push_batch_prometheus(batch):
                    success = False

        return success

    def _push_batch_prometheus(self, metrics: List[Dict]) -> bool:
        """Push a batch of metrics via Prometheus remote write."""
        # Configure headers for remote write
        self.session.headers.clear()
        self.session.headers.update({
            'Content-Type': 'application/x-protobuf',
            'Content-Encoding': 'snappy',
            'X-Prometheus-Remote-Write-Version': '0.1.0'
        })

        timeseries_list = []

        for metric in metrics:
            labels = [('__name__', metric['name'])]
            labels.extend(sorted(metric.get('labels', {}).items()))

            samples = [(metric['value'], metric['timestamp_ms'])]
            ts_data = self._encode_timeseries(labels, samples)
            timeseries_list.append(ts_data)

        write_request = self._encode_write_request(timeseries_list)
        compressed = snappy.compress(write_request)

        try:
            response = self.session.post(self.push_url, data=compressed, timeout=30)
            if response.status_code in (200, 204):
                logger.info(f"Successfully pushed {len(metrics)} metrics to GreptimeDB via remote write")
                return True
            else:
                logger.error(f"Failed to push metrics via remote write: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to push metrics to GreptimeDB via remote write: {e}")
            return False

    def _escape_sql_string(self, value: str) -> str:
        """Escape a string for safe inclusion in SQL single-quoted literals."""
        if value is None:
            return ''
        return str(value).replace("'", "''")

    def _push_batch_sql(self, metrics: List[Dict]) -> bool:
        """Push a batch of metrics using SQL INSERT statements.

        Creates/uses tables matching the metric names, with schema:
          - greptime_timestamp (TimestampMillisecond)
          - greptime_value (Float64)
          - one column per label key (String)
        """
        if not metrics:
            return True

        # Configure headers for SQL API
        self.session.headers.clear()
        # Use database as query parameter, not in table name
        sql_url = f"{self.greptimedb_url}/v1/sql?db={self.database}"
        logger.debug(f"Using SQL URL: {sql_url} (database: {self.database})")

        # Group metrics by table (metric name)
        grouped: Dict[str, List[Dict]] = {}
        for m in metrics:
            name = m.get('name', '')
            if not name:
                continue
            grouped.setdefault(name, []).append(m)

        all_ok = True

        for metric_name, items in grouped.items():
            # Collect all label keys seen for this metric name
            label_keys = set()
            for m in items:
                label_keys.update((m.get('labels') or {}).keys())

            label_keys = sorted(label_keys)
            # Table name without database prefix (database is in URL query param)
            table_name = metric_name

            # Log which accounts are being processed (for account metrics)
            if 'account_name' in label_keys:
                accounts_in_batch = set()
                for m in items:
                    account_name = m.get('labels', {}).get('account_name', 'unknown')
                    accounts_in_batch.add(account_name)
                logger.info(f"Processing {len(items)} metrics for {len(accounts_in_batch)} accounts in {table_name}: {sorted(accounts_in_batch)[:10]}")

            # Ensure table exists before inserting
            table_created = self._ensure_table_exists_sql(table_name, label_keys)
            if not table_created:
                logger.error(f"Skipping insert for {table_name} - table creation failed. Check logs above for details.")
                all_ok = False
                continue
            
            # Small delay to ensure table is fully created
            time.sleep(0.1)

            # Build INSERT with multiple VALUES rows
            values_sql_parts = []
            for m in items:
                ts_ms = int(m.get('timestamp_ms', 0))
                value = float(m.get('value', 0.0))
                labels = m.get('labels') or {}

                # Build value list: timestamp, labels..., value
                ts_expr = f"to_timestamp_millis({ts_ms})"

                label_values_sql = []
                for key in label_keys:
                    raw_val = labels.get(key, '')
                    escaped = self._escape_sql_string(raw_val)
                    label_values_sql.append(f"'{escaped}'")

                row_sql = f"({ts_expr}, {', '.join(label_values_sql)}, {value})"
                values_sql_parts.append(row_sql)

            if not values_sql_parts:
                continue

            # Column list: greptime_timestamp, <label keys>, greptime_value
            # Quote all column names to handle reserved keywords
            columns = ['greptime_timestamp']
            columns.extend([self._quote_identifier(key) for key in label_keys])
            columns.append('greptime_value')
            columns_sql = ', '.join(columns)

            # Break large inserts into smaller batches to avoid SQL statement size limits
            batch_size = 100  # Insert 100 rows at a time
            total_inserted = 0
            
            for batch_start in range(0, len(values_sql_parts), batch_size):
                batch_end = min(batch_start + batch_size, len(values_sql_parts))
                batch_values = values_sql_parts[batch_start:batch_end]
                
                # Build INSERT statement for this batch
                insert_sql = f"INSERT INTO {table_name} ({columns_sql}) VALUES {', '.join(batch_values)}"
                
                try:
                    response = self.session.post(
                        sql_url,
                        data={'sql': insert_sql},
                        auth=(self.username, self.password) if self.username else None,
                        timeout=30,
                    )
                    
                    # Check both HTTP status and JSON response for errors
                    if response.ok:
                        try:
                            result = response.json()
                            if result.get('error'):
                                error_msg = result.get('error', 'Unknown error')
                                all_ok = False
                                logger.error(
                                    f"Failed to insert batch {batch_start}-{batch_end} into {table_name} via SQL: {error_msg}"
                                )
                                logger.debug(f"Failed SQL (first 500 chars): {insert_sql[:500]}")
                                continue
                            else:
                                total_inserted += len(batch_values)
                                logger.debug(f"Successfully inserted batch {batch_start}-{batch_end} ({len(batch_values)} rows) into {table_name}")
                        except ValueError:
                            # Response is not JSON, but HTTP is OK - assume success
                            total_inserted += len(batch_values)
                            logger.debug(f"Successfully inserted batch {batch_start}-{batch_end} ({len(batch_values)} rows) into {table_name}")
                    else:
                        all_ok = False
                        logger.error(
                            f"Failed to insert batch {batch_start}-{batch_end} into {table_name} via SQL: "
                            f"HTTP {response.status_code} - {response.text}"
                        )
                        logger.debug(f"Failed SQL (first 500 chars): {insert_sql[:500]}")
                        
                except requests.exceptions.RequestException as e:
                    all_ok = False
                    logger.error(f"Failed to insert batch {batch_start}-{batch_end} into {table_name} via SQL: {e}")
            
            if total_inserted > 0:
                logger.info(f"Successfully inserted {total_inserted}/{len(items)} rows into {table_name} via SQL")
            else:
                logger.warning(f"No rows were inserted into {table_name} - all batches failed")

        return all_ok


class VantageExporter:
    """Main exporter that collects from Vantage and pushes to GreptimeDB."""

    def __init__(self, vantage_client: VantageClient, greptimedb_client: GreptimeDBClient = None):
        self.vantage = vantage_client
        self.greptimedb = greptimedb_client

    def collect_all_data(self, historical_days: int = None) -> Dict[str, Any]:
        """
        Collect all cost data from Vantage API.

        Returns a dictionary with:
        - costs_by_provider: Daily costs grouped by provider
        - costs_by_account: Daily costs grouped by provider and account
        - costs_by_service: Daily costs grouped by provider, account, and service
        - cost_reports: Data from specific cost reports (if configured)
        - metadata: Collection metadata (date range, duration, etc.)
        """
        logger.info("Starting data collection from Vantage...")
        start_time = time.time()

        # Calculate date range
        days = historical_days or HISTORICAL_DAYS
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')

        logger.info(f"Collecting data from {start_str} to {end_str}")

        result = {
            'costs_by_provider': [],
            'costs_by_account': [],
            'costs_by_service': [],
            'cost_reports': [],
            'metadata': {
                'start_date': start_str,
                'end_date': end_str,
                'historical_days': days,
            }
        }

        # Collect costs by provider
        if COLLECT_BY_PROVIDER:
            logger.info("Collecting costs by provider...")
            result['costs_by_provider'] = self._fetch_costs_by_provider(start_str, end_str)

        # Collect costs by account
        if COLLECT_BY_ACCOUNT:
            logger.info("Collecting costs by account...")
            result['costs_by_account'] = self._fetch_costs_by_account(start_str, end_str)

        # Collect costs by service
        if COLLECT_BY_SERVICE:
            logger.info("Collecting costs by service...")
            result['costs_by_service'] = self._fetch_costs_by_service(start_str, end_str)

        # Collect cost report data (POC customers)
        if COST_REPORT_TOKENS:
            logger.info("Collecting cost report data...")
            result['cost_reports'] = self._fetch_cost_reports(start_str, end_str)

        duration = time.time() - start_time
        result['metadata']['collection_duration_seconds'] = duration
        result['metadata']['total_records'] = (
            len(result['costs_by_provider']) +
            len(result['costs_by_account']) +
            len(result['costs_by_service']) +
            len(result['cost_reports'])
        )

        logger.info(f"Data collection completed in {duration:.2f}s, {result['metadata']['total_records']} total records")
        return result

    def _fetch_costs_by_provider(self, start_date: str, end_date: str) -> List[Dict]:
        """Fetch daily costs grouped by provider (raw data)."""
        costs = self.vantage.query_costs(
            vql_filter=ALL_PROVIDERS_VQL,
            start_date=start_date,
            end_date=end_date,
            groupings=['provider']
        )
        logger.info(f"  Fetched {len(costs)} provider cost records")
        return costs

    def _fetch_costs_by_account(self, start_date: str, end_date: str) -> List[Dict]:
        """Fetch daily costs grouped by provider and account (raw data)."""
        costs = self.vantage.query_costs(
            vql_filter=ALL_PROVIDERS_VQL,
            start_date=start_date,
            end_date=end_date,
            groupings=['provider', 'account_id']
        )
        # Log unique accounts found
        unique_accounts = set()
        for cost in costs:
            account_id = cost.get('account_id', 'unknown')
            account_name = cost.get('account_name', account_id)
            provider = cost.get('provider', 'unknown')
            unique_accounts.add(f"{provider}:{account_id}:{account_name}")
        logger.info(f"  Fetched {len(costs)} account cost records from {len(unique_accounts)} unique accounts")
        if len(unique_accounts) > 0:
            logger.debug(f"  Unique accounts: {sorted(unique_accounts)[:10]}")  # Log first 10
        return costs

    def _fetch_costs_by_service(self, start_date: str, end_date: str) -> List[Dict]:
        """Fetch daily costs grouped by provider, account, and service (raw data)."""
        costs = self.vantage.query_costs(
            vql_filter=ALL_PROVIDERS_VQL,
            start_date=start_date,
            end_date=end_date,
            groupings=['provider', 'account_id', 'service']
        )
        logger.info(f"  Fetched {len(costs)} service cost records")
        return costs

    def _fetch_cost_reports(self, start_date: str, end_date: str) -> List[Dict]:
        """Fetch costs from specific cost reports (raw data)."""
        tokens = [t.strip() for t in COST_REPORT_TOKENS.split(',') if t.strip()]

        # Get report metadata
        all_reports = self.vantage.get_cost_reports()
        report_names = {r['token']: r.get('title', r['token']) for r in all_reports}

        all_costs = []
        for token in tokens:
            report_name = report_names.get(token, token)
            logger.info(f"  Fetching cost report: {report_name}")
            costs = self.vantage.query_cost_report(token, start_date, end_date)
            # Add report metadata to each record
            for cost in costs:
                cost['report_token'] = token
                cost['report_name'] = report_name
            all_costs.extend(costs)

        logger.info(f"  Fetched {len(all_costs)} cost report records")
        return all_costs

    def collect_and_push(self):
        """Collect all metrics from Vantage and push to GreptimeDB."""
        # Collect raw data
        data = self.collect_all_data()

        # Convert to metrics format
        all_metrics = []
        all_metrics.extend(self._convert_provider_costs_to_metrics(data['costs_by_provider']))
        all_metrics.extend(self._convert_account_costs_to_metrics(data['costs_by_account']))
        all_metrics.extend(self._convert_service_costs_to_metrics(data['costs_by_service']))
        all_metrics.extend(self._convert_cost_reports_to_metrics(data['cost_reports']))

        # Push all metrics to GreptimeDB
        if all_metrics and self.greptimedb:
            logger.info(f"Pushing {len(all_metrics)} metrics to GreptimeDB...")
            self.greptimedb.push_metrics(all_metrics)

        logger.info(f"Collection and push completed, {len(all_metrics)} metrics")

    def _date_to_timestamp_ms(self, date_str: str) -> int:
        """Convert date string to millisecond timestamp.
        
        Adds 1 day to the date because Vantage API returns costs with the date
        when they occurred, but we need to shift them forward by 1 day to align
        with the correct display date.
        """
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        # Add 1 day to align costs with the correct date
        dt = dt + timedelta(days=1)
        return int(dt.timestamp() * 1000)

    def _sanitize_label(self, value: str) -> str:
        """Sanitize label value for Prometheus compatibility."""
        if not value:
            return 'unknown'
        return value.replace('"', '').replace('\\', '').replace('\n', ' ')[:128]

    def _convert_provider_costs_to_metrics(self, costs: List[Dict]) -> List[Dict]:
        """Convert provider costs to Prometheus metrics format."""
        metrics = []
        for cost in costs:
            provider = cost.get('provider', 'unknown')
            date = cost.get('accrued_at', cost.get('date', cost.get('accrued_date', '')))
            amount = float(cost.get('amount', 0))

            if not date:
                continue

            metrics.append({
                'name': 'vantage_daily_cost_by_provider',
                'labels': {'provider': provider},
                'value': amount,
                'timestamp_ms': self._date_to_timestamp_ms(date)
            })
        return metrics

    def _convert_account_costs_to_metrics(self, costs: List[Dict]) -> List[Dict]:
        """Convert account costs to Prometheus metrics format."""
        metrics = []
        seen_accounts = set()
        
        for cost in costs:
            provider = cost.get('provider', 'unknown')
            account_id = cost.get('account_id', 'unknown')
            account_name = cost.get('account_name') or str(account_id)
            
            # Track unique accounts for logging
            account_key = f"{provider}:{account_id}:{account_name}"
            if account_key not in seen_accounts:
                seen_accounts.add(account_key)
                logger.debug(f"Processing account: provider={provider}, account_id={account_id}, account_name={account_name}")
            
            date = cost.get('accrued_at', cost.get('date', cost.get('accrued_date', '')))
            amount = float(cost.get('amount', 0))

            if not date:
                logger.warning(f"Skipping cost record with no date: {cost}")
                continue

            metrics.append({
                'name': 'vantage_daily_cost_by_account',
                'labels': {
                    'provider': provider,
                    'account_id': str(account_id),
                    'account_name': self._sanitize_label(account_name),
                },
                'value': amount,
                'timestamp_ms': self._date_to_timestamp_ms(date)
            })
        
        logger.info(f"Converted {len(costs)} account cost records to {len(metrics)} metrics. Unique accounts: {len(seen_accounts)}")
        return metrics

    def _convert_service_costs_to_metrics(self, costs: List[Dict]) -> List[Dict]:
        """Convert service costs to Prometheus metrics format."""
        metrics = []
        for cost in costs:
            provider = cost.get('provider', 'unknown')
            account_id = cost.get('account_id', 'unknown')
            account_name = cost.get('account_name', account_id)
            service = cost.get('service', 'unknown')
            date = cost.get('accrued_at', cost.get('date', cost.get('accrued_date', '')))
            amount = float(cost.get('amount', 0))

            if not date:
                continue

            metrics.append({
                'name': 'vantage_daily_cost_by_service',
                'labels': {
                    'provider': provider,
                    'account_id': str(account_id),
                    'account_name': self._sanitize_label(account_name),
                    'service': self._sanitize_label(service),
                },
                'value': amount,
                'timestamp_ms': self._date_to_timestamp_ms(date)
            })
        return metrics

    def _convert_cost_reports_to_metrics(self, costs: List[Dict]) -> List[Dict]:
        """Convert cost report data to Prometheus metrics format."""
        metrics = []
        for cost in costs:
            date = cost.get('accrued_at', cost.get('date', cost.get('accrued_date', '')))
            amount = float(cost.get('amount', 0))
            provider = cost.get('provider', 'unknown')
            report_token = cost.get('report_token', 'unknown')
            report_name = cost.get('report_name', report_token)

            if not date:
                continue

            metrics.append({
                'name': 'vantage_cost_report',
                'labels': {
                    'report_token': report_token,
                    'report_name': self._sanitize_label(report_name),
                    'provider': provider,
                },
                'value': amount,
                'timestamp_ms': self._date_to_timestamp_ms(date)
            })
        return metrics


def main():
    """Main entry point."""
    if not VANTAGE_API_TOKEN:
        logger.error("VANTAGE_API_TOKEN environment variable is required")
        exit(1)

    logger.info("Starting Vantage Exporter (push mode)")
    logger.info(f"Vantage API: {VANTAGE_API_URL}")
    logger.info(f"Workspace Token: {VANTAGE_WORKSPACE_TOKEN}")
    logger.info(f"GreptimeDB URL: {GREPTIMEDB_URL}")
    logger.info(f"GreptimeDB Database: {GREPTIMEDB_DATABASE}")
    logger.info(f"Push interval: {PUSH_INTERVAL}s ({PUSH_INTERVAL/3600:.1f} hours)")
    logger.info(f"Historical days: {HISTORICAL_DAYS}")
    logger.info(f"Collect by provider: {COLLECT_BY_PROVIDER}")
    logger.info(f"Collect by account: {COLLECT_BY_ACCOUNT}")
    logger.info(f"Collect by service: {COLLECT_BY_SERVICE}")
    if COST_REPORT_TOKENS:
        logger.info(f"Cost report tokens: {COST_REPORT_TOKENS}")

    vantage_client = VantageClient(
        api_token=VANTAGE_API_TOKEN,
        api_url=VANTAGE_API_URL,
        workspace_token=VANTAGE_WORKSPACE_TOKEN
    )

    # Allow selecting write mode via env var (prom | sql)
    greptime_write_mode = os.environ.get('GREPTIMEDB_WRITE_MODE', 'prom').lower()
    if greptime_write_mode not in ('prom', 'sql'):
        logger.warning(f"Unknown GREPTIMEDB_WRITE_MODE='{greptime_write_mode}', defaulting to 'prom'")
        greptime_write_mode = 'prom'
    logger.info(f"GreptimeDB write mode: {greptime_write_mode}")

    greptimedb_client = GreptimeDBClient(
        greptimedb_url=GREPTIMEDB_URL,
        username=GREPTIMEDB_USERNAME,
        password=GREPTIMEDB_PASSWORD,
        database=GREPTIMEDB_DATABASE,
        write_mode=greptime_write_mode,
    )

    exporter = VantageExporter(
        vantage_client=vantage_client,
        greptimedb_client=greptimedb_client
    )

    # Main loop
    while True:
        try:
            exporter.collect_and_push()
        except Exception as e:
            logger.error(f"Error during collection: {e}", exc_info=True)

        logger.info(f"Sleeping for {PUSH_INTERVAL}s until next collection...")
        time.sleep(PUSH_INTERVAL)


if __name__ == '__main__':
    main()
