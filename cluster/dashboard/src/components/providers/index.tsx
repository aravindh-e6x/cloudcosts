"use client"

import { ReactNode, Suspense } from "react"
import { QueryProvider } from "./query-provider"
import { DateProvider } from "./date-provider"
import { SidebarProvider } from "./sidebar-provider"

export { useDate } from "./date-provider"
export { useSidebar } from "./sidebar-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <DateProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </DateProvider>
      </Suspense>
    </QueryProvider>
  )
}
