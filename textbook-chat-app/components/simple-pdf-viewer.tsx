"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface Chapter {
  id: number
  title: string
  file: string
}

interface SimplePdfViewerProps {
  textbookId?: string
  title?: string
}

export default function SimplePdfViewer({ textbookId = "Physics", title = "Physics Textbook" }: SimplePdfViewerProps) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true)
      setError(null)

      try {
        // Call our Next.js API middleware
        const response = await fetch(`/api/chapters/${textbookId}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch chapters: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setChapters(data.chapters)

        if (data.chapters.length > 0) {
          setSelectedChapter(data.chapters[0])
        }
      } catch (err) {
        console.error("Error fetching chapters:", err)
        setError(err instanceof Error ? err.message : "Failed to load chapters")

        // Fallback to hardcoded chapters
        const fallbackChapters = [
          { id: 1, title: "Introduction", file: `/api/pdf/${textbookId}/1` },
          { id: 2, title: "Basic Concepts", file: `/api/pdf/${textbookId}/2` },
          { id: 3, title: "Advanced Topics", file: `/api/pdf/${textbookId}/3` },
          { id: 4, title: "Case Studies", file: `/api/pdf/${textbookId}/4` },
          { id: 5, title: "Practical Applications", file: `/api/pdf/${textbookId}/5` },
        ]

        setChapters(fallbackChapters)
        setSelectedChapter(fallbackChapters[0])
      } finally {
        setLoading(false)
      }
    }

    fetchChapters()
  }, [textbookId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p>Loading chapters...</p>
        </div>
      </div>
    )
  }

  if (error && chapters.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Failed to load chapters</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!selectedChapter) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold">No chapters available</h2>
          <p className="text-muted-foreground">Please select a different textbook</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar>
          <SidebarHeader>
            <h2 className="px-4 py-2 text-xl font-bold">Textbook Chapters</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Chapters</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {chapters.map((chapter) => (
                    <SidebarMenuItem key={chapter.id}>
                      <SidebarMenuButton
                        isActive={selectedChapter?.id === chapter.id}
                        onClick={() => setSelectedChapter(chapter)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Chapter {chapter.id}: {chapter.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <div className="flex h-full flex-col">
            <header className="flex h-16 items-center justify-between border-b px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-xl font-semibold">{title}</h1>
                  <p className="text-sm text-muted-foreground">{selectedChapter.title}</p>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-auto bg-muted/20 p-6">
              <div className="mx-auto max-w-4xl h-full flex flex-col items-center justify-center">
                <iframe
                  src={`${selectedChapter.file}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full border rounded-lg"
                  title={`Chapter ${selectedChapter.id}: ${selectedChapter.title}`}
                />
              </div>
            </div>
            <footer className="flex h-16 items-center justify-center gap-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  const currentIndex = chapters.findIndex((c) => c.id === selectedChapter.id)
                  if (currentIndex > 0) {
                    setSelectedChapter(chapters[currentIndex - 1])
                  }
                }}
                disabled={selectedChapter.id === chapters[0].id}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous Chapter
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const currentIndex = chapters.findIndex((c) => c.id === selectedChapter.id)
                  if (currentIndex < chapters.length - 1) {
                    setSelectedChapter(chapters[currentIndex + 1])
                  }
                }}
                disabled={selectedChapter.id === chapters[chapters.length - 1].id}
              >
                Next Chapter
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </footer>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
