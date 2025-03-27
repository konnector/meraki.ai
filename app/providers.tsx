"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { FolderProvider } from "@/context/folder-context"
import { TagProvider } from "@/context/tag-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ThemeProvider attribute="class" defaultTheme="light">
        <FolderProvider>
          <TagProvider>
            {children}
            <Toaster />
          </TagProvider>
        </FolderProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}

