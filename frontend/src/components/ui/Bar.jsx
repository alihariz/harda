// Horizontal data bar. Width is ALWAYS derived from value/max (honest, never
// hardcoded). Neutral blue fill = magnitude; optional `dot` colour = identity.
export default function Bar({ label, value, max, dot }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 mb-3 last:mb-0">
      <div className="w-32 shrink-0 text-xs font-semibold text-slate-700 flex items-center">
        {dot && <span className="w-2.5 h-2.5 rounded-[3px] mr-2 shrink-0" style={{ background: dot }} aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-600 origin-left animate-grow-x" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-9 text-right text-xs font-extrabold text-slate-900">{value}</div>
    </div>
  )
}
