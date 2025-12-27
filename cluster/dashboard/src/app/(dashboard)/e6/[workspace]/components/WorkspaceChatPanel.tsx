"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from "e6ds"
import { Send, Bot, User, Loader2, Code, AlertCircle, MessageSquare, X } from "lucide-react"

// Simple ID generator
let idCounter = 0
function generateId(): string {
  return `msg-${Date.now()}-${++idCounter}`
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sql?: string | null
  error?: string | null
  timestamp: Date
}

interface WorkspaceChatPanelProps {
  eksCluster: string
  e6Clusters: string[]
}

const EXAMPLE_QUESTIONS = [
  "What is the total cost for this workspace today?",
  "Which nodes have lowest CPU utilization?",
  "Show me the most expensive pods",
  "What is the memory usage trend?",
]

export function WorkspaceChatPanel({ eksCluster, e6Clusters }: WorkspaceChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSql, setShowSql] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            eksCluster,
            e6Clusters,
          },
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.answer || data.error || "No response",
        sql: data.sql,
        error: data.error,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: `Error: ${error}`,
        error: String(error),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (question: string) => {
    setInput(question)
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-none shadow-lg"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[420px] h-[600px] z-50">
      <Card className="h-full flex flex-col shadow-2xl">
        <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Context: {eksCluster}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Bot className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium mb-2">Ask about {eksCluster}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                I know about costs, nodes, pods, and E6 clusters in this workspace
              </p>
              <div className="flex flex-col gap-2 w-full">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(q)}
                    className="text-xs px-3 py-2 border hover:bg-muted transition-colors text-left rounded"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0 rounded">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? "bg-muted p-2 rounded"
                      : "bg-card border p-2 rounded"
                  }`}
                >
                  <div className="text-xs whitespace-pre-wrap">{message.content}</div>

                  {message.sql && (
                    <div className="mt-2 pt-2 border-t">
                      <button
                        onClick={() =>
                          setShowSql(showSql === message.id ? null : message.id)
                        }
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Code className="h-3 w-3" />
                        {showSql === message.id ? "Hide SQL" : "Show SQL"}
                      </button>
                      {showSql === message.id && (
                        <pre className="mt-2 p-2 bg-muted text-[10px] overflow-x-auto rounded">
                          {message.sql}
                        </pre>
                      )}
                    </div>
                  )}

                  {message.error && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      Query error
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-7 h-7 bg-muted flex items-center justify-center flex-shrink-0 rounded">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0 rounded">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card border p-2 rounded">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-3 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this workspace..."
              disabled={isLoading}
              className="flex-1 text-sm"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="sm">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
