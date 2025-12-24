"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "laminar-ui"

interface ClusterSelectorProps {
  clusters: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ClusterSelector({
  clusters,
  value,
  onChange,
  placeholder = "Select cluster",
}: ClusterSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clusters.map((cluster) => (
          <SelectItem key={cluster} value={cluster}>
            {cluster}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
