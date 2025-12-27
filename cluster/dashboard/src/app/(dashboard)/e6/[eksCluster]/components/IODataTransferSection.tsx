"use client"

import { useMemo } from "react"
import { HardDrive, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "e6ds"

interface IODataTransferSectionProps {
  eksCluster: string
  dateRange: { startTs: string; endTs: string }
}

// Mock data for IO metrics
const MOCK_IO_DATA = {
  s3_bytes_read: 156.4 * 1024 * 1024 * 1024, // 156.4 GB
  total_bytes_read: 312.8 * 1024 * 1024 * 1024, // 312.8 GB
  rows_read: 4_562_000_000, // 4.56B rows
  network_in: 89.2 * 1024 * 1024 * 1024, // 89.2 GB
  network_out: 42.6 * 1024 * 1024 * 1024, // 42.6 GB
}

// Mock data by E6 cluster
const MOCK_IO_BY_CLUSTER = [
  { e6_cluster: "prod-analytics", s3_gb: 98.2, network_in_gb: 56.4, network_out_gb: 28.1 },
  { e6_cluster: "prod-reporting", s3_gb: 48.7, network_in_gb: 26.8, network_out_gb: 12.3 },
  { e6_cluster: "dev-testing", s3_gb: 9.5, network_in_gb: 6.0, network_out_gb: 2.2 },
]

export function IODataTransferSection({ eksCluster, dateRange }: IODataTransferSectionProps) {
  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1000) {
      return `${(gb / 1024).toFixed(1)} TB`
    }
    return `${gb.toFixed(1)} GB`
  }

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(2)}B`
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`
    }
    return num.toString()
  }

  const totals = useMemo(() => ({
    s3: formatBytes(MOCK_IO_DATA.s3_bytes_read),
    totalRead: formatBytes(MOCK_IO_DATA.total_bytes_read),
    rows: formatNumber(MOCK_IO_DATA.rows_read),
    networkIn: formatBytes(MOCK_IO_DATA.network_in),
    networkOut: formatBytes(MOCK_IO_DATA.network_out),
  }), [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-5 w-5" />
          IO & Data Transfer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 ">
            <p className="text-2xl font-bold">{totals.s3}</p>
            <p className="text-xs text-muted-foreground">S3 Read</p>
          </div>
          <div className="text-center p-3 bg-muted/50 ">
            <p className="text-2xl font-bold">{totals.totalRead}</p>
            <p className="text-xs text-muted-foreground">Total Read</p>
          </div>
          <div className="text-center p-3 bg-muted/50 ">
            <p className="text-2xl font-bold">{totals.rows}</p>
            <p className="text-xs text-muted-foreground">Rows Read</p>
          </div>
          <div className="text-center p-3 bg-muted/50 ">
            <div className="flex items-center justify-center gap-1">
              <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{totals.networkIn}</p>
            </div>
            <p className="text-xs text-muted-foreground">Network In</p>
          </div>
          <div className="text-center p-3 bg-muted/50 ">
            <div className="flex items-center justify-center gap-1">
              <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{totals.networkOut}</p>
            </div>
            <p className="text-xs text-muted-foreground">Network Out</p>
          </div>
        </div>

        {/* By E6 Cluster */}
        <div className="text-xs text-muted-foreground mb-3">BY E6 CLUSTER</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">E6 CLUSTER</th>
                <th className="text-right py-2 font-medium">S3 READ</th>
                <th className="text-right py-2 font-medium">NETWORK IN</th>
                <th className="text-right py-2 font-medium">NETWORK OUT</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_IO_BY_CLUSTER.map((cluster) => (
                <tr key={cluster.e6_cluster} className="border-b last:border-0">
                  <td className="py-2 font-medium">{cluster.e6_cluster}</td>
                  <td className="py-2 text-right">{cluster.s3_gb.toFixed(1)} GB</td>
                  <td className="py-2 text-right">{cluster.network_in_gb.toFixed(1)} GB</td>
                  <td className="py-2 text-right">{cluster.network_out_gb.toFixed(1)} GB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
