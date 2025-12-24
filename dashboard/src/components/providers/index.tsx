"use client"

import { ReactNode } from "react"
import { QueryProvider } from "./query-provider"

export function Providers({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>
}
