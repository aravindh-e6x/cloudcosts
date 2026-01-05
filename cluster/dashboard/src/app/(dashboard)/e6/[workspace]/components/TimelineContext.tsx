"use client"

import { createContext, useContext, useState, useMemo, ReactNode } from "react"
import { addMinutes } from "date-fns"
import { WorkspaceSnapshot } from "./shared/types"
import { generateWorkspaceSnapshot } from "./shared/mockData"

interface TimelineContextValue {
  snapshots: Date[]
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  currentTimestamp: Date | null
  currentSnapshot: WorkspaceSnapshot | null
}

const TimelineContext = createContext<TimelineContextValue | null>(null)

interface TimelineProviderProps {
  children: ReactNode
  dateRange: { startTs: string; endTs: string }
}

export function TimelineProvider({ children, dateRange }: TimelineProviderProps) {
  // Generate 15-minute interval snapshots for the date range
  const snapshots = useMemo(() => {
    const start = new Date(dateRange.startTs)
    const end = new Date(dateRange.endTs)
    const result: Date[] = []

    let current = new Date(start)
    while (current <= end) {
      result.push(new Date(current))
      current = addMinutes(current, 15)
    }

    return result
  }, [dateRange])

  const [selectedIndex, setSelectedIndex] = useState(Math.floor(snapshots.length / 2))

  const currentTimestamp = snapshots[selectedIndex] || null

  // Generate workspace snapshot for the current timestamp
  const currentSnapshot = useMemo(() => {
    if (!currentTimestamp) return null
    return generateWorkspaceSnapshot(currentTimestamp)
  }, [currentTimestamp])

  return (
    <TimelineContext.Provider
      value={{
        snapshots,
        selectedIndex,
        setSelectedIndex,
        currentTimestamp,
        currentSnapshot,
      }}
    >
      {children}
    </TimelineContext.Provider>
  )
}

export function useTimeline() {
  const context = useContext(TimelineContext)
  if (!context) {
    throw new Error("useTimeline must be used within a TimelineProvider")
  }
  return context
}
