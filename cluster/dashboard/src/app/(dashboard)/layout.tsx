"use client"

import { Sidebar } from "@/components/sidebar"
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
        <PageContent>{children}</PageContent>
      </MainContent>
    </>
  )
}
