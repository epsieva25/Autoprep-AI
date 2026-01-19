export default function Loading() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-2/3 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
        <div className="h-24 w-full bg-muted rounded" />
      </div>
    </main>
  )
}
