import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Outfit, JetBrains_Mono } from "next/font/google"

import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

export const metadata: Metadata = {
  title: "ProctorAI - Campus Placement Assessment Platform",
  description:
    "AI-powered technical interviews, coding assessments, and online proctoring for campus placements. Secure, scalable, and cheat-proof.",
}

export const viewport: Viewport = {
  themeColor: "#0c4a6e",
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
