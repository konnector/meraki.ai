import type React from "react"
import { Providers } from "@/app/providers"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Providers>{children}</Providers>
}

