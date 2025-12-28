"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar as LaminarSidebar,
  SidebarSection,
  SidebarNestedItem,
} from "e6ds"
import { LayoutDashboard, Boxes, ExternalLink, CloudCog, Database, Grid, Network } from "lucide-react"
import { TimeRangePicker } from "@/components"
import { useDate } from "@/components/providers"

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
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
      { name: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
    ]
  },
  {
    section: "Workspaces",
    items: [
      { name: "E6 Workspaces", href: "/e6", icon: <Boxes className="h-4 w-4" /> },
    ]
  },
  {
    section: "Tools",
    items: [
      { name: "GreptimeDB", href: "https://greptimedb.cloudcosts.in/dashboard", icon: <Database className="h-4 w-4" />, external: true },
      { name: "Grafana", href: "https://grafana.cloudcosts.in", icon: <Grid className="h-4 w-4" />, external: true },
    ]
  },
  {
    section: "Documentation",
    items: [
      { name: "Architecture", href: "/docs/architecture", icon: <Network className="h-4 w-4" /> },
    ]
  },
]

function SidebarHeader() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
        <CloudCog className="h-5 w-5 text-primary-foreground" />
      </div>
      <span className="text-lg font-bold text-sidebar-foreground">CloudCosts</span>
    </div>
  )
}

function SidebarFooter() {
  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-xs text-muted-foreground">e6data CloudCosts</p>
      <span className="text-[10px] text-muted-foreground">v1.0</span>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { timeRange, setTimeRange } = useDate()

  return (
    <LaminarSidebar
      header={<SidebarHeader />}
      footer={<SidebarFooter />}
      collapsible={false}
    >
      {/* Date Selector */}
      <div className="border-b border-sidebar-border px-1 pb-3 mb-2 -mx-2">
        <TimeRangePicker value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Navigation */}
      {navigation.map((section) => (
        <SidebarSection key={section.section} title={section.section}>
          {section.items.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
            const isExternal = item.external || item.href.startsWith("http")

            if (isExternal) {
              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.name}
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              )
            }

            return (
              <Link key={item.name} href={item.href} className="block">
                <SidebarNestedItem
                  label={item.name}
                  icon={item.icon}
                  active={isActive}
                />
              </Link>
            )
          })}
        </SidebarSection>
      ))}
    </LaminarSidebar>
  )
}
