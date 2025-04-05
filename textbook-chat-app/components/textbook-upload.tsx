"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, File, X, Check, Loader2 } from "lucide-react"

export default function TextbookUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title || !author) return

    setUploading(true)

    try {
      // In a real app, this would be a FormData upload to your API
      // const formData = new FormData();
      // formData.append("file", file);
      // formData.append("title", title);
      // formData.append("author", author);

      // const response = await fetch("/api/textbooks/upload", {
      //   method: "POST",
      //   body: formData,
      // });

      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title)
      formData.append("author", author)

      const response = await fetch("/api/textbooks/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()
      console.log("Upload success:", data)


      setUploadSuccess(true)
      setTimeout(() => {
        setFile(null)
        setTitle("")
        setAuthor("")
        setUploadSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Error uploading textbook:", error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Upload Textbook</h2>
        <p className="text-muted-foreground">Upload your textbooks to chat with them and get instant answers.</p>
      </div>

      <form onSubmit={handleUpload}>
        <Card>
          <CardHeader>
            <CardTitle>Textbook Details</CardTitle>
            <CardDescription>Please provide the details of the textbook you want to upload.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex w-full flex-col items-center">
                  <div className="flex items-center justify-center rounded-full bg-primary/10 p-3">
                    <File className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-2 font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setFile(null)}>
                    <X className="mr-2 h-4 w-4" />
                    Remove File
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-2 text-lg font-medium">Drag and drop your PDF file</h3>
                    <p className="mt-1 text-sm text-muted-foreground">or click to browse files (PDF only, max 50MB)</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Textbook Metadata */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter textbook title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  placeholder="Enter author name"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={!file || !title || !author || uploading || uploadSuccess}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : uploadSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Uploaded Successfully
                </>
              ) : (
                "Upload Textbook"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

