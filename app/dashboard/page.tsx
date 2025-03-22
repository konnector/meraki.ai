"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, Search, FileSpreadsheet, Star, Clock } from "lucide-react"
import DashboardLayout from "@/components/Dashboard/dashboard-layout"

type Spreadsheet = {
  id: string
  name: string
  lastModified: string
  starred: boolean
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Mock data for spreadsheets
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([
    { id: "1", name: "Budget 2025", lastModified: "2 hours ago", starred: true },
    { id: "2", name: "Sales Report Q1", lastModified: "Yesterday", starred: true },
    { id: "3", name: "Project Timeline", lastModified: "3 days ago", starred: false },
    { id: "4", name: "Expense Tracker", lastModified: "1 week ago", starred: false },
    { id: "5", name: "Marketing Campaign", lastModified: "2 weeks ago", starred: false },
    { id: "6", name: "Team Performance", lastModified: "1 month ago", starred: false },
  ])

  const toggleStar = (id: string) => {
    setSpreadsheets((prev) => prev.map((sheet) => (sheet.id === id ? { ...sheet, starred: !sheet.starred } : sheet)))
  }

  const filteredSpreadsheets = spreadsheets.filter((sheet) =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const starredSpreadsheets = filteredSpreadsheets.filter((sheet) => sheet.starred)
  const recentSpreadsheets = [...filteredSpreadsheets].sort((a, b) => {
    // Simple sort by lastModified (in a real app, use actual dates)
    const timeUnits = ["hours", "Yesterday", "days", "week", "weeks", "month"]
    const aIndex = timeUnits.findIndex((unit) => a.lastModified.includes(unit))
    const bIndex = timeUnits.findIndex((unit) => b.lastModified.includes(unit))
    return aIndex - bIndex
  })

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
            <Link href="/spreadsheet/new">
              <Button className="bg-gray-900 text-white hover:bg-gray-800">
                <PlusIcon className="h-4 w-4 mr-2" />
                New
              </Button>
            </Link>
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
                  <SpreadsheetCard key={sheet.id} spreadsheet={sheet} onToggleStar={toggleStar} />
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
                  <SpreadsheetCard key={sheet.id} spreadsheet={sheet} onToggleStar={toggleStar} />
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
                  <SpreadsheetCard key={sheet.id} spreadsheet={sheet} onToggleStar={toggleStar} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

function SpreadsheetCard({
  spreadsheet,
  onToggleStar,
}: {
  spreadsheet: Spreadsheet
  onToggleStar: (id: string) => void
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
            <h3 className="font-medium text-gray-900 hover:underline truncate">{spreadsheet.name}</h3>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleStar(spreadsheet.id)}>
            <Star className={`h-4 w-4 ${spreadsheet.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
          </Button>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 text-sm text-gray-500 flex items-center">
        <Clock className="h-3.5 w-3.5 mr-1.5" />
        {spreadsheet.lastModified}
      </CardFooter>
    </Card>
  )
}

