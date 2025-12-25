"use client"

import { createContext, useContext, useState, useMemo, ReactNode } from "react"
import type { DateRange } from "@/components"

interface DateContextValue {
  timeRange: DateRange | undefined
  setTimeRange: (range: DateRange | undefined) => void
  selectedDate: string
  startTimestamp: string
  endTimestamp: string
}

const DateContext = createContext<DateContextValue | undefined>(undefined)

export function DateProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState<DateRange | undefined>(() => ({
    from: new Date(),
    to: new Date(),
  }))

  // Calculate date range in UTC based on local timezone
  const { selectedDate, startTimestamp, endTimestamp } = useMemo(() => {
    const date = timeRange?.from || new Date()
    // Use local date for URL display
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const dateStr = `${year}-${month}-${day}`

    // Calculate UTC timestamps for local day boundaries
    const startOfLocalDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0
    )
    const endOfLocalDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
      0,
      0,
      0
    )

    return {
      selectedDate: dateStr,
      startTimestamp: startOfLocalDay.toISOString(),
      endTimestamp: endOfLocalDay.toISOString(),
    }
  }, [timeRange])

  return (
    <DateContext.Provider
      value={{
        timeRange,
        setTimeRange,
        selectedDate,
        startTimestamp,
        endTimestamp,
      }}
    >
      {children}
    </DateContext.Provider>
  )
}

export function useDate() {
  const context = useContext(DateContext)
  if (!context) {
    throw new Error("useDate must be used within a DateProvider")
  }
  return context
}
