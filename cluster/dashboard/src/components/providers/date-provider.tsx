"use client"

import { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { parse, format, isValid, isFuture } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"
import type { DateRange } from "@/components"

const IST_TIMEZONE = "Asia/Kolkata"
const DATE_FORMAT = "yyyy-MM-dd"

interface DateContextValue {
  timeRange: DateRange | undefined
  setTimeRange: (range: DateRange | undefined) => void
  selectedDate: string
  startTimestamp: string
  endTimestamp: string
}

const DateContext = createContext<DateContextValue | undefined>(undefined)

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const date = parse(dateStr, DATE_FORMAT, new Date())
  if (!isValid(date) || isFuture(date)) return null
  return date
}

export function DateProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize from URL or default to today in IST
  const [timeRange, setTimeRangeState] = useState<DateRange | undefined>(() => {
    const dateParam = searchParams.get("date")
    const parsedDate = parseDate(dateParam)
    const initialDate = parsedDate || toZonedTime(new Date(), IST_TIMEZONE)
    return { from: initialDate, to: initialDate }
  })

  // Update URL when date changes
  const setTimeRange = useCallback((range: DateRange | undefined) => {
    setTimeRangeState(range)

    if (range?.from) {
      const dateStr = format(range.from, DATE_FORMAT)
      const params = new URLSearchParams(searchParams.toString())
      params.set("date", dateStr)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [router, pathname, searchParams])

  // Sync state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const dateParam = searchParams.get("date")
    const parsedDate = parseDate(dateParam)

    if (parsedDate) {
      const currentDate = timeRange?.from
      if (!currentDate || format(currentDate, DATE_FORMAT) !== format(parsedDate, DATE_FORMAT)) {
        setTimeRangeState({ from: parsedDate, to: parsedDate })
      }
    }
  }, [searchParams, timeRange?.from])

  // Calculate date range timestamps in IST
  const { selectedDate, startTimestamp, endTimestamp } = useMemo(() => {
    const date = timeRange?.from || new Date()
    const dateStr = format(date, DATE_FORMAT)

    // Create start of day (00:00:00) in IST and convert to UTC
    const startOfDayIST = fromZonedTime(
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
      IST_TIMEZONE
    )

    // Create end of day (23:59:59.999) in IST and convert to UTC
    const endOfDayIST = fromZonedTime(
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
      IST_TIMEZONE
    )

    return {
      selectedDate: dateStr,
      startTimestamp: startOfDayIST.toISOString(),
      endTimestamp: endOfDayIST.toISOString(),
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
