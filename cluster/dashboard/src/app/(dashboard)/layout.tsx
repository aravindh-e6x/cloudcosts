"use client"

import { Sidebar } from "@/components/sidebar"
import { MainContent, PageContent } from "laminar-ui"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Sidebar />
      <MainContent>
        <PageContent>{children}</PageContent>
      </MainContent>
    </>
  )
}
