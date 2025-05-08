import { NextResponse } from "next/server"

// The FastAPI backend URL
const BACKEND_URL = "http://localhost:8000"

export async function GET(request: Request, { params }: { params: { textbook: string } }) {
  // Properly destructure params
  const { textbook } = params

  try {
    // Forward the request to the FastAPI backend
    const response = await fetch(`${BACKEND_URL}/api/chapters/${textbook}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()

    // The backend already returns the correct format, so we don't need to transform
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error fetching chapters for ${textbook}:`, error)

    // Return mock data as fallback
    const mockChapters = [
      { id: 1, title: "Introduction", file: `/api/pdf/${textbook}/1` },
      { id: 2, title: "Basic Concepts", file: `/api/pdf/${textbook}/2` },
      { id: 3, title: "Advanced Topics", file: `/api/pdf/${textbook}/3` },
      { id: 4, title: "Case Studies", file: `/api/pdf/${textbook}/4` },
      { id: 5, title: "Practical Applications", file: `/api/pdf/${textbook}/5` },
    ]

    return NextResponse.json({
      id: textbook,
      title: `${textbook} Textbook`,
      chapters: mockChapters,
    })
  }
}
