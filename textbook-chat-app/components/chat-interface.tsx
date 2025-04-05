"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your textbook assistant. Ask me anything about your uploaded textbooks.",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("access_token")
    setIsLoggedIn(!!token)

    // Show login prompt after a few messages if not logged in
    if (!token && messages.length > 3 && !showLoginPrompt) {
      setShowLoginPrompt(true)
    }
  }, [messages.length, showLoginPrompt])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Get the authentication token from localStorage if available
      const token = localStorage.getItem("access_token")

      // Send the message to the API route with the token if available
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          token: token || null, // Pass the token to the API route if available
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to get response")
      }

      const data = await response.json()

      // Add assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I'm processing your request. Please wait a moment.",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Show login prompt after a few messages if not logged in
      if (!isLoggedIn && messages.length >= 3 && !showLoginPrompt) {
        setShowLoginPrompt(true)
      }
    } catch (error) {
      console.error("Error:", error)
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const dismissLoginPrompt = () => {
    setShowLoginPrompt(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Chat with your textbooks</h2>
        <p className="text-muted-foreground">Ask questions about your uploaded textbooks and get instant answers.</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto rounded-lg border bg-background p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="flex max-w-[80%] items-start gap-3">
                {message.role === "assistant" && (
                  <Avatar className="mt-1 h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="AI" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <Card className={`${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <CardContent className="p-3">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>
                {message.role === "user" && (
                  <Avatar className="mt-1 h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          ))}

          {/* Login Prompt */}
          {showLoginPrompt && !isLoggedIn && (
            <div className="flex justify-center my-4">
              <Card className="w-full max-w-md bg-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Save className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <p className="font-medium">Want to save your chat history?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sign in or create an account to save this conversation and access it later.
                      </p>
                      <div className="flex gap-3 mt-3">
                        <Button size="sm" asChild>
                          <Link href="/auth">Sign In</Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={dismissLoginPrompt}>
                          Continue as Guest
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%] items-start gap-3">
                <Avatar className="mt-1 h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="AI" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <Card className="bg-muted">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-foreground/50"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="mt-4 flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              // Auto-resize the textarea
              e.target.style.height = "inherit"
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e)
              }
            }}
            placeholder="Ask a question about your textbooks..."
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            rows={1}
            style={{ minHeight: "40px", maxHeight: "200px" }}
          />
        </div>
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

