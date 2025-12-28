"use client"

import { Sidebar } from "@/components/sidebar"
import { DateBanner } from "@/components"
import { MainContent, PageContent } from "e6ds"
import { useSidebar } from "@/components/providers"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { collapsed } = useSidebar()

  return (
    <>
      <Sidebar />
      <MainContent sidebarCollapsed={collapsed}>
        <PageContent>
          <DateBanner />
          {children}
        </PageContent>
      </MainContent>
    </>
  )
}
