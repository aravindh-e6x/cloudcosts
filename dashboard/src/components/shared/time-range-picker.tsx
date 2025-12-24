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
    onChange?.({ from: nextDate, to: nextDate })
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={handlePrev} className="h-9 w-9">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? format(value.from, "MMM d, yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value?.from}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="icon" onClick={handleNext} className="h-9 w-9">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
