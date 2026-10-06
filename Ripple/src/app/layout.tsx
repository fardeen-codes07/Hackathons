import type { Metadata } from "next"
import { Inter, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" })

export const metadata: Metadata = {
  title: "RIPPLE — Decision Intelligence Platform",
  description: "See the consequences before you decide. A deterministic decision intelligence prototype for campus operations.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  )
}
