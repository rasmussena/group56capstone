"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Save, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

interface Quiz {
  question: string
  options: QuizOption[]
  explanation?: string
}

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  isQuiz?: boolean
  quiz?: Quiz
  quizAnswered?: boolean
  selectedOption?: string
  isCorrectAnswer?: boolean
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGreetingLoading, setIsGreetingLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Fetch greeting message when component mounts
  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const token = localStorage.getItem("access_token")

        const response = await fetch("/api/greeting", {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch greeting")
        }

        const data = await response.json()

        // Add greeting message
        const greetingMessage: Message = {
          id: "greeting",
          content:
            data.response || "Hello! I'm your textbook assistant. Ask me anything about your uploaded textbooks.",
          role: "assistant",
          timestamp: new Date(),
        }

        setMessages([greetingMessage])
      } catch (error) {
        console.error("Error fetching greeting:", error)

        // Fallback greeting if fetch fails
        const fallbackGreeting: Message = {
          id: "greeting",
          content: "Hello! I'm your textbook assistant. Ask me anything about your uploaded textbooks.",
          role: "assistant",
          timestamp: new Date(),
        }

        setMessages([fallbackGreeting])
      } finally {
        setIsGreetingLoading(false)
      }
    }

    fetchGreeting()
  }, [])

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

      // First, add the regular text response
      if (data.response) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: data.response,
          role: "assistant",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }

      // Then, if there's a quiz, add it as a separate message
      if (data.quiz) {
        // Add a small delay to make it feel more natural
        setTimeout(() => {
          const quizMessage: Message = {
            id: Date.now().toString(),
            content: data.quiz.question,
            role: "assistant",
            timestamp: new Date(),
            isQuiz: true,
            quiz: data.quiz,
            quizAnswered: false,
          }
          setMessages((prev) => [...prev, quizMessage])
        }, 1000)
      }

      // Show login prompt after a few messages if not logged in
      if (!isLoggedIn && messages.length >= 3 && !showLoginPrompt) {
        setShowLoginPrompt(true)
      }
    } catch (error) {
      console.error("Error:", error)
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again. If you're running this in preview mode, the backend server may not be available.",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuizAnswer = async (messageId: string, optionId: string, isCorrect: boolean) => {
    // Update the message to show the selected answer
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id === messageId) {
          return {
            ...message,
            quizAnswered: true,
            selectedOption: optionId,
            isCorrectAnswer: isCorrect,
          }
        }
        return message
      }),
    )

    // Send the answer to the backend to track progress
    try {
      const token = localStorage.getItem("access_token")

      if (token) {
        await fetch("/api/quiz/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messageId,
            optionId,
            isCorrect,
          }),
        })
      }

      // Add a follow-up message with explanation
      const message = messages.find((m) => m.id === messageId)
      if (message?.quiz?.explanation) {
        const explanationMessage: Message = {
          id: Date.now().toString(),
          content: isCorrect ? `✅ Correct! ${message.quiz.explanation}` : `❌ Not quite. ${message.quiz.explanation}`,
          role: "assistant",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, explanationMessage])
      } else {
        const feedbackMessage: Message = {
          id: Date.now().toString(),
          content: isCorrect ? "✅ That's correct! Great job!" : "❌ That's not correct. Let's keep learning!",
          role: "assistant",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, feedbackMessage])
      }
    } catch (error) {
      console.error("Error saving quiz answer:", error)
    }
  }

  const dismissLoginPrompt = () => {
    setShowLoginPrompt(false)
  }

  const renderMessage = (message: Message) => {
    if (message.isQuiz && message.quiz) {
      return (
        <div className="space-y-3">
          <div className="font-medium">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
          <div className="space-y-2 mt-2">
            {message.quiz.options.map((option) => (
              <Button
                key={option.id}
                className={`w-full justify-start text-left ${
                  message.quizAnswered && message.selectedOption === option.id
                    ? option.isCorrect
                      ? "bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                      : "bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                    : "bg-white hover:bg-gray-100 text-gray-800 border-gray-300"
                }`}
                variant="outline"
                disabled={message.quizAnswered}
                onClick={() => handleQuizAnswer(message.id, option.id, option.isCorrect)}
              >
                {message.quizAnswered && message.selectedOption === option.id ? (
                  option.isCorrect ? (
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  )
                ) : (
                  <div className="w-4 h-4 mr-2 rounded-full border border-gray-400" />
                )}
                {option.text}
              </Button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className={`markdown-content ${message.role === "user" ? "text-primary-foreground" : ""}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
      </div>
    )
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
          {isGreetingLoading ? (
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
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex max-w-[80%] items-start gap-3">
                  {message.role === "assistant" && (
                    <Avatar className="mt-1 h-8 w-8">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" alt="AI" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  {/* IMPORTANT: This is the key styling for user messages */}
                  <Card
                    className={`${
                      message.role === "user" ? "bg-primary text-primary-foreground user-message" : "bg-muted"
                    }`}
                  >
                    <CardContent className="p-3">{renderMessage(message)}</CardContent>
                  </Card>
                  {message.role === "user" && (
                    <Avatar className="mt-1 h-8 w-8">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Login Prompt */}
          {showLoginPrompt && !isLoggedIn && (
            <div className="flex justify-center my-4">
              <Card className="w-full max-w-md bg-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Save className="h-5 w-5 mt-1 text-primary" />
                    <div>
                      <p className="font-medium">Want to save your chat history and track your progress?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sign in or create an account to save this conversation and track your learning progress.
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
            disabled={isLoading || isGreetingLoading}
            rows={1}
            style={{ minHeight: "40px", maxHeight: "200px" }}
          />
        </div>
        <Button type="submit" size="icon" disabled={isLoading || isGreetingLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}