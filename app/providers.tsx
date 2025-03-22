"use client"

import { SpreadsheetProvider } from "@/context/spreadsheet-context"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
      <SpreadsheetProvider>{children}</SpreadsheetProvider>
    </ThemeProvider>
  )
}

