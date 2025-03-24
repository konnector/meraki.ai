"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, Search, FileSpreadsheet, Star, Clock } from "lucide-react"
import DashboardLayout from "@/components/Dashboard/dashboard-layout"
import { getUserSpreadsheets, toggleSpreadsheetStar, SpreadsheetData } from "@/lib/supabase/client"
import { useUser } from "@clerk/nextjs"
import { formatDistanceToNow } from "date-fns"

type SpreadsheetWithFormatted = SpreadsheetData & {
  formattedDate: string;
}

function SpreadsheetCard({ 
  spreadsheet, 
  onToggleStar 
}: { 
  spreadsheet: SpreadsheetWithFormatted
  onToggleStar: (id: string) => void 
}) {
  return (
    <Card className="relative group">
      <CardContent className="pt-6">
        <button
          onClick={(e) => {
            e.preventDefault()
            onToggleStar(spreadsheet.id)
          }}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-yellow-400"
        >
          <Star className={spreadsheet.is_starred ? "fill-yellow-400 text-yellow-400" : ""} />
        </button>
        <Link href={`/spreadsheet/${spreadsheet.id}`} className="block">
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="h-6 w-6 text-blue-500" />
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 truncate">
              {spreadsheet.title}
            </h3>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {spreadsheet.formattedDate}
          </p>
        </Link>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState("")
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetWithFormatted[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSpreadsheets() {
      if (!user) return
      try {
        const data = await getUserSpreadsheets(user.id)
        const formatted = data.map(sheet => ({
          ...sheet,
          formattedDate: formatDistanceToNow(new Date(sheet.updated_at), { addSuffix: true })
        }))
        setSpreadsheets(formatted)
      } catch (error) {
        console.error('Error loading spreadsheets:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSpreadsheets()
  }, [user])

  const handleCreateSpreadsheet = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      console.log('Creating spreadsheet for user:', user.id)
      const response = await fetch('/api/spreadsheets', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)
      const contentType = response.headers.get('content-type')
      console.log('Response content-type:', contentType)
      
      let data
      try {
        const text = await response.text()
        console.log('Raw response:', text)
        data = JSON.parse(text)
      } catch (e) {
        console.error('Failed to parse response:', e)
        throw new Error('Invalid server response')
      }
      
      if (!response.ok) {
        console.error('Server response:', data)
        throw new Error(data?.error || 'Failed to create spreadsheet')
      }
      
      if (!data?.id) {
        console.error('Invalid data received:', data)
        throw new Error('Invalid spreadsheet data returned')
      }

      console.log('Successfully created spreadsheet:', data)
      
      setTimeout(() => {
        router.push(`/spreadsheet/${data.id}`)
      }, 500)
    } catch (error) {
      console.error('Error creating spreadsheet:', error)
      alert(error instanceof Error ? error.message : 'Failed to create spreadsheet')
    }
  }

  const handleToggleStar = async (id: string) => {
    try {
      const spreadsheet = spreadsheets.find(s => s.id === id)
      if (!spreadsheet) return

      await toggleSpreadsheetStar(id, !spreadsheet.is_starred)
      
      setSpreadsheets(prev => prev.map(sheet => 
        sheet.id === id ? { ...sheet, is_starred: !sheet.is_starred } : sheet
      ))
    } catch (error) {
      console.error('Error toggling star:', error)
    }
  }

  const filteredSpreadsheets = spreadsheets.filter((sheet) =>
    sheet.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const starredSpreadsheets = filteredSpreadsheets.filter((sheet) => sheet.is_starred)
  const recentSpreadsheets = filteredSpreadsheets

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
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
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
        </div>

        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
          </TabsList>

          <TabsContent value="starred" className="space-y-6">
            {starredSpreadsheets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No starred spreadsheets</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {starredSpreadsheets.map((sheet) => (
                  <SpreadsheetCard key={sheet.id} spreadsheet={sheet} onToggleStar={handleToggleStar} />
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
                  <SpreadsheetCard key={sheet.id} spreadsheet={sheet} onToggleStar={handleToggleStar} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

