"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "laminar-ui"

// ============================================
// ARCHITECTURE DIAGRAM COMPONENTS
// ============================================

function DiagramBox({
  children,
  className = "",
  variant = "default"
}: {
  children: React.ReactNode
  className?: string
  variant?: "default" | "primary" | "secondary" | "accent" | "muted"
}) {
  const variantStyles = {
    default: "bg-card border-border",
    primary: "bg-primary/10 border-primary text-primary",
    secondary: "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400",
    accent: "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400",
    muted: "bg-muted border-muted-foreground/30 text-muted-foreground"
  }

  return (
    <div className={`border-2 rounded-lg p-3 text-center text-sm font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  )
}

function Arrow({ direction = "down", className = "" }: { direction?: "down" | "right" | "left" | "up", className?: string }) {
  const arrows = {
    down: "↓",
    right: "→",
    left: "←",
    up: "↑"
  }
  return <div className={`text-2xl text-muted-foreground font-bold ${className}`}>{arrows[direction]}</div>
}

function DataFlowArrow({ label, className = "" }: { label: string, className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <Arrow direction="down" />
    </div>
  )
}

// ============================================
// SECTION COMPONENTS
// ============================================

function SectionHeading({ id, title, description }: { id: string, title: string, description: string }) {
  return (
    <div id={id} className="scroll-mt-8">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>
    </div>
  )
}

// ============================================
// HIGH LEVEL ARCHITECTURE DIAGRAM
// ============================================

function HighLevelArchitectureDiagram() {
  return (
    <div className="p-6 bg-muted/30 rounded-xl border">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Data Sources Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center mb-4">Data Sources</h4>

          {/* EKS Clusters */}
          <div className="border-2 border-dashed border-orange-500/50 rounded-xl p-4 bg-orange-500/5">
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3 text-center">EKS Clusters</p>
            <div className="space-y-2">
              <DiagramBox variant="secondary">laminar-dev</DiagramBox>
              <DiagramBox variant="secondary">laminar-demo</DiagramBox>
              <DiagramBox variant="muted">+ more clusters</DiagramBox>
            </div>
          </div>

          {/* AWS Accounts */}
          <div className="border-2 border-dashed border-yellow-500/50 rounded-xl p-4 bg-yellow-500/5">
            <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-3 text-center">AWS Accounts</p>
            <div className="space-y-2">
              <DiagramBox variant="muted">Primary Account</DiagramBox>
              <DiagramBox variant="muted">PerfAdmin</DiagramBox>
              <DiagramBox variant="muted">PreProd / Prod</DiagramBox>
            </div>
          </div>

          {/* External APIs */}
          <div className="border-2 border-dashed border-purple-500/50 rounded-xl p-4 bg-purple-500/5">
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-3 text-center">External APIs</p>
            <div className="space-y-2">
              <DiagramBox variant="muted">Vantage API</DiagramBox>
              <DiagramBox variant="muted">POC Grafana/Mimir</DiagramBox>
            </div>
          </div>
        </div>

        {/* Central Stack Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center mb-4">Central Monitoring Stack</h4>

          <div className="border-2 border-primary rounded-xl p-4 bg-primary/5">
            <p className="text-xs font-semibold text-primary mb-3 text-center">k3s-cloudcosts Cluster</p>

            {/* Data Collectors */}
            <div className="mb-4 p-3 bg-background/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 text-center">Data Collectors</p>
              <div className="grid grid-cols-2 gap-2">
                <DiagramBox variant="accent" className="text-xs">CloudWatch Exporter</DiagramBox>
                <DiagramBox variant="accent" className="text-xs">Vantage Exporter</DiagramBox>
                <DiagramBox variant="accent" className="text-xs">POC Exporter</DiagramBox>
                <DiagramBox variant="accent" className="text-xs">MCP Server</DiagramBox>
              </div>
            </div>

            {/* Database */}
            <div className="flex justify-center mb-4">
              <Arrow direction="down" />
            </div>
            <DiagramBox variant="primary" className="mb-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">GreptimeDB</span>
                <span className="text-xs opacity-75">Time-Series Database</span>
              </div>
            </DiagramBox>

            {/* Visualization */}
            <div className="flex justify-center mb-4">
              <Arrow direction="down" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DiagramBox variant="secondary">
                <div className="flex flex-col items-center gap-1">
                  <span>Grafana</span>
                  <span className="text-xs opacity-75">Dashboards</span>
                </div>
              </DiagramBox>
              <DiagramBox variant="secondary">
                <div className="flex flex-col items-center gap-1">
                  <span>Dashboard</span>
                  <span className="text-xs opacity-75">Next.js App</span>
                </div>
              </DiagramBox>
            </div>
          </div>
        </div>

        {/* Consumers Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center mb-4">Consumers</h4>

          <div className="border-2 border-dashed border-emerald-500/50 rounded-xl p-4 bg-emerald-500/5">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3 text-center">Visualization</p>
            <div className="space-y-2">
              <DiagramBox variant="accent">CloudCosts Dashboard</DiagramBox>
              <DiagramBox variant="muted">grafana.cloudcosts.in</DiagramBox>
            </div>
          </div>

          <div className="border-2 border-dashed border-blue-500/50 rounded-xl p-4 bg-blue-500/5">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3 text-center">AI Integration</p>
            <div className="space-y-2">
              <DiagramBox variant="secondary">MCP Server</DiagramBox>
              <DiagramBox variant="muted">Claude Desktop</DiagramBox>
              <DiagramBox variant="muted">Claude Code</DiagramBox>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-500/50 rounded-xl p-4 bg-gray-500/5">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 text-center">Direct Access</p>
            <div className="space-y-2">
              <DiagramBox variant="muted">greptimedb.cloudcosts.in</DiagramBox>
              <DiagramBox variant="muted">SQL / PromQL Queries</DiagramBox>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MONITORING AGENT DIAGRAM
// ============================================

function MonitoringAgentDiagram() {
  return (
    <div className="p-6 bg-muted/30 rounded-xl border">
      <div className="max-w-3xl mx-auto">
        <div className="border-2 border-dashed border-orange-500/50 rounded-xl p-6 bg-orange-500/5">
          <h4 className="text-center font-semibold text-orange-600 dark:text-orange-400 mb-6">EKS Cluster (per cluster deployment)</h4>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DiagramBox variant="secondary">
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold">Alloy</span>
                <span className="text-xs opacity-75">Metrics Collector</span>
              </div>
            </DiagramBox>
            <DiagramBox variant="muted">
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold">OpenCost</span>
                <span className="text-xs opacity-75">Cost Metrics</span>
              </div>
            </DiagramBox>
            <DiagramBox variant="muted">
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold">Kube State Metrics</span>
                <span className="text-xs opacity-75">K8s Objects</span>
              </div>
            </DiagramBox>
            <DiagramBox variant="muted">
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold">Node Exporter</span>
                <span className="text-xs opacity-75">Node Metrics</span>
              </div>
            </DiagramBox>
          </div>

          {/* Scrape Targets */}
          <div className="bg-background/50 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold mb-3 text-center">Alloy Scrapes From:</p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
              <div className="bg-muted rounded p-2 text-center">Kube State Metrics</div>
              <div className="bg-muted rounded p-2 text-center">Node Exporter</div>
              <div className="bg-muted rounded p-2 text-center">Kubelet</div>
              <div className="bg-muted rounded p-2 text-center">cAdvisor</div>
              <div className="bg-muted rounded p-2 text-center">OpenCost</div>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            <DataFlowArrow label="Remote Write" />
          </div>
        </div>

        <div className="flex justify-center my-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">HTTPS + Basic Auth</div>
            <Arrow direction="down" />
            <div className="text-xs text-muted-foreground mt-1">greptimedb.cloudcosts.in</div>
          </div>
        </div>

        <div className="border-2 border-primary rounded-xl p-4 bg-primary/5">
          <DiagramBox variant="primary">
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">GreptimeDB</span>
              <span className="text-xs opacity-75">kubernetes database</span>
            </div>
          </DiagramBox>
        </div>
      </div>
    </div>
  )
}

// ============================================
// CLOUDWATCH EXPORTER DIAGRAM
// ============================================

function CloudWatchExporterDiagram() {
  return (
    <div className="p-6 bg-muted/30 rounded-xl border">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          {["Primary", "PerfAdmin", "PreProd", "Serverless Prod", "Serverless Beta"].map((account) => (
            <DiagramBox key={account} variant="muted">
              <div className="flex flex-col items-center gap-1">
                <span className="font-semibold text-xs">{account}</span>
                <span className="text-xs opacity-75">AWS Account</span>
              </div>
            </DiagramBox>
          ))}
        </div>

        <div className="flex justify-center mb-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">CloudWatch API + STS AssumeRole</div>
            <Arrow direction="down" />
          </div>
        </div>

        <div className="border-2 border-primary rounded-xl p-4 bg-primary/5 mb-6">
          <DiagramBox variant="accent">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">Alloy CloudWatch Exporter</span>
              <span className="text-xs opacity-75">Multi-Account Metrics Collection</span>
            </div>
          </DiagramBox>

          <div className="mt-4 bg-background/50 rounded-lg p-4">
            <p className="text-sm font-semibold mb-3 text-center">Collected Metrics:</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className="bg-muted rounded p-2 text-center">EC2</div>
              <div className="bg-muted rounded p-2 text-center">RDS</div>
              <div className="bg-muted rounded p-2 text-center">ELB / ALB</div>
              <div className="bg-muted rounded p-2 text-center">S3</div>
              <div className="bg-muted rounded p-2 text-center">Lambda</div>
              <div className="bg-muted rounded p-2 text-center">MSK (Kafka)</div>
              <div className="bg-muted rounded p-2 text-center">Glue</div>
              <div className="bg-muted rounded p-2 text-center">Container Insights</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-4">
          <DataFlowArrow label="Remote Write" />
        </div>

        <DiagramBox variant="primary">
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg">GreptimeDB</span>
            <span className="text-xs opacity-75">aws database</span>
          </div>
        </DiagramBox>
      </div>
    </div>
  )
}

// ============================================
// DATA FLOW DIAGRAM
// ============================================

function DataFlowDiagram() {
  return (
    <div className="p-6 bg-muted/30 rounded-xl border overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Row 1: Sources */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <DiagramBox variant="secondary">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">EKS Clusters</span>
              <span className="text-xs opacity-75">K8s Metrics</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="secondary">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">AWS CloudWatch</span>
              <span className="text-xs opacity-75">Service Metrics</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="secondary">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">Vantage API</span>
              <span className="text-xs opacity-75">Cost Data</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="secondary">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">POC Grafana</span>
              <span className="text-xs opacity-75">Customer Metrics</span>
            </div>
          </DiagramBox>
        </div>

        {/* Arrows */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="flex justify-center"><Arrow direction="down" /></div>
          <div className="flex justify-center"><Arrow direction="down" /></div>
          <div className="flex justify-center"><Arrow direction="down" /></div>
          <div className="flex justify-center"><Arrow direction="down" /></div>
        </div>

        {/* Row 2: Collectors */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <DiagramBox variant="accent">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">Monitoring Agent</span>
              <span className="text-xs opacity-75">Alloy + OpenCost</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="accent">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">CloudWatch Exporter</span>
              <span className="text-xs opacity-75">Alloy</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="accent">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">Vantage Exporter</span>
              <span className="text-xs opacity-75">Python</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="accent">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">POC Cost Exporter</span>
              <span className="text-xs opacity-75">Python</span>
            </div>
          </DiagramBox>
        </div>

        {/* Arrows converging */}
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-md border-t-2 border-muted-foreground/30 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-3">
              <Arrow direction="down" />
            </div>
          </div>
        </div>

        {/* Row 3: Database */}
        <div className="flex justify-center mb-4 pt-4">
          <DiagramBox variant="primary" className="w-full max-w-md">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xl font-bold">GreptimeDB</span>
              <div className="flex gap-4 text-xs">
                <span className="bg-primary/20 px-2 py-1 rounded">kubernetes</span>
                <span className="bg-primary/20 px-2 py-1 rounded">aws</span>
                <span className="bg-primary/20 px-2 py-1 rounded">vantage</span>
                <span className="bg-primary/20 px-2 py-1 rounded">poc</span>
              </div>
            </div>
          </DiagramBox>
        </div>

        {/* Arrows diverging */}
        <div className="flex justify-center mb-4">
          <Arrow direction="down" />
        </div>

        {/* Row 4: Consumers */}
        <div className="grid grid-cols-3 gap-4">
          <DiagramBox variant="muted">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">Grafana</span>
              <span className="text-xs opacity-75">PromQL Dashboards</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="muted">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">CloudCosts Dashboard</span>
              <span className="text-xs opacity-75">SQL via API</span>
            </div>
          </DiagramBox>
          <DiagramBox variant="muted">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">MCP Server</span>
              <span className="text-xs opacity-75">AI Queries</span>
            </div>
          </DiagramBox>
        </div>
      </div>
    </div>
  )
}

// ============================================
// DATABASE SCHEMA DIAGRAM
// ============================================

function DatabaseSchemaDiagram() {
  const databases = [
    {
      name: "kubernetes",
      color: "orange",
      tables: [
        "container_cpu_allocation",
        "container_memory_allocation_bytes",
        "container_cpu_usage_seconds_total",
        "container_memory_working_set_bytes",
        "kube_pod_info",
        "kube_node_info",
        "kube_node_status_allocatable",
        "node_total_hourly_cost",
        "kube_namespace_labels",
        "kube_node_labels"
      ]
    },
    {
      name: "aws",
      color: "yellow",
      tables: [
        "aws_ec2_cpuutilization",
        "aws_rds_cpuutilization",
        "aws_rds_databaseconnections",
        "aws_elb_requestcount",
        "aws_applicationelb_requestcount",
        "aws_s3_bucketsizebytes",
        "aws_lambda_invocations",
        "aws_kafka_cpuuser"
      ]
    },
    {
      name: "vantage",
      color: "purple",
      tables: [
        "vantage_daily_cost_by_provider",
        "vantage_daily_cost_by_account",
        "vantage_daily_cost_by_service",
        "vantage_cost_report"
      ]
    },
    {
      name: "poc / customer",
      color: "emerald",
      tables: [
        "cluster_composition",
        "pod_specs",
        "node_packing",
        "resource_usage",
        "query_metrics",
        "workload_metrics"
      ]
    }
  ]

  const colorClasses: Record<string, string> = {
    orange: "border-orange-500 bg-orange-500/5",
    yellow: "border-yellow-500 bg-yellow-500/5",
    purple: "border-purple-500 bg-purple-500/5",
    emerald: "border-emerald-500 bg-emerald-500/5"
  }

  const headerClasses: Record<string, string> = {
    orange: "text-orange-600 dark:text-orange-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    purple: "text-purple-600 dark:text-purple-400",
    emerald: "text-emerald-600 dark:text-emerald-400"
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {databases.map((db) => (
        <div key={db.name} className={`border-2 rounded-xl p-4 ${colorClasses[db.color]}`}>
          <h4 className={`font-semibold text-center mb-3 ${headerClasses[db.color]}`}>
            {db.name}
          </h4>
          <div className="space-y-1">
            {db.tables.map((table) => (
              <div key={table} className="text-xs bg-background/50 rounded px-2 py-1.5 font-mono">
                {table}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// COMPONENT TABLE
// ============================================

function ComponentsTable() {
  const components = [
    {
      category: "Central Stack",
      items: [
        { name: "GreptimeDB", version: "v1.0.0-beta.2", purpose: "Time-series database with S3 backend", resources: "500m CPU, 2Gi RAM" },
        { name: "Grafana", version: "8.8.2", purpose: "Dashboards and alerting", resources: "250m CPU, 512Mi RAM" },
        { name: "CloudWatch Exporter", version: "Alloy v1.4.2", purpose: "Multi-account AWS metrics", resources: "100m CPU, 256Mi RAM" },
        { name: "Vantage Exporter", version: "Python", purpose: "Cloud cost data from Vantage API", resources: "50m CPU, 64Mi RAM" },
        { name: "POC Cost Exporter", version: "Python", purpose: "Customer POC metrics", resources: "50m CPU, 64Mi RAM" },
        { name: "MCP Server", version: "Python", purpose: "AI query interface", resources: "50m CPU, 64Mi RAM" },
        { name: "Ingress NGINX", version: "4.12.2", purpose: "TLS termination and routing", resources: "Varies" },
        { name: "cert-manager", version: "1.16.2", purpose: "TLS certificate management", resources: "Varies" },
      ]
    },
    {
      category: "Monitoring Agent (per cluster)",
      items: [
        { name: "Alloy", version: "0.9.2", purpose: "Metrics collection and forwarding", resources: "50m CPU, 128Mi RAM" },
        { name: "OpenCost", version: "1.42.0", purpose: "Kubernetes cost allocation", resources: "10m CPU, 64Mi RAM" },
        { name: "Kube State Metrics", version: "5.25.1", purpose: "Kubernetes object metrics", resources: "10m CPU, 64Mi RAM" },
        { name: "Node Exporter", version: "4.39.0", purpose: "Node-level metrics", resources: "10m CPU, 32Mi RAM" },
      ]
    }
  ]

  return (
    <div className="space-y-6">
      {components.map((category) => (
        <div key={category.category}>
          <h4 className="font-semibold mb-3">{category.category}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Component</th>
                  <th className="text-left py-2 px-3 font-medium">Version</th>
                  <th className="text-left py-2 px-3 font-medium">Purpose</th>
                  <th className="text-left py-2 px-3 font-medium">Resources</th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item) => (
                  <tr key={item.name} className="border-b border-muted">
                    <td className="py-2 px-3 font-mono text-xs">{item.name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{item.version}</td>
                    <td className="py-2 px-3">{item.purpose}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{item.resources}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// DEPLOYMENT COMMANDS
// ============================================

function DeploymentCommands() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-2">Deploy Central Stack</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Deploy once in a single cluster. This is the central hub that receives metrics from all agents.
        </p>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`cd monitoring-stack
task install    # Initial installation
task upgrade    # Update existing deployment`}
        </pre>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Deploy Monitoring Agent</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Deploy to each EKS cluster you want to monitor.
        </p>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`cd monitoring-agent
task install CLUSTER_NAME=my-cluster`}
        </pre>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Create IRSA Roles</h4>
        <p className="text-sm text-muted-foreground mb-3">
          Run once to create IAM roles for service accounts.
        </p>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`cd irsa
task create-all`}
        </pre>
      </div>
    </div>
  )
}

// ============================================
// TABLE OF CONTENTS
// ============================================

function TableOfContents() {
  const sections = [
    { id: "overview", title: "Overview" },
    { id: "high-level", title: "High-Level Architecture" },
    { id: "monitoring-agent", title: "Monitoring Agent" },
    { id: "cloudwatch-exporter", title: "CloudWatch Exporter" },
    { id: "data-flow", title: "Data Flow" },
    { id: "databases", title: "Database Schema" },
    { id: "components", title: "Component Reference" },
    { id: "deployment", title: "Deployment" },
    { id: "endpoints", title: "Endpoints" },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">On This Page</CardTitle>
      </CardHeader>
      <CardContent>
        <nav className="space-y-1">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {section.title}
            </a>
          ))}
        </nav>
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ArchitecturePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Architecture</h1>
        <p className="text-muted-foreground">
          Technical documentation for the CloudCosts monitoring infrastructure
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-12">
          {/* Overview Section */}
          <section id="overview">
            <SectionHeading
              id="overview"
              title="Overview"
              description="CloudCosts is a centralized monitoring solution for collecting, storing, and visualizing cloud infrastructure costs and metrics across multiple Kubernetes clusters and AWS accounts."
            />

            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary mb-1">4</p>
                    <p className="text-sm text-muted-foreground">Data Sources</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary mb-1">5+</p>
                    <p className="text-sm text-muted-foreground">AWS Accounts</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary mb-1">~1 GB</p>
                    <p className="text-sm text-muted-foreground">Total Resources</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* High Level Architecture */}
          <section id="high-level">
            <SectionHeading
              id="high-level"
              title="High-Level Architecture"
              description="The system consists of a central monitoring stack deployed on a k3s cluster, with monitoring agents deployed to each EKS cluster being monitored."
            />
            <HighLevelArchitectureDiagram />
          </section>

          {/* Monitoring Agent */}
          <section id="monitoring-agent">
            <SectionHeading
              id="monitoring-agent"
              title="Monitoring Agent"
              description="Deployed to each EKS cluster to collect Kubernetes metrics, cost data, and push to the central GreptimeDB."
            />
            <MonitoringAgentDiagram />

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Metrics Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-semibold mb-2">Container Metrics</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• CPU/Memory usage and allocation</li>
                      <li>• Filesystem and network I/O</li>
                      <li>• Container resource requests/limits</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2">Kubernetes Objects</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Pod info, labels, and status</li>
                      <li>• Node info and capacity</li>
                      <li>• Namespace and deployment status</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2">Cost Metrics (OpenCost)</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Node hourly cost breakdown</li>
                      <li>• CPU/RAM/GPU hourly cost</li>
                      <li>• PV hourly cost</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2">Node Metrics</h5>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• CPU seconds per mode</li>
                      <li>• Memory total/available</li>
                      <li>• Filesystem and network stats</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CloudWatch Exporter */}
          <section id="cloudwatch-exporter">
            <SectionHeading
              id="cloudwatch-exporter"
              title="CloudWatch Exporter"
              description="Collects AWS service metrics from multiple accounts using cross-account IAM role assumption."
            />
            <CloudWatchExporterDiagram />
          </section>

          {/* Data Flow */}
          <section id="data-flow">
            <SectionHeading
              id="data-flow"
              title="Data Flow"
              description="How metrics flow from sources through collectors to storage and visualization."
            />
            <DataFlowDiagram />
          </section>

          {/* Database Schema */}
          <section id="databases">
            <SectionHeading
              id="databases"
              title="Database Schema"
              description="GreptimeDB organizes data into separate databases by source, with tables for different metric types."
            />
            <DatabaseSchemaDiagram />
          </section>

          {/* Components Reference */}
          <section id="components">
            <SectionHeading
              id="components"
              title="Component Reference"
              description="All components deployed as part of the monitoring infrastructure."
            />
            <Card>
              <CardContent className="pt-6">
                <ComponentsTable />
              </CardContent>
            </Card>
          </section>

          {/* Deployment */}
          <section id="deployment">
            <SectionHeading
              id="deployment"
              title="Deployment"
              description="Commands to deploy and manage the monitoring infrastructure."
            />
            <Card>
              <CardContent className="pt-6">
                <DeploymentCommands />
              </CardContent>
            </Card>
          </section>

          {/* Endpoints */}
          <section id="endpoints">
            <SectionHeading
              id="endpoints"
              title="Endpoints"
              description="Access points for the monitoring infrastructure."
            />
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">Grafana</p>
                      <p className="text-sm text-muted-foreground">Dashboards and visualization</p>
                    </div>
                    <code className="text-sm bg-muted px-2 py-1 rounded">grafana.cloudcosts.in</code>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">GreptimeDB</p>
                      <p className="text-sm text-muted-foreground">SQL and PromQL queries</p>
                    </div>
                    <code className="text-sm bg-muted px-2 py-1 rounded">greptimedb.cloudcosts.in</code>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">CloudCosts Dashboard</p>
                      <p className="text-sm text-muted-foreground">This application</p>
                    </div>
                    <code className="text-sm bg-muted px-2 py-1 rounded">localhost:3000</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar - Table of Contents */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <TableOfContents />
          </div>
        </div>
      </div>
    </div>
  )
}
