import { NextResponse } from "next/server"

// The FastAPI backend URL
const BACKEND_URL = "http://localhost:8000"

export async function GET(request: Request, { params }: { params: { textbook: string; chapter: string } }) {
  // Properly destructure params
  const { textbook, chapter } = params

  try {
    // Forward the request to the FastAPI backend
    const response = await fetch(`${BACKEND_URL}/api/pdf/${textbook}/${chapter}`, {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    // Get the PDF data as an array buffer
    const pdfData = await response.arrayBuffer()

    // Create a new response with the PDF data and appropriate headers
    return new NextResponse(pdfData, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${textbook}_chapter${chapter}.pdf"`,
      },
    })
  } catch (error) {
    console.error(`Error fetching PDF for ${textbook} chapter ${chapter}:`, error)

    return new NextResponse(
      JSON.stringify({
        error: "Failed to fetch PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
