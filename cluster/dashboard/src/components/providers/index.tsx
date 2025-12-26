"use client"

import { ReactNode, Suspense } from "react"
import { QueryProvider } from "./query-provider"
import { DateProvider } from "./date-provider"

export { useDate } from "./date-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <DateProvider>{children}</DateProvider>
      </Suspense>
    </QueryProvider>
  )
}
