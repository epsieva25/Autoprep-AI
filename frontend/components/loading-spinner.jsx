import { Brain } from "lucide-react"

export default function LoadingSpinner({ message = "Loading...", size = "md" }) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Brain className={`${sizeClasses[size]} text-primary animate-pulse mb-4`} />
      <p className="text-muted-foreground text-center">{message}</p>
    </div>
  )
}
