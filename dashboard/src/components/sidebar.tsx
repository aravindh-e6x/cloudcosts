"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, CreditCard, Server, Cloud, Boxes, ExternalLink } from "lucide-react"

const navigation = [
  {
    section: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ]
  },
  {
    section: "Infrastructure",
    items: [
      { name: "Kubernetes", href: "/kubernetes", icon: Server, badge: "Live" },
      { name: "E6 Clusters", href: "/e6", icon: Boxes },
    ]
  },
  {
    section: "Costs",
    items: [
      { name: "Vantage", href: "/vantage", icon: CreditCard, badge: "Live" },
      { name: "CloudWatch", href: "/cloudwatch", icon: Cloud },
    ]
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">CC</span>
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">CloudCosts</span>
          </div>
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
          <a
            href="https://greptimedb.cloudcosts.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            GreptimeDB Console
          </a>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">e6data CloudCosts</p>
            <span className="text-[10px] text-muted-foreground">v1.0</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
