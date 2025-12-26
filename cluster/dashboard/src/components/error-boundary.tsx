"use client"

import { Component, ReactNode } from "react"
import { Card, CardContent, Button } from "e6ds"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card className="border-destructive">
          <CardContent className="py-6 flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <p className="font-semibold">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-1">
                {this.state.error?.message || "An error occurred"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

// Inline error display for query failures
export function QueryError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-6 w-6 text-destructive mb-2" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  )
}
