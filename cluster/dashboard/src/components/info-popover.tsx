"use client"

import { Info } from "lucide-react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  ScrollArea,
} from "e6ds"

interface InfoPopoverProps {
  title: string
  description: string
  sql?: string
}

export function InfoPopover({ title, description, sql }: InfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px]" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          {sql && (
            <div>
              <h4 className="font-semibold text-sm mb-2">SQL Query</h4>
              <ScrollArea className="h-[200px] rounded border bg-muted/50">
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {sql}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
