"use client"

import { ReactNode } from "react"
import { QueryProvider } from "./query-provider"
import { DateProvider } from "./date-provider"

export { useDate } from "./date-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <DateProvider>{children}</DateProvider>
    </QueryProvider>
  )
}
