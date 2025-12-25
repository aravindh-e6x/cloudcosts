#!/usr/bin/env python3
"""
Vantage Exporter - Pushes Vantage cloud cost data directly to GreptimeDB.

Queries Vantage API and pushes metrics to GreptimeDB via Prometheus remote write protocol.
Collects:
- Daily costs by provider
- Daily costs by account
- Daily costs by service (per account)
- Daily costs by tag (for tag compliance analysis)
- Tags inventory (all tag keys across providers)
- Resources inventory (with tags and costs)
- Cost report data (for POC customers)
"""

import os
import time
import logging
import struct
import json
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
VANTAGE_API_TOKEN = os.environ.get('VANTAGE_API_TOKEN', '')
VANTAGE_API_URL = os.environ.get('VANTAGE_API_URL', 'https://api.vantage.sh')
VANTAGE_WORKSPACE_TOKEN = os.environ.get('VANTAGE_WORKSPACE_TOKEN', 'wrkspc_835ba35b0dc804f9')
GREPTIMEDB_URL = os.environ.get('GREPTIMEDB_URL', 'http://monitoring-stack-greptimedb-standalone.monitoring.svc:4000')
GREPTIMEDB_USERNAME = os.environ.get('GREPTIMEDB_USERNAME', 'e6data')
GREPTIMEDB_PASSWORD = os.environ.get('GREPTIMEDB_PASSWORD', 'cloudcosts')
GREPTIMEDB_DATABASE = os.environ.get('GREPTIMEDB_DATABASE', 'vantage')
PUSH_INTERVAL = int(os.environ.get('PUSH_INTERVAL', '86400'))  # 24 hours default
HISTORICAL_DAYS = int(os.environ.get('HISTORICAL_DAYS', '90'))  # 90 days of daily data

# Collection flags
COLLECT_BY_PROVIDER = os.environ.get('COLLECT_BY_PROVIDER', 'true').lower() == 'true'
COLLECT_BY_ACCOUNT = os.environ.get('COLLECT_BY_ACCOUNT', 'true').lower() == 'true'
COLLECT_BY_SERVICE = os.environ.get('COLLECT_BY_SERVICE', 'true').lower() == 'true'
COLLECT_BY_RESOURCE = os.environ.get('COLLECT_BY_RESOURCE', 'false').lower() == 'true'
COLLECT_BY_TAG = os.environ.get('COLLECT_BY_TAG', 'true').lower() == 'true'
COLLECT_TAGS_INVENTORY = os.environ.get('COLLECT_TAGS_INVENTORY', 'true').lower() == 'true'
COLLECT_RESOURCES = os.environ.get('COLLECT_RESOURCES', 'true').lower() == 'true'

# Cost report tokens for POC customers (comma-separated)
COST_REPORT_TOKENS = os.environ.get('COST_REPORT_TOKENS', '')

# Tags to track for cost-by-tag analysis (comma-separated)
# These are the tag keys you want to group costs by
TRACKED_TAGS = os.environ.get('TRACKED_TAGS', 'Environment,Team,App,Project,CostCenter')

# Resource report token for fetching resources (required for resource collection)
RESOURCE_REPORT_TOKEN = os.environ.get('RESOURCE_REPORT_TOKEN', 'prvdr_rsrc_rprt_4c610cc837ef1e3e')

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

    def get_tags(self) -> List[Dict]:
        """Get all tags across the workspace."""
        all_tags = []
        page = 1

        while True:
            data = self._make_request('/v2/tags', params={'page': page})

            if data and 'tags' in data:
                tags = data['tags']
                all_tags.extend(tags)
                logger.debug(f"  Got {len(tags)} tags (total: {len(all_tags)})")

                links = data.get('links', {})
                if not links.get('next'):
                    break
                page += 1
            else:
                break

        return all_tags

    def get_resources(self, resource_report_token: str, include_costs: bool = True) -> List[Dict]:
        """Get resources from a resource report."""
        all_resources = []
        page = 1

        while True:
            params = {
                'resource_report_token': resource_report_token,
                'page': page,
            }
            if include_costs:
                params['include_costs'] = 'true'

            data = self._make_request('/v2/resources', params=params)

            if data and 'resources' in data:
                resources = data['resources']
                all_resources.extend(resources)
                logger.debug(f"  Got {len(resources)} resources (total: {len(all_resources)})")

                links = data.get('links', {})
                if not links.get('next'):
                    break
                page += 1
            else:
                break

        return all_resources


class GreptimeDBClient:
    """Client for pushing metrics to GreptimeDB via Prometheus remote write."""

    def __init__(self, greptimedb_url: str, username: str = '', password: str = '', database: str = 'vantage'):
        self.greptimedb_url = greptimedb_url.rstrip('/')
        self.database = database
        self.username = username
        self.password = password
        self.push_url = f"{self.greptimedb_url}/v1/prometheus/write?db={database}"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/x-protobuf',
            'Content-Encoding': 'snappy',
            'X-Prometheus-Remote-Write-Version': '0.1.0'
        })
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
        """Push metrics to Mimir in batches."""
        if not metrics:
            return True

        success = True
        for i in range(0, len(metrics), batch_size):
            batch = metrics[i:i + batch_size]
            if not self._push_batch(batch):
                success = False

        return success

    def _push_batch(self, metrics: List[Dict]) -> bool:
        """Push a batch of metrics to Mimir."""
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
                logger.info(f"Successfully pushed {len(metrics)} metrics to GreptimeDB")
                return True
            else:
                logger.error(f"Failed to push metrics: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to push metrics to GreptimeDB: {e}")
            return False


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
        - costs_by_tag: Daily costs grouped by tag key/value
        - tags_inventory: All tag keys across providers
        - resources: Resource inventory with tags and costs
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
            'costs_by_tag': [],
            'tags_inventory': [],
            'resources': [],
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

        # Collect costs by tag
        if COLLECT_BY_TAG:
            logger.info("Collecting costs by tag...")
            result['costs_by_tag'] = self._fetch_costs_by_tag(start_str, end_str)

        # Collect tags inventory
        if COLLECT_TAGS_INVENTORY:
            logger.info("Collecting tags inventory...")
            result['tags_inventory'] = self._fetch_tags_inventory()

        # Collect resources
        if COLLECT_RESOURCES:
            logger.info("Collecting resources...")
            result['resources'] = self._fetch_resources()

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
            len(result['costs_by_tag']) +
            len(result['tags_inventory']) +
            len(result['resources']) +
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
        logger.info(f"  Fetched {len(costs)} account cost records")
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

    def _fetch_costs_by_tag(self, start_date: str, end_date: str) -> List[Dict]:
        """Fetch daily costs grouped by tag for each tracked tag key."""
        tracked_tags = [t.strip() for t in TRACKED_TAGS.split(',') if t.strip()]
        all_costs = []

        for tag_key in tracked_tags:
            logger.info(f"  Fetching costs by tag: {tag_key}")
            # Query costs grouped by provider, service, and this tag
            costs = self.vantage.query_costs(
                vql_filter=ALL_PROVIDERS_VQL,
                start_date=start_date,
                end_date=end_date,
                groupings=['provider', 'service', f'tag:{tag_key}']
            )

            # Add tag_key to each record for identification
            for cost in costs:
                cost['tag_key'] = tag_key
                # The tag value comes back in 'tag' field when grouping by tag
                # Empty string means untagged
                tag_value = cost.get('tag', '')
                cost['tag_value'] = tag_value if tag_value else ''

            all_costs.extend(costs)
            logger.info(f"    Got {len(costs)} records for tag {tag_key}")

        logger.info(f"  Fetched {len(all_costs)} total cost-by-tag records")
        return all_costs

    def _fetch_tags_inventory(self) -> List[Dict]:
        """Fetch all tag keys from Vantage."""
        tags = self.vantage.get_tags()
        logger.info(f"  Fetched {len(tags)} tag keys")
        return tags

    def _fetch_resources(self) -> List[Dict]:
        """Fetch resources from Vantage with costs."""
        if not RESOURCE_REPORT_TOKEN:
            logger.warning("RESOURCE_REPORT_TOKEN not configured, skipping resource collection")
            return []

        resources = self.vantage.get_resources(
            resource_report_token=RESOURCE_REPORT_TOKEN,
            include_costs=True
        )
        logger.info(f"  Fetched {len(resources)} resources")
        return resources

    def collect_and_push(self):
        """Collect all metrics from Vantage and push to GreptimeDB."""
        start_time = time.time()
        status = 'success'
        error_message = ''
        records_collected = 0

        try:
            # Collect raw data
            data = self.collect_all_data()

            # Convert to metrics format
            all_metrics = []
            all_metrics.extend(self._convert_provider_costs_to_metrics(data['costs_by_provider']))
            all_metrics.extend(self._convert_account_costs_to_metrics(data['costs_by_account']))
            all_metrics.extend(self._convert_service_costs_to_metrics(data['costs_by_service']))
            all_metrics.extend(self._convert_tag_costs_to_metrics(data['costs_by_tag']))
            all_metrics.extend(self._convert_tags_inventory_to_metrics(data['tags_inventory']))
            all_metrics.extend(self._convert_resources_to_metrics(data['resources']))
            all_metrics.extend(self._convert_cost_reports_to_metrics(data['cost_reports']))

            records_collected = len(all_metrics)

            # Push all metrics to GreptimeDB
            if all_metrics and self.greptimedb:
                logger.info(f"Pushing {len(all_metrics)} metrics to GreptimeDB...")
                self.greptimedb.push_metrics(all_metrics)

            logger.info(f"Collection and push completed, {len(all_metrics)} metrics")

        except Exception as e:
            status = 'failed'
            error_message = str(e)[:256]
            logger.error(f"Collection failed: {e}")
            raise

        finally:
            # Push heartbeat metric
            duration = time.time() - start_time
            self._push_heartbeat(status, records_collected, duration, error_message)

    def _push_heartbeat(self, status: str, records_collected: int, duration: float, error_message: str = ''):
        """Push exporter heartbeat metric."""
        if not self.greptimedb:
            return

        timestamp_ms = int(datetime.now().timestamp() * 1000)

        heartbeat_metrics = [
            {
                'name': 'exporter_last_run_timestamp',
                'labels': {
                    'exporter': 'vantage-exporter',
                    'status': status,
                },
                'value': timestamp_ms / 1000,  # Unix timestamp in seconds
                'timestamp_ms': timestamp_ms
            },
            {
                'name': 'exporter_last_run_duration_seconds',
                'labels': {
                    'exporter': 'vantage-exporter',
                },
                'value': duration,
                'timestamp_ms': timestamp_ms
            },
            {
                'name': 'exporter_last_run_records',
                'labels': {
                    'exporter': 'vantage-exporter',
                },
                'value': records_collected,
                'timestamp_ms': timestamp_ms
            },
        ]

        try:
            self.greptimedb.push_metrics(heartbeat_metrics)
            logger.info(f"Pushed heartbeat: status={status}, records={records_collected}, duration={duration:.2f}s")
        except Exception as e:
            logger.warning(f"Failed to push heartbeat metric: {e}")

    def _date_to_timestamp_ms(self, date_str: str) -> int:
        """Convert date string to millisecond timestamp."""
        dt = datetime.strptime(date_str, '%Y-%m-%d')
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
        for cost in costs:
            provider = cost.get('provider', 'unknown')
            account_id = cost.get('account_id', 'unknown')
            account_name = cost.get('account_name', account_id)
            date = cost.get('accrued_at', cost.get('date', cost.get('accrued_date', '')))
            amount = float(cost.get('amount', 0))

            if not date:
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

    def _convert_tag_costs_to_metrics(self, costs: List[Dict]) -> List[Dict]:
        """Convert tag-grouped costs to Prometheus metrics format."""
        metrics = []
        for cost in costs:
            provider = cost.get('provider', 'unknown')
            service = cost.get('service', 'unknown')
            tag_key = cost.get('tag_key', 'unknown')
            tag_value = cost.get('tag_value', '')  # Empty string = untagged
            date = cost.get('accrued_at', cost.get('date', cost.get('accrued_date', '')))
            amount = float(cost.get('amount', 0))

            if not date:
                continue

            # Use special label for untagged resources
            tag_value_label = tag_value if tag_value else '__untagged__'

            metrics.append({
                'name': 'vantage_cost_by_tag',
                'labels': {
                    'provider': provider,
                    'service': self._sanitize_label(service),
                    'tag_key': self._sanitize_label(tag_key),
                    'tag_value': self._sanitize_label(tag_value_label),
                },
                'value': amount,
                'timestamp_ms': self._date_to_timestamp_ms(date)
            })
        return metrics

    def _convert_tags_inventory_to_metrics(self, tags: List[Dict]) -> List[Dict]:
        """Convert tags inventory to Prometheus metrics format.

        Creates a metric with value 1 for each tag key, with labels for providers.
        """
        metrics = []
        # Use current timestamp for tags inventory (snapshot)
        timestamp_ms = int(datetime.now().timestamp() * 1000)

        for tag in tags:
            tag_key = tag.get('tag_key', 'unknown')
            providers = tag.get('providers', [])
            hidden = tag.get('hidden', False)

            # Store providers as comma-separated string
            providers_str = ','.join(sorted(providers)) if providers else 'unknown'

            metrics.append({
                'name': 'vantage_tags',
                'labels': {
                    'tag_key': self._sanitize_label(tag_key),
                    'providers': self._sanitize_label(providers_str),
                    'hidden': str(hidden).lower(),
                },
                'value': 1.0,  # Presence indicator
                'timestamp_ms': timestamp_ms
            })
        return metrics

    def _convert_resources_to_metrics(self, resources: List[Dict]) -> List[Dict]:
        """Convert resources inventory to Prometheus metrics format.

        Creates a metric per resource with cost as value and metadata as labels.
        """
        metrics = []
        # Use current timestamp for resources inventory (snapshot)
        timestamp_ms = int(datetime.now().timestamp() * 1000)

        for resource in resources:
            token = resource.get('token', 'unknown')
            uuid = resource.get('uuid', 'unknown')
            resource_type = resource.get('type', 'unknown')
            label = resource.get('label', 'unknown')
            provider = resource.get('provider', 'unknown')
            account_id = resource.get('account_id', 'unknown')
            region = resource.get('region', 'unknown')
            cost = float(resource.get('cost', 0) or 0)

            # Extract tags as JSON string for storage
            # Note: Resources from Vantage API don't include tags directly,
            # but we include the field for future compatibility
            tags_dict = resource.get('tags', {})
            if isinstance(tags_dict, list):
                # If tags come as list of {key, value}, convert to dict
                tags_dict = {t.get('key', ''): t.get('value', '') for t in tags_dict if t.get('key')}
            tags_json = json.dumps(tags_dict) if tags_dict else '{}'

            metrics.append({
                'name': 'vantage_resources',
                'labels': {
                    'token': self._sanitize_label(token),
                    'uuid': self._sanitize_label(uuid)[:128],  # UUID/ARN can be long
                    'type': self._sanitize_label(resource_type),
                    'label': self._sanitize_label(label),
                    'provider': provider,
                    'account_id': str(account_id),
                    'region': self._sanitize_label(region),
                    'tags': tags_json[:512],  # Limit tags JSON length
                },
                'value': cost,
                'timestamp_ms': timestamp_ms
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
    logger.info(f"Collect by tag: {COLLECT_BY_TAG}")
    logger.info(f"Collect tags inventory: {COLLECT_TAGS_INVENTORY}")
    logger.info(f"Collect resources: {COLLECT_RESOURCES}")
    if COLLECT_BY_TAG:
        logger.info(f"Tracked tags: {TRACKED_TAGS}")
    if COLLECT_RESOURCES:
        logger.info(f"Resource report token: {RESOURCE_REPORT_TOKEN}")
    if COST_REPORT_TOKENS:
        logger.info(f"Cost report tokens: {COST_REPORT_TOKENS}")

    vantage_client = VantageClient(
        api_token=VANTAGE_API_TOKEN,
        api_url=VANTAGE_API_URL,
        workspace_token=VANTAGE_WORKSPACE_TOKEN
    )

    greptimedb_client = GreptimeDBClient(
        greptimedb_url=GREPTIMEDB_URL,
        username=GREPTIMEDB_USERNAME,
        password=GREPTIMEDB_PASSWORD,
        database=GREPTIMEDB_DATABASE
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
