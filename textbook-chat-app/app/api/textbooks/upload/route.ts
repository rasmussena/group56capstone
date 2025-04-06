import { type NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import { mkdir } from "fs/promises"
import { existsSync } from "fs"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${uuidv4()}.pdf`
    const uploadPath = path.join(process.cwd(), "public", "uploads", filename)

    if (!existsSync(path.join(process.cwd(), "public", "uploads"))) {
      await mkdir(path.join(process.cwd(), "public", "uploads"), { recursive: true })
    }

    // Ensure the `public/uploads` folder exists
    await writeFile(uploadPath, buffer)

    return NextResponse.json({
      success: true,
      message: "Textbook uploaded successfully",
      textbook: {
        id: uuidv4(),
        title: file.name,
        author: "Unknown", // you could parse this later
        uploadDate: new Date(),
        pages: 300, // placeholder
        thumbnail: "/placeholder.svg?height=100&width=80",
        fileUrl: `/uploads/${filename}`,
      },
    })
  } catch (error) {
    console.error("Error uploading textbook:", error)
    return NextResponse.json({ error: "Failed to upload textbook" }, { status: 500 })
  }
}


