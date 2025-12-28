"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { Card, CardContent, Slider } from "e6ds"
import { format } from "date-fns"
import { useTimeline } from "./TimelineContext"

export function TimelineScrubber() {
  const { snapshots, selectedIndex, setSelectedIndex, currentTimestamp } = useTimeline()

  const timeLabels = useMemo(() => {
    if (snapshots.length === 0) return []
    const labels: { index: number; label: string }[] = []
    snapshots.forEach((timestamp, i) => {
      const hour = timestamp.getHours()
      const min = timestamp.getMinutes()
      if (min === 0 && hour % 2 === 0) {
        labels.push({ index: i, label: format(timestamp, "HH:mm") })
      }
    })
    return labels
  }, [snapshots])

  const handlePrev = () => setSelectedIndex(Math.max(0, selectedIndex - 1))
  const handleNext = () => setSelectedIndex(Math.min(snapshots.length - 1, selectedIndex + 1))

  if (snapshots.length === 0 || !currentTimestamp) return null

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Timeline</span>
          </div>

          <button
            onClick={handlePrev}
            disabled={selectedIndex === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1">
            <Slider
              value={[selectedIndex]}
              onValueChange={([v]) => setSelectedIndex(v)}
              min={0}
              max={snapshots.length - 1}
              step={1}
              className="w-full"
            />
            <div className="relative h-4 mt-1">
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
          </div>

          <button
            onClick={handleNext}
            disabled={selectedIndex === snapshots.length - 1}
            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="text-center min-w-[80px]">
            <span className="text-lg font-mono font-bold">
              {format(currentTimestamp, "HH:mm")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
