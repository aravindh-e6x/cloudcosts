"use client"

import { Calendar } from "lucide-react"
import { useDate } from "@/components/providers"

export function DateBanner() {
  const { selectedDate, timeRange } = useDate()

  // Format the date nicely
  const formattedDate = timeRange?.from
    ? timeRange.from.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : selectedDate

  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-500 bg-emerald-500/10 px-4 py-3 text-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
        <Calendar className="h-4 w-4 text-white" />
      </div>
      <div>
        <span className="text-foreground">Showing data for: </span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formattedDate}</span>
      </div>
    </div>
  )
}
