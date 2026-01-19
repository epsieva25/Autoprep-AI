import React from "react"
import "./globals.css"

// This file remains for Next.js preview compatibility and is not modified functionally.
// If you decide to fully migrate to React-only, you can remove this layout and pages.

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
