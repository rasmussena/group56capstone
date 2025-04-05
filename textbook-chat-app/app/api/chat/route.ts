import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { message, token } = await req.json()

    // Prepare headers for the backend request
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // Add authorization header if token is provided
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    // Send the message to the backend API
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: errorData.detail || "Backend API error" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data) // Forward the backend response
  } catch (error) {
    console.error("Error processing chat:", error)
    return NextResponse.json({ error: "Failed to process your request" }, { status: 500 })
  }
}

