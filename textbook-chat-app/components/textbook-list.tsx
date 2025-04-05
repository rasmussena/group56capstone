"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { BookOpen, Search, Trash2 } from "lucide-react"

interface Textbook {
  id: string
  title: string
  author: string
  uploadDate: Date
  pages: number
  thumbnail: string
}

export default function TextbookList() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call to fetch textbooks
    const fetchTextbooks = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await fetch("/api/textbooks");
        // const data = await response.json();

        // Mock data
        const mockData: Textbook[] = [
          {
            id: "1",
            title: "Introduction to Computer Science",
            author: "John Smith",
            uploadDate: new Date(2023, 5, 15),
            pages: 342,
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

        setTimeout(() => {
          setTextbooks(mockData)
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching textbooks:", error)
        setIsLoading(false)
      }
    }

    fetchTextbooks()
  }, [])

  const filteredTextbooks = textbooks.filter(
    (textbook) =>
      textbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      textbook.author.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleDeleteTextbook = (id: string) => {
    // In a real app, this would be an API call
    // await fetch(`/api/textbooks/${id}`, { method: "DELETE" });
    setTextbooks((prev) => prev.filter((textbook) => textbook.id !== id))
  }

  return (
    <div className="space-y-6">
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
                <Button variant="outline" size="sm">
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
    </div>
  )
}

