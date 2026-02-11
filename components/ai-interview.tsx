"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Brain, Send, User, Bot, Loader2 } from "lucide-react"

interface AIInterviewProps {
  code?: string
  language?: string
  questionTitle?: string
  score?: number
  isActive: boolean
}

function getMessageText(
  parts: Array<{ type: string; text?: string }> | undefined
): string {
  if (!parts || !Array.isArray(parts)) return ""
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export function AIInterview({
  code,
  language,
  questionTitle,
  score,
  isActive,
}: AIInterviewProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/interview",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          messages,
          id,
          context: { code, language, questionTitle, score },
        },
      }),
    }),
  })

  const isStreaming = status === "streaming"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage({ text: input })
    setInput("")
  }

  if (!isActive) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-border bg-card p-6">
        <Brain className="mb-3 h-10 w-10 text-muted-foreground opacity-50" />
        <p className="text-center text-sm text-muted-foreground">
          AI Interview will begin after you submit your code.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">AI Interview</p>
          <p className="text-xs text-muted-foreground">Technical follow-up questions</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {messages.length} messages
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-sm text-foreground">
                Welcome to the AI technical interview. I will ask you questions about your code
                and problem-solving approach. Please explain your thought process clearly.
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const text = getMessageText(msg.parts)
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user" ? "bg-primary" : "bg-accent"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-accent-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {text}
                </div>
              </div>
            )
          })}
          {isStreaming && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs">AI is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer..."
          disabled={isStreaming}
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={!input.trim() || isStreaming}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
