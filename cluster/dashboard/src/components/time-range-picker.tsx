"use client"

import { Calendar, Button, Popover, PopoverTrigger, PopoverContent } from "laminar-ui"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

export interface DateRange {
  from: Date | undefined
  to?: Date | undefined
}

interface TimeRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const handleSelect = (date: Date | undefined) => {
    onChange?.(date ? { from: date, to: date } : undefined)
  }

  const handlePrev = () => {
    if (!value?.from) return
    const prevDate = new Date(value.from)
    prevDate.setDate(prevDate.getDate() - 1)
    onChange?.({ from: prevDate, to: prevDate })
  }

  const handleNext = () => {
    if (!value?.from) return
    const nextDate = new Date(value.from)
    nextDate.setDate(nextDate.getDate() + 1)
    // Don't allow navigating past today
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (nextDate > today) return
    onChange?.({ from: nextDate, to: nextDate })
  }

  // Disable future dates
  const disableFutureDates = (date: Date) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return date > today
  }

  // Check if next button should be disabled
  const isNextDisabled = () => {
    if (!value?.from) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(value.from)
    selected.setHours(0, 0, 0, 0)
    return selected >= today
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={handlePrev} className="h-9 w-9">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? format(value.from, "MMM d, yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value?.from}
            onSelect={handleSelect}
            disabled={disableFutureDates}
          />
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="icon" onClick={handleNext} disabled={isNextDisabled()} className="h-9 w-9">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
