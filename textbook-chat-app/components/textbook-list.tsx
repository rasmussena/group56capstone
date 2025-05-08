"use client"

import { useState, useEffect } from "react"
import { Search, BookOpen, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SimplePdfViewer from "@/components/simple-pdf-viewer"

interface Chapter {
  id: number
  title: string
  file: string
}


interface Textbook {
  id: string
  title: string
  chapters: Chapter[]
  author?: string
  pages?: number
  uploadDate?: Date
  thumbnail?: string
}

export default function TextbookList() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTextbook, setSelectedTextbook] = useState<Textbook | null>(null)

  useEffect(() => {
    const fetchTextbooks = async () => {
      try {
        // Call our Next.js API middleware
        const response = await fetch("/api/textbooks")

        if (!response.ok) {
          throw new Error(`Failed to fetch textbooks: ${response.status}`)
        }

        const data = await response.json()

        // Add additional metadata for display purposes
        const enhancedData = data.map((book: Textbook) => ({
          ...book,
          author: book.author || `Author of ${book.title}`,
          pages: book.pages || book.chapters?.length * 20 || 100,
          uploadDate: book.uploadDate ? new Date(book.uploadDate) : new Date(),
          thumbnail: book.thumbnail || "/placeholder.svg",
        }))

        setTextbooks(enhancedData)
      } catch (error) {
        console.error("Error fetching textbooks:", error)

        // Fallback mock data
        const mockTextbooks = [
          {
            id: "Physics",
            title: "Introduction to Physics",
            author: "John Doe",
            pages: 350,
            uploadDate: new Date("2023-01-15"),
            thumbnail: "/placeholder.svg",
            chapters: [
              { id: 1, title: "Introduction", file: "/api/pdf/Physics/1" },
              { id: 2, title: "Basic Concepts", file: "/api/pdf/Physics/2" },
              { id: 3, title: "Advanced Topics", file: "/api/pdf/Physics/3" },
            ],
          },
          {
            id: "Chemistry",
            title: "Advanced Chemistry",
            author: "Jane Smith",
            pages: 420,
            uploadDate: new Date("2023-02-20"),
            thumbnail: "/placeholder.svg",
            chapters: [
              { id: 1, title: "Introduction", file: "/api/pdf/Chemistry/1" },
              { id: 2, title: "Basic Concepts", file: "/api/pdf/Chemistry/2" },
            ],
          },
        ]

        setTextbooks(mockTextbooks)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTextbooks()
  }, [])

  const filteredTextbooks = textbooks.filter(
    (textbook) =>
      textbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (textbook.author && textbook.author.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleViewTextbook = (textbook: Textbook) => {
    setSelectedTextbook(textbook)
  }

  const handleDeleteTextbook = (id: string) => {
    setTextbooks((prev) => prev.filter((textbook) => textbook.id !== id))
  }

  return (
    <div className="space-y-6">
      {selectedTextbook ? (
        <div>
          <div className="mb-4">
            <Button variant="outline" onClick={() => setSelectedTextbook(null)}>
              ← Back to Textbooks
            </Button>
          </div>
          <SimplePdfViewer textbookId={selectedTextbook.id} title={selectedTextbook.title} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">Your Textbooks</h2>
            <p className="text-muted-foreground">Browse and manage your uploaded textbooks.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search textbooks..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-32 bg-muted"></CardHeader>
                  <CardContent className="pt-4">
                    <div className="h-4 w-3/4 rounded bg-muted"></div>
                    <div className="mt-2 h-3 w-1/2 rounded bg-muted"></div>
                  </CardContent>
                  <CardFooter className="h-10 bg-muted/50"></CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredTextbooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTextbooks.map((textbook) => (
                <Card key={textbook.id}>
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className="h-20 w-16 overflow-hidden rounded border bg-muted">
                      <img
                        src={textbook.thumbnail || "/placeholder.svg"}
                        alt={textbook.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{textbook.title}</CardTitle>
                      <CardDescription>{textbook.author}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{textbook.pages} pages</span>
                      <span>{textbook.uploadDate.toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm" onClick={() => handleViewTextbook(textbook)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteTextbook(textbook.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No textbooks found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Upload your first textbook to get started"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
