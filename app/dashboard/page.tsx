"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, Search, FileSpreadsheet, Star, Clock } from "lucide-react"
import DashboardLayout from "@/components/Dashboard/dashboard-layout"
import { useSpreadsheetApi } from "@/lib/supabase/secure-api"
import { formatDistanceToNow } from "date-fns"
import { useSession } from "@clerk/nextjs"
import type { Spreadsheet } from "@/lib/supabase/types"

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const spreadsheetApi = useSpreadsheetApi()
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
        const result = await spreadsheetApi.getSpreadsheets()
        if (result.error) {
          throw new Error(result.error.message)
        }
        setSpreadsheets(result.data || [])
        dataFetchedRef.current = true
      } catch (err) {
        console.error("Failed to load spreadsheets:", err)
        setError(err instanceof Error ? err.message : "Failed to load spreadsheets")
      } finally {
        setIsLoading(false)
      }
    }

    loadSpreadsheets()
  }, [isLoaded, isSignedIn, spreadsheetApi])

  const toggleStar = useCallback(async (id: string) => {
    const spreadsheet = spreadsheets.find(s => s.id === id);
    if (!spreadsheet) return;

    const isCurrentlyStarred = spreadsheet.data?.isStarred || false;
    
    try {
      const result = await spreadsheetApi.updateSpreadsheet(id, {
        ...spreadsheet.data,
        isStarred: !isCurrentlyStarred
      });

      if (result.error) {
        throw new Error(result.error.message)
      }

      setSpreadsheets(prev => prev.map(s => 
        s.id === id 
          ? { 
              ...s, 
              data: { 
                ...s.data, 
                isStarred: !isCurrentlyStarred 
              } 
            }
          : s
      ));
    } catch (err) {
      console.error("Failed to update star status:", err);
      setError(err instanceof Error ? err.message : "Failed to update star status")
    }
  }, [spreadsheets, spreadsheetApi]);

  // Create a new spreadsheet and redirect to it
  const handleCreateSpreadsheet = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await spreadsheetApi.createSpreadsheet("Untitled Spreadsheet")
      if (result.error) {
        throw new Error(result.error.message)
      }
      if (result.data?.id) {
        router.push(`/spreadsheet/${result.data.id}`)
      }
    } catch (err) {
      console.error("Failed to create new spreadsheet:", err)
      setError(err instanceof Error ? err.message : "Failed to create spreadsheet")
    } finally {
      setIsLoading(false)
    }
  }, [spreadsheetApi, router])

  // Filter spreadsheets based on search query
  const filteredSpreadsheets = useMemo(() => {
    return spreadsheets.filter(spreadsheet =>
      spreadsheet.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [spreadsheets, searchQuery])

  // Separate starred and unstarred spreadsheets
  const { starredSpreadsheets, unstarredSpreadsheets } = useMemo(() => {
    return {
      starredSpreadsheets: filteredSpreadsheets.filter(s => s.data?.isStarred),
      unstarredSpreadsheets: filteredSpreadsheets.filter(s => !s.data?.isStarred)
    }
  }, [filteredSpreadsheets])

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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search spreadsheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={handleCreateSpreadsheet} disabled={isLoading}>
            Create Spreadsheet
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {starredSpreadsheets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Starred</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {starredSpreadsheets.map((spreadsheet) => (
                    <SpreadsheetCard
                      key={spreadsheet.id}
                      spreadsheet={spreadsheet}
                      onStar={() => toggleStar(spreadsheet.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold mb-4">All Spreadsheets</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unstarredSpreadsheets.map((spreadsheet) => (
                  <SpreadsheetCard
                    key={spreadsheet.id}
                    spreadsheet={spreadsheet}
                    onStar={() => toggleStar(spreadsheet.id)}
                  />
                ))}
              </div>
            </div>

            {filteredSpreadsheets.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No spreadsheets found
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

const SpreadsheetCard = React.memo(function SpreadsheetCard({
  spreadsheet,
  onStar,
}: {
  spreadsheet: Spreadsheet
  onStar: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Link href={`/spreadsheet/${spreadsheet.id}`} className="flex-1">
            <h3 className="font-medium text-gray-900 hover:underline truncate">{spreadsheet.title}</h3>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStar}>
            <Star className={`h-4 w-4 ${spreadsheet.data?.isStarred ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
          </Button>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 text-sm text-gray-500 flex items-center">
        <Clock className="h-3.5 w-3.5 mr-1.5" />
        {formatDistanceToNow(new Date(spreadsheet.updated_at), { addSuffix: true })}
      </CardFooter>
    </Card>
  )
})

