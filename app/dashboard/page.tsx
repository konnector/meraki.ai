"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, Search, FileSpreadsheet, Star, Clock } from "lucide-react"
import DashboardLayout from "@/components/Dashboard/dashboard-layout"
import { useSpreadsheet } from "@/hooks/useSpreadsheet"
import { formatDistanceToNow } from "date-fns"
import { useSession } from "@clerk/nextjs"

type Spreadsheet = {
  id: string
  title: string
  created_at: string
  updated_at: string
  starred?: boolean // We'll manage this on the client side for now
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [starred, setStarred] = useState<Record<string, boolean>>({}) // Track starred items separately
  const [isLoading, setIsLoading] = useState(true)
  const { getSpreadsheets, createSpreadsheet, loading, error } = useSpreadsheet()
  const router = useRouter()
  const dataFetchedRef = useRef(false)
  const { isLoaded, isSignedIn, session } = useSession()

  // Load spreadsheets from Supabase once Clerk session is loaded
  useEffect(() => {
    // Wait for Clerk to initialize and confirm user is signed in
    if (!isLoaded) return;
    
    // If not signed in, don't try to load spreadsheets
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }
    
    // Prevent multiple data fetch attempts
    if (dataFetchedRef.current) return;
    
    async function loadSpreadsheets() {
      try {
        setIsLoading(true)
        const data = await getSpreadsheets()
        setSpreadsheets(Array.isArray(data) ? data : [])
        dataFetchedRef.current = true
      } catch (err) {
        console.error("Failed to load spreadsheets:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSpreadsheets()
  }, [isLoaded, isSignedIn, getSpreadsheets]) // Include Clerk loading state dependencies

  const toggleStar = useCallback((id: string) => {
    setStarred(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // Create a new spreadsheet and redirect to it
  const handleCreateSpreadsheet = useCallback(async () => {
    try {
      const newSpreadsheet = await createSpreadsheet("Untitled Spreadsheet")
      if (newSpreadsheet?.id) {
        router.push(`/spreadsheet/${newSpreadsheet.id}`)
      }
    } catch (err) {
      console.error("Failed to create new spreadsheet:", err)
    }
  }, [createSpreadsheet, router])

  const filteredSpreadsheets = spreadsheets.filter((sheet) =>
    sheet.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const starredSpreadsheets = filteredSpreadsheets.filter((sheet) => starred[sheet.id])
  const recentSpreadsheets = [...filteredSpreadsheets].sort((a, b) => {
    // Sort by updated_at date, newest first
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  const formatDate = useCallback((dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (e) {
      return "Unknown date"
    }
  }, [])

  // Show loading while Clerk is initializing
  if (!isLoaded || isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-gray-500">Loading spreadsheets...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Handle authentication state
  if (!isSignedIn) {
    return (
      <DashboardLayout>
        <div className="p-6 flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-red-500">Please sign in to view your spreadsheets</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/sign-in')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6 flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-red-500">Error: {error}</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Spreadsheets</h1>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search spreadsheets..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              className="bg-gray-900 text-white hover:bg-gray-800"
              onClick={handleCreateSpreadsheet}
              disabled={loading}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {filteredSpreadsheets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No spreadsheets found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSpreadsheets.map((sheet) => (
                  <SpreadsheetCard 
                    key={sheet.id} 
                    spreadsheet={sheet} 
                    isStarred={!!starred[sheet.id]}
                    onToggleStar={toggleStar} 
                    formattedDate={formatDate(sheet.updated_at)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="starred" className="space-y-6">
            {starredSpreadsheets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No starred spreadsheets</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {starredSpreadsheets.map((sheet) => (
                  <SpreadsheetCard 
                    key={sheet.id} 
                    spreadsheet={sheet} 
                    isStarred={true}
                    onToggleStar={toggleStar} 
                    formattedDate={formatDate(sheet.updated_at)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            {recentSpreadsheets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No recent spreadsheets</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentSpreadsheets.map((sheet) => (
                  <SpreadsheetCard 
                    key={sheet.id} 
                    spreadsheet={sheet} 
                    isStarred={!!starred[sheet.id]}
                    onToggleStar={toggleStar}
                    formattedDate={formatDate(sheet.updated_at)} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

const SpreadsheetCard = React.memo(function SpreadsheetCard({
  spreadsheet,
  isStarred,
  onToggleStar,
  formattedDate,
}: {
  spreadsheet: Spreadsheet
  isStarred: boolean
  onToggleStar: (id: string) => void
  formattedDate: string
}) {
  return (
    <Card className="overflow-hidden">
      <Link href={`/spreadsheet/${spreadsheet.id}`}>
        <div className="h-36 bg-gray-100 flex items-center justify-center border-b border-gray-200">
          <FileSpreadsheet className="h-12 w-12 text-gray-400" />
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <Link href={`/spreadsheet/${spreadsheet.id}`} className="flex-1">
            <h3 className="font-medium text-gray-900 hover:underline truncate">{spreadsheet.title}</h3>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleStar(spreadsheet.id)}>
            <Star className={`h-4 w-4 ${isStarred ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
          </Button>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 text-sm text-gray-500 flex items-center">
        <Clock className="h-3.5 w-3.5 mr-1.5" />
        {formattedDate}
      </CardFooter>
    </Card>
  )
})

