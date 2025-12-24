"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  StatCard,
  DataTable,
  LineChart,
  BarChart,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from "laminar-ui"
import { TimeRangePicker, type DateRange } from "@/components/shared"

// Mock EC2 data
const mockEC2Instances = [
  { id: "i-0a1b2c3d4e5f6g7h8", name: "prod-api-1", type: "m5.2xlarge", state: "running", cpu_avg: 45.2, network_in: 1250, network_out: 890, cost_daily: 9.22 },
  { id: "i-1b2c3d4e5f6g7h8i9", name: "prod-api-2", type: "m5.2xlarge", state: "running", cpu_avg: 52.8, network_in: 1420, network_out: 1050, cost_daily: 9.22 },
  { id: "i-2c3d4e5f6g7h8i9j0", name: "prod-worker-1", type: "c5.4xlarge", state: "running", cpu_avg: 78.5, network_in: 850, network_out: 2200, cost_daily: 16.32 },
  { id: "i-3d4e5f6g7h8i9j0k1", name: "prod-worker-2", type: "c5.4xlarge", state: "running", cpu_avg: 72.1, network_in: 920, network_out: 1980, cost_daily: 16.32 },
  { id: "i-4e5f6g7h8i9j0k1l2", name: "staging-api", type: "m5.xlarge", state: "running", cpu_avg: 22.4, network_in: 320, network_out: 180, cost_daily: 4.61 },
  { id: "i-5f6g7h8i9j0k1l2m3", name: "dev-server", type: "t3.large", state: "stopped", cpu_avg: 0, network_in: 0, network_out: 0, cost_daily: 0 },
]

// Mock RDS data
const mockRDSInstances = [
  { id: "prod-postgres-primary", engine: "PostgreSQL 15.4", type: "db.r5.2xlarge", status: "available", cpu_avg: 35.2, connections: 125, iops: 4500, storage_gb: 500, cost_daily: 19.20 },
  { id: "prod-postgres-replica", engine: "PostgreSQL 15.4", type: "db.r5.xlarge", status: "available", cpu_avg: 28.5, connections: 45, iops: 2100, storage_gb: 500, cost_daily: 9.60 },
  { id: "prod-mysql", engine: "MySQL 8.0.35", type: "db.m5.xlarge", status: "available", cpu_avg: 42.8, connections: 89, iops: 3200, storage_gb: 200, cost_daily: 6.91 },
  { id: "analytics-redshift", engine: "Redshift", type: "dc2.large", status: "available", cpu_avg: 55.2, connections: 12, iops: 0, storage_gb: 160, cost_daily: 6.00 },
]

// Mock S3 data
const mockS3Buckets = [
  { name: "prod-data-lake", size_gb: 2500, objects: 15000000, requests_daily: 850000, data_transfer_gb: 120, cost_daily: 57.50 },
  { name: "prod-backups", size_gb: 1800, objects: 25000, requests_daily: 5000, data_transfer_gb: 50, cost_daily: 41.40 },
  { name: "prod-logs", size_gb: 450, objects: 8500000, requests_daily: 250000, data_transfer_gb: 25, cost_daily: 10.35 },
  { name: "staging-data", size_gb: 120, objects: 500000, requests_daily: 45000, data_transfer_gb: 8, cost_daily: 2.76 },
  { name: "dev-artifacts", size_gb: 85, objects: 120000, requests_daily: 12000, data_transfer_gb: 3, cost_daily: 1.96 },
]

// Mock MSK data
const mockMSKClusters = [
  { name: "prod-events", brokers: 6, type: "kafka.m5.2xlarge", partitions: 120, throughput_mbps: 450, storage_gb: 2000, cost_daily: 72.00 },
  { name: "prod-logs", brokers: 3, type: "kafka.m5.xlarge", partitions: 45, throughput_mbps: 180, storage_gb: 500, cost_daily: 27.00 },
  { name: "staging-events", brokers: 3, type: "kafka.t3.small", partitions: 15, throughput_mbps: 25, storage_gb: 100, cost_daily: 5.40 },
]

// Time series for EC2
const mockEC2TimeSeries = [
  { time: "00:00", cpu: 42, network: 1100 },
  { time: "04:00", cpu: 28, network: 650 },
  { time: "08:00", cpu: 55, network: 1450 },
  { time: "12:00", cpu: 72, network: 1850 },
  { time: "16:00", cpu: 68, network: 1720 },
  { time: "20:00", cpu: 58, network: 1380 },
  { time: "24:00", cpu: 45, network: 1150 },
]

// Time series for RDS
const mockRDSTimeSeries = [
  { time: "00:00", cpu: 25, connections: 45, iops: 2200 },
  { time: "04:00", cpu: 18, connections: 22, iops: 1500 },
  { time: "08:00", cpu: 38, connections: 85, iops: 3500 },
  { time: "12:00", cpu: 52, connections: 145, iops: 4800 },
  { time: "16:00", cpu: 48, connections: 132, iops: 4200 },
  { time: "20:00", cpu: 35, connections: 78, iops: 3100 },
  { time: "24:00", cpu: 28, connections: 52, iops: 2400 },
]

const ec2Columns = [
  { key: "name", header: "Name", sortable: true },
  { key: "id", header: "Instance ID" },
  { key: "type", header: "Type", sortable: true },
  { key: "state", header: "State", render: (value: unknown) => (
    <Badge variant={value === "running" ? "success" : "secondary"}>{String(value)}</Badge>
  )},
  { key: "cpu_avg", header: "CPU Avg %", sortable: true, render: (value: unknown) => `${Number(value).toFixed(1)}%` },
  { key: "network_in", header: "Net In (MB/h)", sortable: true },
  { key: "network_out", header: "Net Out (MB/h)", sortable: true },
  { key: "cost_daily", header: "Cost/day", sortable: true, render: (value: unknown) => `$${Number(value).toFixed(2)}` },
]

const rdsColumns = [
  { key: "id", header: "Instance ID", sortable: true },
  { key: "engine", header: "Engine" },
  { key: "type", header: "Type", sortable: true },
  { key: "status", header: "Status", render: (value: unknown) => (
    <Badge variant={value === "available" ? "success" : "warning"}>{String(value)}</Badge>
  )},
  { key: "cpu_avg", header: "CPU %", sortable: true, render: (value: unknown) => `${Number(value).toFixed(1)}%` },
  { key: "connections", header: "Connections", sortable: true },
  { key: "iops", header: "IOPS", sortable: true },
  { key: "storage_gb", header: "Storage (GB)", sortable: true },
  { key: "cost_daily", header: "Cost/day", sortable: true, render: (value: unknown) => `$${Number(value).toFixed(2)}` },
]

const s3Columns = [
  { key: "name", header: "Bucket Name", sortable: true },
  { key: "size_gb", header: "Size (GB)", sortable: true },
  { key: "objects", header: "Objects", sortable: true, render: (value: unknown) => Number(value).toLocaleString() },
  { key: "requests_daily", header: "Requests/day", sortable: true, render: (value: unknown) => Number(value).toLocaleString() },
  { key: "data_transfer_gb", header: "Transfer (GB/day)", sortable: true },
  { key: "cost_daily", header: "Cost/day", sortable: true, render: (value: unknown) => `$${Number(value).toFixed(2)}` },
]

const mskColumns = [
  { key: "name", header: "Cluster Name", sortable: true },
  { key: "brokers", header: "Brokers", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "partitions", header: "Partitions", sortable: true },
  { key: "throughput_mbps", header: "Throughput (MB/s)", sortable: true },
  { key: "storage_gb", header: "Storage (GB)", sortable: true },
  { key: "cost_daily", header: "Cost/day", sortable: true, render: (value: unknown) => `$${Number(value).toFixed(2)}` },
]

export default function CloudWatchPage() {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>()

  const totalEC2Cost = mockEC2Instances.reduce((sum, i) => sum + i.cost_daily, 0)
  const totalRDSCost = mockRDSInstances.reduce((sum, i) => sum + i.cost_daily, 0)
  const totalS3Cost = mockS3Buckets.reduce((sum, b) => sum + b.cost_daily, 0)
  const totalMSKCost = mockMSKClusters.reduce((sum, c) => sum + c.cost_daily, 0)
  const totalDailyCost = totalEC2Cost + totalRDSCost + totalS3Cost + totalMSKCost

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AWS CloudWatch</h1>
          <p className="text-muted-foreground">
            Resource usage and cost metrics from CloudWatch
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">Polling: Every 1 hour</Badge>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Daily Cost"
          value={totalDailyCost}
          prefix="$"
          previousValue={totalDailyCost - 15}
        />
        <StatCard
          label="EC2 Cost/day"
          value={totalEC2Cost}
          prefix="$"
          previousValue={totalEC2Cost - 5}
        />
        <StatCard
          label="RDS Cost/day"
          value={totalRDSCost}
          prefix="$"
          previousValue={totalRDSCost + 2}
        />
        <StatCard
          label="S3 Cost/day"
          value={totalS3Cost}
          prefix="$"
          previousValue={totalS3Cost - 3}
        />
        <StatCard
          label="MSK Cost/day"
          value={totalMSKCost}
          prefix="$"
          previousValue={totalMSKCost}
        />
      </div>

      {/* Service Tabs */}
      <Tabs defaultValue="ec2">
        <TabsList>
          <TabsTrigger value="ec2">EC2 ({mockEC2Instances.length})</TabsTrigger>
          <TabsTrigger value="rds">RDS ({mockRDSInstances.length})</TabsTrigger>
          <TabsTrigger value="s3">S3 ({mockS3Buckets.length})</TabsTrigger>
          <TabsTrigger value="msk">MSK ({mockMSKClusters.length})</TabsTrigger>
        </TabsList>

        {/* EC2 Tab */}
        <TabsContent value="ec2" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>EC2 Instances</CardTitle>
              <CardDescription>Instance usage and cost metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockEC2Instances}
                columns={ec2Columns}
                hoverable
                striped
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>EC2 CPU Usage</CardTitle>
                <CardDescription>Average CPU utilization over time</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={mockEC2TimeSeries}
                  xAxisKey="time"
                  lines={[{ dataKey: "cpu", name: "CPU %", color: "var(--chart-1)" }]}
                  height={250}
                  yAxisFormatter={(value) => `${value}%`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>EC2 Network Traffic</CardTitle>
                <CardDescription>Network throughput over time</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={mockEC2TimeSeries}
                  xAxisKey="time"
                  lines={[{ dataKey: "network", name: "Network (MB/h)", color: "var(--chart-2)" }]}
                  height={250}
                  yAxisFormatter={(value) => `${value} MB`}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>EC2 Cost by Instance</CardTitle>
              <CardDescription>Daily cost per instance</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart
                data={mockEC2Instances.filter(i => i.cost_daily > 0).map(i => ({ name: i.name, cost: i.cost_daily }))}
                xAxisKey="name"
                bars={[{ dataKey: "cost", name: "Cost/day", color: "var(--chart-1)" }]}
                height={250}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* RDS Tab */}
        <TabsContent value="rds" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>RDS Instances</CardTitle>
              <CardDescription>Database instance usage and cost metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockRDSInstances}
                columns={rdsColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>RDS CPU & Connections</CardTitle>
                <CardDescription>Database utilization over time</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={mockRDSTimeSeries}
                  xAxisKey="time"
                  lines={[
                    { dataKey: "cpu", name: "CPU %", color: "var(--chart-1)" },
                    { dataKey: "connections", name: "Connections", color: "var(--chart-2)" },
                  ]}
                  height={250}
                  showLegend
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>RDS IOPS</CardTitle>
                <CardDescription>I/O operations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={mockRDSTimeSeries}
                  xAxisKey="time"
                  lines={[{ dataKey: "iops", name: "IOPS", color: "var(--chart-3)" }]}
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* S3 Tab */}
        <TabsContent value="s3" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>S3 Buckets</CardTitle>
              <CardDescription>Storage and request metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockS3Buckets}
                columns={s3Columns}
                hoverable
                striped
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>S3 Storage by Bucket</CardTitle>
                <CardDescription>Storage size in GB</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={mockS3Buckets}
                  xAxisKey="name"
                  bars={[{ dataKey: "size_gb", name: "Size (GB)", color: "var(--chart-1)" }]}
                  height={250}
                  layout="vertical"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>S3 Cost by Bucket</CardTitle>
                <CardDescription>Daily cost per bucket</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={mockS3Buckets}
                  xAxisKey="name"
                  bars={[{ dataKey: "cost_daily", name: "Cost/day", color: "var(--chart-2)" }]}
                  height={250}
                  layout="vertical"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MSK Tab */}
        <TabsContent value="msk" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>MSK Clusters</CardTitle>
              <CardDescription>Kafka cluster metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={mockMSKClusters}
                columns={mskColumns}
                hoverable
                striped
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>MSK Throughput</CardTitle>
                <CardDescription>Message throughput by cluster</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={mockMSKClusters}
                  xAxisKey="name"
                  bars={[{ dataKey: "throughput_mbps", name: "Throughput (MB/s)", color: "var(--chart-1)" }]}
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MSK Cost</CardTitle>
                <CardDescription>Daily cost by cluster</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={mockMSKClusters}
                  xAxisKey="name"
                  bars={[{ dataKey: "cost_daily", name: "Cost/day", color: "var(--chart-2)" }]}
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
