"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import SpreadsheetGrid from "@/components/SpreadSheet/spreadsheet-grid"
import AIAssistantPanel from "@/components/SpreadSheet/ai-assistant-panel"
import Toolbar from "@/components/SpreadSheet/toolbar"
import { FormulaBar } from "@/components/SpreadSheet/formula-bar"
import DashboardLayout from "@/components/Dashboard/dashboard-layout"
import KeyboardShortcutsHelp from "@/components/SpreadSheet/keyboard-shortcuts-help"
import { ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSpreadsheet } from "@/context/spreadsheet-context"


export default function SpreadsheetPage({ params }: { params: { id: string } }) {
  const { title, setTitle } = useSpreadsheet()
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const handleTitleClick = () => {
    setIsEditingTitle(true)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    // Here you would typically save the title to your backend
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditingTitle(false)
      // Here you would typically save the title to your backend
    } else if (e.key === "Escape") {
      setIsEditingTitle(false)
    }
  }

  return (
    <DashboardLayout showFullHeader={false}>
      <div className="flex flex-col h-screen bg-white">
        <header className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>

              {isEditingTitle ? (
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="h-8 text-xl font-semibold text-gray-900 w-auto min-w-[200px]"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                  onClick={handleTitleClick}
                >
                  {title}
                </h1>
              )}

              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Saved</span>
            </div>
            <div className="flex items-center gap-2">
              <KeyboardShortcutsHelp />
            </div>
          </div>
          <Toolbar />
          <FormulaBar />
        </header>

        <main className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <SpreadsheetGrid />
          </div>
          <AIAssistantPanel />
        </main>
      </div>
    </DashboardLayout>
  )
}

