"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Slider } from "e6ds"
import { format } from "date-fns"
import { TimeSnapshot } from "./types"

interface TimelineScrubberProps {
  snapshots: TimeSnapshot[]
  selectedIndex: number
  onIndexChange: (index: number) => void
}

export function TimelineScrubber({ snapshots, selectedIndex, onIndexChange }: TimelineScrubberProps) {
  const currentSnapshot = snapshots[selectedIndex] || snapshots[0]

  const timeLabels = useMemo(() => {
    if (snapshots.length === 0) return []
    const labels: { index: number; label: string }[] = []
    snapshots.forEach((s, i) => {
      const hour = s.timestamp.getHours()
      const min = s.timestamp.getMinutes()
      if (min === 0 && hour % 2 === 0) {
        labels.push({ index: i, label: format(s.timestamp, "HH:mm") })
      }
    })
    return labels
  }, [snapshots])

  const handlePrev = () => onIndexChange(Math.max(0, selectedIndex - 1))
  const handleNext = () => onIndexChange(Math.min(snapshots.length - 1, selectedIndex + 1))

  if (snapshots.length === 0) return null

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={handlePrev}
          disabled={selectedIndex === 0}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 px-2">
          <Slider
            value={[selectedIndex]}
            onValueChange={([v]) => onIndexChange(v)}
            min={0}
            max={snapshots.length - 1}
            step={1}
            className="w-full"
          />
        </div>

        <button
          onClick={handleNext}
          disabled={selectedIndex === snapshots.length - 1}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative h-4 mx-6">
        {timeLabels.map(({ index, label }) => (
          <span
            key={index}
            className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
            style={{ left: `${(index / (snapshots.length - 1)) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="text-center mt-2">
        <span className="text-lg font-mono font-bold">
          {format(currentSnapshot.timestamp, "HH:mm")}
        </span>
        <span className="text-sm text-muted-foreground ml-2">
          ({currentSnapshot.nodes.length} nodes)
        </span>
      </div>
    </div>
  )
}
