"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Star, Clock, FileSpreadsheet, Search, MoreHorizontal, X } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/Dashboard/dashboard-layout"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useSpreadsheetApi } from "@/lib/supabase/secure-api"
import { SpreadsheetProvider, useSpreadsheet } from "@/context/spreadsheet-context"
import type { Spreadsheet } from "@/lib/supabase/types"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { motion } from "framer-motion"
import React from "react"
import { MessageLoading } from "@/components/ui/message-loading"
import RecentSpreadsheets from "@/components/Dashboard/RecentSpreadsheets"

// Extended spreadsheet type for UI operations
interface UISpreadsheet extends Spreadsheet {
  _deleted?: boolean;
}

function SpreadsheetCard({ sheet, onUpdate }: { sheet: UISpreadsheet, onUpdate: (updatedSheet: UISpreadsheet) => void }) {
  return (
    <SpreadsheetProvider spreadsheetId={sheet.id}>
      <SpreadsheetCardContent sheet={sheet} onUpdate={onUpdate} />
    </SpreadsheetProvider>
  )
}

const MemoizedSpreadsheetCard = React.memo(SpreadsheetCard)

function SpreadsheetCardContent({ sheet, onUpdate }: { sheet: UISpreadsheet, onUpdate: (updatedSheet: UISpreadsheet) => void }) {
  const { toggleStar, isStarred } = useSpreadsheet()
  const spreadsheetApi = useSpreadsheetApi()
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(sheet.title)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleStar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleStar()
  }

  const handleRename = async () => {
    if (newTitle.trim() === '') return
    
    setIsLoading(true)
    try {
      const response = await spreadsheetApi.updateTitle(sheet.id, newTitle)
      if (response.error) {
        throw response.error
      }
      setIsRenaming(false)
      
      // Update the spreadsheet in the parent component
      onUpdate({
        ...sheet,
        title: newTitle
      } as UISpreadsheet)
    } catch (e) {
      console.error("Failed to rename spreadsheet:", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicate = async () => {
    setIsLoading(true)
    try {
      // Create a new spreadsheet with the same data
      const response = await spreadsheetApi.createSpreadsheet(`${sheet.title} (Copy)`)
      if (response.error) {
        throw response.error
      }
      if (response.data?.[0]?.id) {
        // Update the new spreadsheet with the data from the current one
        await spreadsheetApi.updateSpreadsheet(response.data[0].id, sheet.data || {})
        
        // Fetch updated spreadsheet list instead of refreshing page
        window.location.reload()
      }
    } catch (e) {
      console.error("Failed to duplicate spreadsheet:", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = () => {
    // Copy the spreadsheet URL to clipboard
    const url = `${window.location.origin}/spreadsheet/${sheet.id}`
    navigator.clipboard.writeText(url)
    // Use a toast notification instead of an alert for better UX
    alert("Spreadsheet URL copied to clipboard!")
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this spreadsheet? This action cannot be undone.")) {
      setIsLoading(true)
      try {
        const response = await spreadsheetApi.deleteSpreadsheet(sheet.id)
        if (response.error) {
          throw response.error
        }
        
        // Signal to parent that this sheet was deleted
        onUpdate({
          ...sheet,
          _deleted: true
        } as UISpreadsheet)
      } catch (e) {
        console.error("Failed to delete spreadsheet:", e)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      className="group"
      layout
    >
      <Card className="overflow-hidden transition-all hover:shadow-md">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 bg-muted/30">
            <div className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 mr-2 text-primary" />
              {isRenaming ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleRename()
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    disabled={isLoading}
                  />
                  <Button type="submit" size="sm" variant="ghost" disabled={isLoading}>
                    {isLoading ? <MessageLoading /> : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsRenaming(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <Link href={`/spreadsheet/${sheet.id}`}>
                  <span className="font-medium text-gray-900">{sheet.title}</span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleStar}
                disabled={isLoading}
              >
                <Star
                  className={`h-4 w-4 ${
                    isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
                    {isLoading ? (
                      <MessageLoading />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground">
              Last edited {formatDistanceToNow(new Date(sheet.updated_at))} ago
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { getSpreadsheets, createSpreadsheet, isLoaded, isSignedIn } = useSpreadsheetApi()
  const [spreadsheets, setSpreadsheets] = useState<UISpreadsheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreatingSheet, setIsCreatingSheet] = useState(false)

  // Preload critical content
  const [headingVisible, setHeadingVisible] = useState(true)

  // Use priority loading for fonts
  useEffect(() => {
    // Preload critical fonts
    const fontPreload = document.createElement('link')
    fontPreload.href = '/fonts/your-bold-font.woff2' // Update with your actual font path
    fontPreload.rel = 'preload'
    fontPreload.as = 'font'
    fontPreload.type = 'font/woff2'
    fontPreload.crossOrigin = 'anonymous'
    document.head.appendChild(fontPreload)

    return () => {
      document.head.removeChild(fontPreload)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadSpreadsheets()
    }
  }, [isLoaded, isSignedIn])

  async function loadSpreadsheets() {
    setLoading(true)
    setError(null)
    try {
      const response = await getSpreadsheets()
      if (response.error) {
        throw response.error
      }
      setSpreadsheets(response.data || [])
    } catch (e) {
      console.error("Failed to load spreadsheets:", e)
      setError(e instanceof Error ? e.message : "Failed to load spreadsheets")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateSpreadsheet() {
    setIsCreatingSheet(true)
    try {
      const response = await createSpreadsheet("Untitled Spreadsheet")
      if (response.error) {
        throw response.error
      }
      if (response.data?.[0]?.id) {
        window.location.href = `/spreadsheet/${response.data[0].id}`
      }
    } catch (e) {
      console.error("Failed to create spreadsheet:", e)
      setIsCreatingSheet(false)
    }
  }

  // Function to update a spreadsheet in the state
  const handleUpdateSpreadsheet = (updatedSheet: UISpreadsheet) => {
    setSpreadsheets(prevSheets => {
      // If sheet is marked for deletion, filter it out
      if (updatedSheet._deleted) {
        return prevSheets.filter(s => s.id !== updatedSheet.id)
      }
      
      // Otherwise update the sheet
      return prevSheets.map(s => 
        s.id === updatedSheet.id ? updatedSheet : s
      )
    })
  }

  // Memoize filtered spreadsheets to avoid recalculations on every render
  const filteredSpreadsheets = React.useMemo(() => 
    spreadsheets.filter(sheet =>
      sheet.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [spreadsheets, searchQuery]
  )

  // Filter starred and recent spreadsheets from filtered results
  const starredSpreadsheets = React.useMemo(() => 
    filteredSpreadsheets.filter(sheet => sheet.data?.isStarred),
    [filteredSpreadsheets]
  )
  
  const recentSpreadsheets = React.useMemo(() => 
    filteredSpreadsheets
      .filter(sheet => !sheet.data?.isStarred)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [filteredSpreadsheets]
  )

  // Simple header that renders immediately
  const PageHeader = () => (
    <>
      {/* Optimized heading to improve LCP - this gets rendered immediately */}
      {headingVisible && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 
            className="text-3xl font-bold text-gray-900"
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            Your Spreadsheets
          </h2>
        </div>
      )}
    </>
  )

  const renderContent = () => {
    if (!isLoaded || loading) {
      return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <MessageLoading />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center flex-col">
          <PageHeader />
          <div className="text-center">
            <p className="text-red-500 mb-2">Error loading spreadsheets</p>
            <Button onClick={loadSpreadsheets}>Try Again</Button>
          </div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 
            className="text-3xl font-bold text-gray-900"
            style={{ fontVariationSettings: "'wght' 700" }}
          >
            Your Spreadsheets
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-[400px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search spreadsheets..."
                className="w-full bg-gray-100 pl-9 focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button 
              onClick={handleCreateSpreadsheet} 
              className="w-full sm:w-auto flex items-center gap-2"
              disabled={isCreatingSheet}
            >
              {isCreatingSheet ? (
                <MessageLoading />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              New Spreadsheet
            </Button>
          </div>
        </div>

        {searchQuery && filteredSpreadsheets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No spreadsheets found matching "{searchQuery}"</p>
          </div>
        ) : (
          <>
            {/* Defer non-critical rendering */}
            <React.Suspense fallback={<div className="h-8 w-full bg-gray-100 animate-pulse rounded"></div>}>
              {/* Starred Spreadsheets */}
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-xl font-semibold text-gray-900">Starred</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {starredSpreadsheets.map((sheet) => (
                    <MemoizedSpreadsheetCard 
                      key={sheet.id} 
                      sheet={sheet} 
                      onUpdate={handleUpdateSpreadsheet}
                    />
                  ))}
                  {starredSpreadsheets.length === 0 && (
                    <p className="text-gray-500 col-span-3">No starred spreadsheets yet</p>
                  )}
                </div>
              </div>
            </React.Suspense>

            {/* Lazy load recent spreadsheets */}
            <React.Suspense fallback={<div className="h-8 w-full bg-gray-100 animate-pulse rounded"></div>}>
              {/* Recent Spreadsheets */}
              <RecentSpreadsheets 
                spreadsheets={recentSpreadsheets} 
                onUpdate={handleUpdateSpreadsheet} 
                SpreadsheetCard={MemoizedSpreadsheetCard} 
              />
            </React.Suspense>
          </>
        )}
      </div>
    )
  }

  return (
    <SidebarProvider>
      <DashboardLayout>
        {renderContent()}
      </DashboardLayout>
    </SidebarProvider>
  )
}
