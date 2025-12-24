"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "laminar-ui"

interface NamespaceSelectorProps {
  namespaces: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function NamespaceSelector({
  namespaces,
  value,
  onChange,
  placeholder = "Select namespace",
  disabled = false,
}: NamespaceSelectorProps) {
  // Deduplicate namespaces to avoid React key warnings
  const uniqueNamespaces = [...new Set(namespaces)]

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Namespaces</SelectItem>
        {uniqueNamespaces.map((namespace) => (
          <SelectItem key={namespace} value={namespace}>
            {namespace}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
