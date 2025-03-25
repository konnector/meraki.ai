"use client"

import * as React from "react"
import {
  Settings,
  LogOut,
  User,
  Bell,
  CreditCard,
  LayoutDashboard,
  Star,
  Clock,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex flex-col items-center justify-center gap-2 p-2">
          <h4 className="scroll-m-20 tracking-tight text-2xl font-black px-2 text-center">
            Meraki AI
          </h4>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-2 text-xs font-semibold tracking-tight text-muted-foreground">
            PLATFORM
          </h2>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/dashboard"}
              >
                <a href="/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  <span>Dashboard</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/settings"}
              >
                <a href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Settings</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <SidebarSeparator />

        <div className="px-3 py-2">
          <h2 className="mb-2 px-2 text-xs font-semibold tracking-tight text-muted-foreground">
            COLLECTIONS
          </h2>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/starred"}
              >
                <a href="/starred">
                  <Star className="h-4 w-4 mr-2" />
                  <span>Starred</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/recent"}
              >
                <a href="/recent">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Recent</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="w-62 flex items-center gap-2 rounded-[12px] border bg-card text-card-foreground shadow-sm mb-6 mx-2 p-3">
          <span className="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
            <img 
              className="aspect-square h-full w-full" 
              src={user?.imageUrl} 
              alt={user?.fullName || 'User avatar'}
            />
          </span>
          <div className="flex flex-col flex-1 min-w-0">
            <small className="text-sm font-medium leading-none truncate">
              <b>{user?.fullName}</b>
            </small>
            <small className="font-medium text-muted-foreground text-xs truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </small>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="active:scale-110 transition-all duration-100">
                <Settings className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings/billing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings/notifications')}>
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => signOut(() => router.push('/'))}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
