"use client"

import { useEffect } from "react"

export default function Error({ error, reset }) {
  useEffect(() => {
    // Helpful debug log to see the real error in v0 logs
    // console.log("[v0] route error:", error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground">
        <main className="mx-auto max-w-xl p-6">
          <h1 className="text-balance text-2xl font-semibold mb-3">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6">
            An error occurred while rendering this page. Use the button below to try again.
          </p>
          <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto mb-6" aria-live="polite">
            {String(error?.message || error)}
          </pre>
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-foreground text-background text-sm hover:opacity-90"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
