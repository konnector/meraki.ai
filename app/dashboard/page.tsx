"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Bookmark, Clock, FileSpreadsheet, Search, MoreHorizontal, X } from "lucide-react"
import Link from "next/link"
import DashboardLayout from "@/components/Dashboard/dashboard-layout"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useSpreadsheetApi } from "@/lib/supabase/secure-api"
import { SpreadsheetProvider, useSpreadsheet } from "@/context/spreadsheet-context"
import { useFolder } from "@/context/folder-context"
import type { Spreadsheet } from "@/lib/supabase/types"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { motion } from "framer-motion"
import React from "react"
import { MessageLoading } from "@/components/ui/message-loading"
import RecentSpreadsheets from "@/components/Dashboard/RecentSpreadsheets"
import { MoveFolderModal } from "@/components/move-folder-modal"
import SpreadsheetPreview from "@/components/SpreadSheet/spreadsheet-preview"
import { useUser } from "@clerk/nextjs"
import { useDraggable } from "@dnd-kit/core"
import { DndContext, DragEndEvent } from "@dnd-kit/core"

// Extended spreadsheet type for UI operations
interface UISpreadsheet extends Spreadsheet {
  _deleted?: boolean;
}

function SpreadsheetCard({ sheet, onUpdate }: { sheet: UISpreadsheet, onUpdate: (updatedSheet: UISpreadsheet) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: sheet.id,
    data: {
      type: 'spreadsheet',
      spreadsheet: sheet
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined

  return (
    <SpreadsheetProvider spreadsheetId={sheet.id}>
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <SpreadsheetCardContent sheet={sheet} onUpdate={onUpdate} />
      </div>
    </SpreadsheetProvider>
  )
}

const MemoizedSpreadsheetCard = React.memo(SpreadsheetCard)

function SpreadsheetCardContent({ sheet, onUpdate }: { sheet: UISpreadsheet, onUpdate: (updatedSheet: UISpreadsheet) => void }) {
  const { toggleStar: toggleBookmark, isStarred: isBookmarked } = useSpreadsheet()
  const spreadsheetApi = useSpreadsheetApi()
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(sheet.title)
  const [isLoading, setIsLoading] = useState(false)
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)

  const handleToggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsLoading(true)
    try {
      const newIsStarred = !sheet.data?.isStarred
      const response = await spreadsheetApi.updateSpreadsheet(sheet.id, {
        ...sheet.data,
        isStarred: newIsStarred,
        meta: {
          rowCount: 100,
          columnCount: 26,
          lastModified: new Date().toISOString(),
        }
      })
      
      if (response.error) {
        throw response.error
      }
      
      onUpdate({
        ...sheet,
        data: {
          ...(sheet.data || {}),
          isStarred: newIsStarred
        }
      })
    } catch (e) {
      console.error("Failed to toggle bookmark:", e)
    } finally {
      setIsLoading(false)
    }
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
      const response = await spreadsheetApi.createSpreadsheet(`${sheet.title} (Copy)`)
      if (response.error) {
        throw response.error
      }
      if (response.data?.[0]?.id) {
        await spreadsheetApi.updateSpreadsheet(response.data[0].id, sheet.data || {})
        window.location.reload()
      }
    } catch (e) {
      console.error("Failed to duplicate spreadsheet:", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/spreadsheet/${sheet.id}`
    navigator.clipboard.writeText(url)
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
      className="group relative"
      layout
    >
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 absolute right-2 top-2 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleToggleBookmark(e);
          }}
          disabled={isLoading}
        >
          <Bookmark
            className={`h-4 w-4 transition-colors ${
              isLoading ? "text-gray-300" : sheet.data?.isStarred ? "fill-gray-900 text-gray-900" : "text-gray-400"
            }`}
          />
        </Button>
        <Link href={`/spreadsheet/${sheet.id}`} className="block" onClick={(e) => {
          if (isLoading) {
            e.preventDefault();
          }
        }}>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            {/* Thumbnail */}
            <div className="h-36 bg-gray-50 border-b border-gray-200 flex items-center justify-center p-4">
              <SpreadsheetPreview cells={sheet.data?.cells || {}} />
            </div>
            
            {/* Metadata */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
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
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {sheet.title}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isLoading}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        {isLoading ? (
                          <MessageLoading />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsRenaming(true);
                      }}>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDuplicate();
                      }}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleShare();
                      }}>
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsMoveModalOpen(true);
                      }}>
                        Move to
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete();
                        }}
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center text-xs text-gray-500">
                <span>Opened {formatDistanceToNow(new Date(sheet.updated_at))} ago</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <MoveFolderModal
        open={isMoveModalOpen}
        onOpenChange={setIsMoveModalOpen}
        spreadsheetId={sheet.id}
        currentFolderId={sheet.folder_id || null}
      />
    </motion.div>
  )
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const { getSpreadsheets, createSpreadsheet, isLoaded, isSignedIn } = useSpreadsheetApi()
  const { activeFolder, folders, setActiveFolder, moveSpreadsheet } = useFolder()
  const { user } = useUser()
  const [spreadsheets, setSpreadsheets] = useState<UISpreadsheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreatingSheet, setIsCreatingSheet] = useState(false)
  const [headingVisible, setHeadingVisible] = useState(true)

  // Sync activeFolder with URL parameter
  useEffect(() => {
    const folderParam = searchParams.get('folder')
    // Only update if there's a mismatch between URL and state
    if ((folderParam && folderParam !== activeFolder) || (!folderParam && activeFolder !== null)) {
      setActiveFolder(folderParam || null)
    }
  }, [searchParams, activeFolder, setActiveFolder])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadSpreadsheets()
    }
  }, [isLoaded, isSignedIn, activeFolder])

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
      const response = await createSpreadsheet("Untitled Spreadsheet", activeFolder)
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

  // Filter spreadsheets based on active folder and search query
  const filteredSpreadsheets = React.useMemo(() => {
    let filtered = spreadsheets

    // Filter by folder
    if (activeFolder) {
      filtered = filtered.filter(sheet => sheet.folder_id === activeFolder)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(sheet =>
        sheet.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [spreadsheets, activeFolder, searchQuery])

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

  // Get current folder name for display
  const currentFolderName = React.useMemo(() => {
    if (!activeFolder) return "All Spreadsheets"
    const folder = folders.find(f => f.id === activeFolder)
    return folder ? folder.name : "All Spreadsheets"
  }, [activeFolder, folders])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const spreadsheetId = active.id as string
    const folderId = over.data.current?.folderId as string | null

    if (active.data.current?.type === 'spreadsheet' && over.data.current?.type === 'folder') {
      try {
        await moveSpreadsheet(spreadsheetId, folderId)
        // Refresh the spreadsheets list
        loadSpreadsheets()
      } catch (error) {
        console.error('Failed to move spreadsheet:', error)
      }
    }
  }

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
          <div className="text-center">
            <p className="text-red-500 mb-2">Error loading spreadsheets</p>
            <Button onClick={loadSpreadsheets}>Try Again</Button>
          </div>
        </div>
      )
    }

    return (
      <DndContext onDragEnd={handleDragEnd}>
        <div className="p-6">
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
                    <Bookmark className="h-5 w-5 text-gray-900" />
                    <h3 className="text-xl font-semibold text-gray-900">Bookmarked</h3>
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {starredSpreadsheets.map((sheet) => (
                      <MemoizedSpreadsheetCard 
                        key={sheet.id} 
                        sheet={sheet} 
                        onUpdate={handleUpdateSpreadsheet}
                      />
                    ))}
                    {starredSpreadsheets.length === 0 && (
                      <p className="text-gray-500 col-span-full">No bookmarked spreadsheets yet</p>
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
      </DndContext>
    )
  }

  return (
    <SidebarProvider>
      <DndContext onDragEnd={handleDragEnd}>
        <DashboardLayout>
          <div className="flex flex-col gap-8">
            <header className="sticky top-0 z-10 bg-background">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
                <h2 
                  className="text-3xl font-bold text-gray-900"
                  style={{ fontVariationSettings: "'wght' 700" }}
                >
                  All Spreadsheets
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
            </header>
            {renderContent()}
          </div>
        </DashboardLayout>
      </DndContext>
    </SidebarProvider>
  )
}
