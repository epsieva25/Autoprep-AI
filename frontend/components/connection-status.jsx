"use client"
import useSWR from "swr"

const fetcher = (url) =>
  fetch(url)
    .then((r) => r.json())
    .catch(() => null)

export default function ConnectionStatus() {
  const { data, error, isLoading } = useSWR("/api/health", fetcher, { refreshInterval: 15000 })

  const state = (() => {
    if (isLoading) return { text: "Checking…", dot: "bg-gray-500" }
    if (error || !data) return { text: "API error", dot: "bg-red-600" }
    if (data.status !== "ok") return { text: data.message || "API error", dot: "bg-red-600" }
    return { text: "Connected", dot: "bg-emerald-600" }
  })()

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/80">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${state.dot}`} aria-hidden="true" />
      <span className="font-medium">{state.text}</span>
    </div>
  )
}
