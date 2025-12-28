"use client"

import { Sidebar } from "@/components/sidebar"
import { DateBanner } from "@/components"
import { MainContent, PageContent } from "e6ds"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Sidebar />
      <MainContent>
        <PageContent>
          <DateBanner />
          {children}
        </PageContent>
      </MainContent>
    </>
  )
}
