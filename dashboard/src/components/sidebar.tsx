"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Server, Cloud, Boxes, ExternalLink, CloudCog, Database, Grid, LucideIcon, BookOpen, Network } from "lucide-react"
import { TimeRangePicker } from "@/components/shared"
import { useDate } from "@/components/providers"

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  badge?: string
  external?: boolean
}

interface NavSection {
  section: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    section: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ]
  },
  {
    section: "Clusters",
    items: [
      { name: "Kubernetes", href: "/kubernetes", icon: Server },
      { name: "E6 Clusters", href: "/e6", icon: Boxes },
    ]
  },
  {
    section: "Cloud Providers",
    items: [
      { name: "AWS", href: "/aws", icon: Cloud },
      { name: "CloudWatch", href: "/cloudwatch", icon: Cloud },
    ]
  },
  {
    section: "Tools",
    items: [
      { name: "GreptimeDB", href: "/greptimedb", icon: Database },
      { name: "Grafana", href: "https://grafana.cloudcosts.in", icon: Grid, external: true },
    ]
  },
  {
    section: "Documentation",
    items: [
      { name: "Architecture", href: "/docs/architecture", icon: Network },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { timeRange, setTimeRange, selectedDate } = useDate()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <CloudCog className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">CloudCosts</span>
          </div>
        </div>

        {/* Date Selector */}
        <div className="border-b border-sidebar-border px-4 py-3">
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navigation.map((section) => (
            <div key={section.section} className="mb-6">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const isExternal = item.external || item.href.startsWith("http")

                  if (isExternal) {
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    )
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary font-medium">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">e6data CloudCosts</p>
            <span className="text-[10px] text-muted-foreground">v1.0</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
