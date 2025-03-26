"use client"

import { FolderOpen, FolderClosed, MoreHorizontal, Trash2, Loader2 } from "lucide-react"
import { useFolder } from "@/context/folder-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function FoldersSection() {
  const { 
    folders, 
    isLoading, 
    activeFolder, 
    setActiveFolder,
    deleteFolder 
  } = useFolder()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-1">
      {/* All Spreadsheets */}
      <button 
        onClick={() => setActiveFolder(null)}
        className={cn(
          "inline-flex items-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 w-full justify-between",
          activeFolder === null && "bg-secondary text-secondary-foreground"
        )}
      >
        <div className="flex items-center text-xs">
          <FolderOpen className="h-4 w-4 mr-2" />
          All Spreadsheets
        </div>
        <small className="font-medium text-muted-foreground text-xs">
          ({folders.reduce((sum, folder) => sum + (folder.spreadsheet_count || 0), 0)})
        </small>
      </button>

      {/* User Created Folders */}
      {folders.map((folder) => (
        <li key={folder.id} className="list-none">
          <div className="group relative flex items-center">
            <button 
              onClick={() => setActiveFolder(folder.id)}
              className={cn(
                "inline-flex items-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 w-full justify-between",
                activeFolder === folder.id && "bg-secondary text-secondary-foreground"
              )}
            >
              <div className="flex items-center text-xs">
                <FolderClosed className="h-4 w-4 mr-2" />
                {folder.name}
              </div>
              <small className="font-medium text-muted-foreground text-xs">
                ({folder.spreadsheet_count || 0})
              </small>
            </button>

            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center justify-center">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => deleteFolder(folder.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </li>
      ))}
    </div>
  )
} 