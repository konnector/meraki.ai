"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LayoutGrid, FileSpreadsheet, Settings, Menu, X, ChevronDown, Bell, Search } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  showFullHeader?: boolean
}

export default function DashboardLayout({ children, showFullHeader = true }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Automatically close sidebar when on spreadsheet pages
    if (pathname?.startsWith("/spreadsheet")) {
      setSidebarOpen(false)
    }
  }, [pathname])

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        {showFullHeader && (
          <header className="flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </header>
        )}
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  )
}

