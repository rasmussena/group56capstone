import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"

const METADATA_PATH = path.join(process.cwd(), "data", "books.json")

export async function GET(req: NextRequest) {
  try {
    if (!existsSync(METADATA_PATH)) {
      return NextResponse.json([]) // no books yet
    }

    const raw = await readFile(METADATA_PATH, "utf-8")
    const books = JSON.parse(raw)

    // Optional: convert uploadDate to string format
    const textbooks = books.map((book: any) => ({
      ...book,
      uploadDate: new Date(book.uploadDate),
    }))

    return NextResponse.json(textbooks)
  } catch (error) {
    console.error("Failed to load books metadata:", error)
    return NextResponse.json([], { status: 200 })
  }
}
