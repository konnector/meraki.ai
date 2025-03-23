"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { SpreadsheetProvider } from "@/context/spreadsheet-context"
import { ClerkProvider } from "@clerk/nextjs"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
        <SpreadsheetProvider>
          {children}
        </SpreadsheetProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}

