// Headline metric card: coloured accent bar, icon chip, value, optional trend.
// accent: orange | amber | blue | green   ·   trendTone: good | warn
const ACCENT = {
  orange: { bar: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700' },
  amber:  { bar: 'bg-amber-500',  chip: 'bg-amber-50 text-amber-700' },
  blue:   { bar: 'bg-blue-600',   chip: 'bg-blue-50 text-blue-700' },
  green:  { bar: 'bg-green-600',  chip: 'bg-green-50 text-green-700' },
}

export default function StatCard({ accent = 'orange', icon, label, value, trend, trendTone = 'good' }) {
  const a = ACCENT[accent] ?? ACCENT.orange
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-card p-4 transition-all duration-200 hover:shadow-lift hover:-translate-y-1">
      <span className={`absolute top-0 left-0 h-1 w-full ${a.bar}`} aria-hidden="true" />
      <div className={`w-9 h-9 rounded-xl grid place-items-center text-lg mb-3 ${a.chip}`} aria-hidden="true">{icon}</div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight text-slate-900 mt-0.5 leading-none">{value ?? '—'}</p>
      {trend && (
        <p className={`text-[11px] font-bold mt-2 ${trendTone === 'warn' ? 'text-amber-700' : 'text-green-700'}`}>
          <span aria-hidden="true">▲</span>
          <span className="sr-only">Increased by </span> {trend}
        </p>
      )}
    </div>
  )
}
