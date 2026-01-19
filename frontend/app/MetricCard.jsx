// Simple metric card with green-on-dark styling and optional danger state.

export default function MetricCard({ value, label, danger = false }) {
  return (
    <div
      className={[
        "rounded-lg border p-5 transition",
        "bg-emerald-950/40 border-emerald-700/40",
        "hover:border-emerald-600/60 focus-within:ring-2 focus-within:ring-emerald-500/40",
      ].join(" ")}
      role="group"
      aria-label={`${label} metric`}
      title={label}
    >
      <div className={["text-3xl font-semibold leading-none", danger ? "text-red-400" : "text-emerald-200"].join(" ")}>
        {value}
      </div>
      <div className="text-xs mt-2 text-emerald-300/80">{label}</div>
    </div>
  )
}
