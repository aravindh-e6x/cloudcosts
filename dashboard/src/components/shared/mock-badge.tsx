"use client"

import { Badge } from "laminar-ui"
import { FlaskConical } from "lucide-react"

interface MockBadgeProps {
  className?: string
}

export function MockBadge({ className }: MockBadgeProps) {
  return (
    <Badge variant="outline" className={`bg-amber-100 text-amber-800 border-amber-300 ${className || ''}`}>
      <FlaskConical className="h-3 w-3 mr-1" />
      Mock
    </Badge>
  )
}
