"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutGrid, FileSpreadsheet, Settings, Menu, X, ChevronDown, Bell } from "lucide-react"
import { UserButton, useUser } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardLayoutProps {
  children: React.ReactNode
  showFullHeader?: boolean
}

export default function DashboardLayout({ children, showFullHeader = true }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useUser();

  useEffect(() => {
    // Automatically close sidebar when on spreadsheet pages
    if (pathname?.startsWith("/spreadsheet")) {
      setSidebarOpen(false)
    }
  }, [pathname])

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${pathname?.startsWith("/spreadsheet") ? "lg:hidden" : ""}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">Meraki.ai</h1>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Link href="/dashboard">
              <Button variant={isActive("/dashboard") ? "secondary" : "ghost"} className="w-full justify-start">
                <LayoutGrid className="h-5 w-5 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/spreadsheet/1">
              <Button variant={isActive("/spreadsheet") ? "secondary" : "ghost"} className="w-full justify-start">
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Spreadsheets
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant={isActive("/settings") ? "secondary" : "ghost"} className="w-full justify-start">
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </Button>
            </Link>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between w-full p-2">
              <div className="flex items-center gap-2">
                <UserButton />
                <span className="text-sm font-medium">{user?.fullName || user?.username}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showFullHeader && (
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

