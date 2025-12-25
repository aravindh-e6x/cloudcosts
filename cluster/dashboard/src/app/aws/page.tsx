"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Badge,
} from "laminar-ui"
import {
  ChangeBadge,
  ExpandableSection,
  DateBanner,
} from "@/components/shared"
import { useDate } from "@/components/providers"
import { useQuery, formatCurrency } from "@/hooks/useQuery"
import { overviewQueries } from "@/lib/queries"

// ============================================
// MOCK DATA - AWS Account Breakdown with Compute/Non-Compute
// ============================================

interface ServiceBreakdown {
  service: string
  cost: number
  [key: string]: string | number
}

interface AWSAccountMock {
  account_id: string
  account_name: string
  total: number
  compute: number
  non_compute: number
  today: number
  yesterday: number
  last_7d: number
  prev_7d: number
  mtd: number
  prev_mtd: number
  compute_services: ServiceBreakdown[]
  non_compute_services: ServiceBreakdown[]
}

const mockAWSAccounts: AWSAccountMock[] = [
  {
    account_id: "123456789012",
    account_name: "Production",
    total: 18500,
    compute: 12800,
    non_compute: 5700,
    today: 620,
    yesterday: 595,
    last_7d: 4200,
    prev_7d: 3950,
    mtd: 18500,
    prev_mtd: 17200,
    compute_services: [
      { service: "api-gateway", cost: 3200 },
      { service: "user-service", cost: 2400 },
      { service: "order-service", cost: 2100 },
      { service: "payment-service", cost: 1800 },
      { service: "inventory-service", cost: 1500 },
      { service: "notification-service", cost: 950 },
      { service: "auth-service", cost: 850 },
    ],
    non_compute_services: [
      { service: "RDS", cost: 1500 },
      { service: "S3", cost: 1200 },
      { service: "ElastiCache", cost: 950 },
      { service: "CloudFront", cost: 750 },
      { service: "DynamoDB", cost: 600 },
      { service: "SQS/SNS", cost: 400 },
      { service: "Route 53", cost: 300 },
    ],
  },
  {
    account_id: "234567890123",
    account_name: "Development",
    total: 8200,
    compute: 5400,
    non_compute: 2800,
    today: 275,
    yesterday: 290,
    last_7d: 1900,
    prev_7d: 1850,
    mtd: 8200,
    prev_mtd: 7800,
    compute_services: [
      { service: "api-gateway", cost: 1400 },
      { service: "user-service", cost: 1100 },
      { service: "order-service", cost: 950 },
      { service: "payment-service", cost: 800 },
      { service: "inventory-service", cost: 650 },
      { service: "search-service", cost: 500 },
    ],
    non_compute_services: [
      { service: "RDS", cost: 800 },
      { service: "S3", cost: 650 },
      { service: "ElastiCache", cost: 500 },
      { service: "DynamoDB", cost: 450 },
      { service: "CloudWatch", cost: 400 },
    ],
  },
  {
    account_id: "345678901234",
    account_name: "Staging",
    total: 4500,
    compute: 3100,
    non_compute: 1400,
    today: 150,
    yesterday: 145,
    last_7d: 1050,
    prev_7d: 980,
    mtd: 4500,
    prev_mtd: 4200,
    compute_services: [
      { service: "api-gateway", cost: 850 },
      { service: "user-service", cost: 650 },
      { service: "order-service", cost: 550 },
      { service: "payment-service", cost: 500 },
      { service: "inventory-service", cost: 350 },
      { service: "auth-service", cost: 200 },
    ],
    non_compute_services: [
      { service: "RDS", cost: 450 },
      { service: "S3", cost: 350 },
      { service: "ElastiCache", cost: 300 },
      { service: "CloudWatch", cost: 300 },
    ],
  },
  {
    account_id: "456789012345",
    account_name: "Data Analytics",
    total: 12300,
    compute: 8900,
    non_compute: 3400,
    today: 410,
    yesterday: 425,
    last_7d: 2850,
    prev_7d: 2700,
    mtd: 12300,
    prev_mtd: 11500,
    compute_services: [
      { service: "spark-jobs", cost: 2800 },
      { service: "data-pipeline", cost: 2200 },
      { service: "etl-service", cost: 1500 },
      { service: "ml-training", cost: 1200 },
      { service: "streaming-processor", cost: 800 },
      { service: "scheduler", cost: 400 },
    ],
    non_compute_services: [
      { service: "S3", cost: 1200 },
      { service: "Redshift", cost: 950 },
      { service: "Glue", cost: 550 },
      { service: "Kinesis", cost: 400 },
      { service: "Athena", cost: 300 },
    ],
  },
  {
    account_id: "567890123456",
    account_name: "Shared Services",
    total: 6500,
    compute: 2200,
    non_compute: 4300,
    today: 215,
    yesterday: 210,
    last_7d: 1500,
    prev_7d: 1450,
    mtd: 6500,
    prev_mtd: 6100,
    compute_services: [
      { service: "monitoring-stack", cost: 750 },
      { service: "logging-service", cost: 600 },
      { service: "cert-manager", cost: 350 },
      { service: "ingress-controller", cost: 300 },
      { service: "vault", cost: 200 },
    ],
    non_compute_services: [
      { service: "RDS", cost: 950 },
      { service: "S3", cost: 850 },
      { service: "Secrets Manager", cost: 600 },
      { service: "CloudWatch", cost: 550 },
      { service: "KMS", cost: 500 },
      { service: "WAF", cost: 450 },
      { service: "ACM", cost: 400 },
    ],
  },
]

// ============================================
// HELPER COMPONENTS
// ============================================

function ChangeCell({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-muted-foreground">-</span>
  const change = ((current - previous) / previous) * 100
  return <ChangeBadge value={change} />
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AWSPage() {
  const { selectedDate, timeRange } = useDate()

  // Compute date labels for display
  const dateLabels = useMemo(() => {
    const selected = timeRange?.from || new Date()
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const yesterday = new Date(selected)
    yesterday.setDate(yesterday.getDate() - 1)

    const last7dStart = new Date(selected)
    last7dStart.setDate(last7dStart.getDate() - 6)

    const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1)
    const prevMonthStart = new Date(selected.getFullYear(), selected.getMonth() - 1, 1)
    const dayOfMonth = selected.getDate()
    const prevMonthSameDay = new Date(selected.getFullYear(), selected.getMonth() - 1, dayOfMonth)

    return {
      today: fmt(selected),
      yesterday: fmt(yesterday),
      last7d: `${fmt(last7dStart)} - ${fmt(selected)}`,
      mtd: `${fmt(monthStart)} - ${fmt(selected)}`,
      prevMtd: `${fmt(prevMonthStart)} - ${fmt(prevMonthSameDay)}`,
    }
  }, [timeRange])

  // Calculate totals
  const totals = useMemo(() => {
    return mockAWSAccounts.reduce(
      (acc, account) => ({
        total: acc.total + account.total,
        compute: acc.compute + account.compute,
        non_compute: acc.non_compute + account.non_compute,
        today: acc.today + account.today,
        yesterday: acc.yesterday + account.yesterday,
        last_7d: acc.last_7d + account.last_7d,
        mtd: acc.mtd + account.mtd,
        prev_mtd: acc.prev_mtd + account.prev_mtd,
      }),
      { total: 0, compute: 0, non_compute: 0, today: 0, yesterday: 0, last_7d: 0, mtd: 0, prev_mtd: 0 }
    )
  }, [])

  return (
    <div className="space-y-8">
      <DateBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AWS Costs</h1>
          <p className="text-muted-foreground">
            Cost breakdown by AWS account with compute/non-compute split
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total MTD ({dateLabels.mtd})</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totals.mtd)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">vs Prev MTD ({dateLabels.prevMtd})</span>
              <ChangeCell current={totals.mtd} previous={totals.prev_mtd} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Today ({dateLabels.today})</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totals.today)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">vs Yesterday ({dateLabels.yesterday})</span>
              <ChangeCell current={totals.today} previous={totals.yesterday} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Compute (K8s)</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totals.compute)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {((totals.compute / totals.total) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Non-Compute (AWS Services)</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totals.non_compute)}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {((totals.non_compute / totals.total) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AWS Account Breakdown */}
      <div className="space-y-4">
        {mockAWSAccounts.map((account) => (
          <ExpandableSection
            key={account.account_id}
            title={account.account_name}
            subtitle={`Account ID: ${account.account_id}`}
            total={account.total}
            compute={account.compute}
            nonCompute={account.non_compute}
            defaultExpanded={false}
          >
            <div className="pt-4 space-y-6">
              {/* Period Summary */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Today ({dateLabels.today})</p>
                  <p className="text-lg font-semibold">{formatCurrency(account.today)}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Yesterday ({dateLabels.yesterday})</p>
                  <p className="text-lg font-semibold">{formatCurrency(account.yesterday)}</p>
                  <ChangeCell current={account.today} previous={account.yesterday} />
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Last 7 Days ({dateLabels.last7d})</p>
                  <p className="text-lg font-semibold">{formatCurrency(account.last_7d)}</p>
                  <ChangeCell current={account.last_7d} previous={account.prev_7d} />
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">MTD ({dateLabels.mtd})</p>
                  <p className="text-lg font-semibold">{formatCurrency(account.mtd)}</p>
                  <ChangeCell current={account.mtd} previous={account.prev_mtd} />
                </div>
              </div>

              {/* Compute (K8s) and Non-Compute (AWS) Tables Side by Side */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Compute - K8s Microservices */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Compute (K8s Microservices)</h4>
                    <Badge variant="default">{formatCurrency(account.compute)} ({((account.compute / account.total) * 100).toFixed(1)}%)</Badge>
                  </div>
                  <DataTable
                    data={account.compute_services}
                    columns={[
                      { key: "service", header: "Microservice", sortable: true },
                      { key: "cost", header: "Cost (MTD)", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
                      { key: "percent", header: "%", render: (_: unknown, row: ServiceBreakdown) => (
                        `${((row.cost / account.compute) * 100).toFixed(1)}%`
                      )},
                    ]}
                    hoverable
                    striped
                  />
                </div>

                {/* Non-Compute - AWS Services */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Non-Compute (AWS Services)</h4>
                    <Badge variant="secondary">{formatCurrency(account.non_compute)} ({((account.non_compute / account.total) * 100).toFixed(1)}%)</Badge>
                  </div>
                  <DataTable
                    data={account.non_compute_services}
                    columns={[
                      { key: "service", header: "AWS Service", sortable: true },
                      { key: "cost", header: "Cost (MTD)", sortable: true, render: (value: unknown) => formatCurrency(Number(value)) },
                      { key: "percent", header: "%", render: (_: unknown, row: ServiceBreakdown) => (
                        `${((row.cost / account.non_compute) * 100).toFixed(1)}%`
                      )},
                    ]}
                    hoverable
                    striped
                  />
                </div>
              </div>
            </div>
          </ExpandableSection>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Report Generated: {new Date().toLocaleString()}
      </p>
    </div>
  )
}
