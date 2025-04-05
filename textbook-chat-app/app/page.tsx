"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BookOpen, Upload, MessageSquare, User, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import ChatInterface from "@/components/chat-interface"
import TextbookList from "@/components/textbook-list"
import TextbookUpload from "@/components/textbook-upload"
import UserProfile from "@/components/user-profile"

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("access_token")
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    setIsLoggedIn(false)
    // Stay on the current page, just update the auth state
  }

  const handleLogin = () => {
    router.push("/auth")
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">TextbookAI</span>
        </div>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleLogin}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => router.push("/auth?tab=register")}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col md:flex-row">
        {/* Sidebar */}
        <div className="border-r bg-muted/40 md:w-64">
          <div className="flex h-full flex-col p-4">
            <nav className="grid w-full grid-cols-4 md:grid-cols-1 md:grid-rows-4 gap-2">
              <Button
                variant={activeTab === "chat" ? "default" : "ghost"}
                className="flex flex-col items-center justify-center md:flex-row md:justify-start md:gap-2 p-2"
                onClick={() => setActiveTab("chat")}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="hidden md:inline">Chat</span>
              </Button>
              <Button
                variant={activeTab === "textbooks" ? "default" : "ghost"}
                className="flex flex-col items-center justify-center md:flex-row md:justify-start md:gap-2 p-2"
                onClick={() => {
                  if (!isLoggedIn) {
                    router.push("/auth")
                  } else {
                    setActiveTab("textbooks")
                  }
                }}
              >
                <BookOpen className="h-5 w-5" />
                <span className="hidden md:inline">Textbooks</span>
              </Button>
              <Button
                variant={activeTab === "upload" ? "default" : "ghost"}
                className="flex flex-col items-center justify-center md:flex-row md:justify-start md:gap-2 p-2"
                onClick={() => {
                  if (!isLoggedIn) {
                    router.push("/auth")
                  } else {
                    setActiveTab("upload")
                  }
                }}
              >
                <Upload className="h-5 w-5" />
                <span className="hidden md:inline">Upload</span>
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                className="flex flex-col items-center justify-center md:flex-row md:justify-start md:gap-2 p-2"
                onClick={() => {
                  if (!isLoggedIn) {
                    router.push("/auth")
                  } else {
                    setActiveTab("profile")
                  }
                }}
              >
                <User className="h-5 w-5" />
                <span className="hidden md:inline">Profile</span>
              </Button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-6">
          <Tabs value={activeTab} className="w-full">
            <TabsContent value="chat" className="mt-0">
              <ChatInterface />
            </TabsContent>
            <TabsContent value="textbooks" className="mt-0">
              {!isLoggedIn ? (
                <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center">
                  <div className="mb-4 text-center">
                    <h2 className="text-2xl font-bold">Sign in to view your textbooks</h2>
                    <p className="text-muted-foreground">You need to be signed in to access your textbooks.</p>
                  </div>
                  <Button onClick={handleLogin}>Sign In</Button>
                </div>
              ) : (
                <TextbookList />
              )}
            </TabsContent>
            <TabsContent value="upload" className="mt-0">
              {!isLoggedIn ? (
                <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center">
                  <div className="mb-4 text-center">
                    <h2 className="text-2xl font-bold">Sign in to upload textbooks</h2>
                    <p className="text-muted-foreground">You need to be signed in to upload textbooks.</p>
                  </div>
                  <Button onClick={handleLogin}>Sign In</Button>
                </div>
              ) : (
                <TextbookUpload />
              )}
            </TabsContent>
            <TabsContent value="profile" className="mt-0">
              {!isLoggedIn ? (
                <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center">
                  <div className="mb-4 text-center">
                    <h2 className="text-2xl font-bold">Sign in to view your profile</h2>
                    <p className="text-muted-foreground">You need to be signed in to access your profile.</p>
                  </div>
                  <Button onClick={handleLogin}>Sign In</Button>
                </div>
              ) : (
                <UserProfile />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

