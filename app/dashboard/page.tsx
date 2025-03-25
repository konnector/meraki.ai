"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Star, Clock, FileSpreadsheet, Loader2, Search, MoreHorizontal, X } from "lucide-react"
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

function SpreadsheetCard({ sheet }: { sheet: Spreadsheet }) {
  return (
    <SpreadsheetProvider spreadsheetId={sheet.id}>
      <SpreadsheetCardContent sheet={sheet} />
    </SpreadsheetProvider>
  )
}

function SpreadsheetCardContent({ sheet }: { sheet: Spreadsheet }) {
  const { toggleStar, isStarred } = useSpreadsheet()
  const spreadsheetApi = useSpreadsheetApi()
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(sheet.title)

  const handleToggleStar = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleStar()
  }

  const handleRename = async () => {
    try {
      const response = await spreadsheetApi.updateTitle(sheet.id, newTitle)
      if (response.error) {
        throw response.error
      }
      setIsRenaming(false)
      // Refresh the page to show updated title
      window.location.reload()
    } catch (e) {
      console.error("Failed to rename spreadsheet:", e)
    }
  }

  const handleDuplicate = async () => {
    try {
      // Create a new spreadsheet with the same data
      const response = await spreadsheetApi.createSpreadsheet(`${sheet.title} (Copy)`)
      if (response.error) {
        throw response.error
      }
      if (response.data?.[0]?.id) {
        // Update the new spreadsheet with the data from the current one
        await spreadsheetApi.updateSpreadsheet(response.data[0].id, sheet.data || {})
        // Refresh the page to show the new spreadsheet
        window.location.reload()
      }
    } catch (e) {
      console.error("Failed to duplicate spreadsheet:", e)
    }
  }

  const handleShare = () => {
    // Copy the spreadsheet URL to clipboard
    const url = `${window.location.origin}/spreadsheet/${sheet.id}`
    navigator.clipboard.writeText(url)
    alert("Spreadsheet URL copied to clipboard!")
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this spreadsheet? This action cannot be undone.")) {
      try {
        const response = await spreadsheetApi.deleteSpreadsheet(sheet.id)
        if (response.error) {
          throw response.error
        }
        // Refresh the page to show updated list
        window.location.reload()
      } catch (e) {
        console.error("Failed to delete spreadsheet:", e)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="group"
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
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsRenaming(false)}
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
              >
                <Star
                  className={`h-4 w-4 ${
                    isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
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
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

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
    }
  }

  // Filter spreadsheets based on search query
  const filteredSpreadsheets = spreadsheets.filter(sheet =>
    sheet.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter starred and recent spreadsheets from filtered results
  const starredSpreadsheets = filteredSpreadsheets.filter(sheet => sheet.data?.isStarred)
  const recentSpreadsheets = filteredSpreadsheets
    .filter(sheet => !sheet.data?.isStarred) // Exclude starred spreadsheets
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  if (!isLoaded || loading) {
    return (
      <SidebarProvider>
        <DashboardLayout>
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        </DashboardLayout>
      </SidebarProvider>
    )
  }

  if (error) {
    return (
      <SidebarProvider>
        <DashboardLayout>
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading spreadsheets</p>
              <Button onClick={loadSpreadsheets}>Try Again</Button>
            </div>
          </div>
        </DashboardLayout>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900">Your Spreadsheets</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-[400px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search For Anything...(Spreadsheet, Features, etc)"
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
              <Button onClick={handleCreateSpreadsheet} className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
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
              {/* Starred Spreadsheets */}
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-xl font-semibold text-gray-900">Starred</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {starredSpreadsheets.map((sheet) => (
                    <SpreadsheetCard key={sheet.id} sheet={sheet} />
                  ))}
                  {starredSpreadsheets.length === 0 && (
                    <p className="text-gray-500 col-span-3">No starred spreadsheets yet</p>
                  )}
                </div>
              </div>

              {/* Recent Spreadsheets */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <h3 className="text-xl font-semibold text-gray-900">Recent</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {recentSpreadsheets.map((sheet) => (
                    <SpreadsheetCard key={sheet.id} sheet={sheet} />
                  ))}
                  {recentSpreadsheets.length === 0 && (
                    <p className="text-gray-500 col-span-3">No spreadsheets yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </SidebarProvider>
  )
}
