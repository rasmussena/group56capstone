import { NextResponse } from "next/server"

// Mock database for textbooks
const textbooks = [
  {
    id: "1",
    title: "Physics",
    author: "PAUL PETER URONE, ROGER HINRICHS",
    uploadDate: new Date(2023, 5, 15),
    pages: 850,
    thumbnail: "/physics.jpeg?height=100&width=80",
  },
  {
    id: "2",
    title: "Advanced Mathematics",
    author: "Jane Doe",
    uploadDate: new Date(2023, 6, 22),
    pages: 512,
    thumbnail: "/placeholder.svg?height=100&width=80",
  },
  {
    id: "3",
    title: "Physics Fundamentals",
    author: "Robert Johnson",
    uploadDate: new Date(2023, 7, 10),
    pages: 278,
    thumbnail: "/placeholder.svg?height=100&width=80",
  },
]

export async function GET() {
  // Simulate database delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json(textbooks)
}

