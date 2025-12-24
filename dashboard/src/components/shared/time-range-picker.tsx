"use client"

import { DateRangePicker, type DateRange, type DateRangePreset } from "laminar-ui"

const defaultPresets: DateRangePreset[] = [
  { label: "Last 1 hour", value: "1h", getRange: () => {
    const now = new Date()
    return { from: new Date(now.getTime() - 60 * 60 * 1000), to: now }
  }},
  { label: "Last 6 hours", value: "6h", getRange: () => {
    const now = new Date()
    return { from: new Date(now.getTime() - 6 * 60 * 60 * 1000), to: now }
  }},
  { label: "Last 24 hours", value: "24h", getRange: () => {
    const now = new Date()
    return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now }
  }},
  { label: "Last 7 days", value: "7d", getRange: () => {
    const now = new Date()
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now }
  }},
  { label: "Last 30 days", value: "30d", getRange: () => {
    const now = new Date()
    return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now }
  }},
]

export type { DateRange }

interface TimeRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
}

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  return (
    <DateRangePicker
      value={value}
      onChange={onChange}
      presets={defaultPresets}
      showPresets
      placeholder="Select time range"
    />
  )
}
