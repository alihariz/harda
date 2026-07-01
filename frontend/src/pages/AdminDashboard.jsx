// UC008–UC012 – Admin Dashboard (analytics summary) — redesigned.
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import Bar from '../components/ui/Bar'

// Taxonomy dot colours — match the hazard-map legend.
const TYPE_DOT = {
  pothole: '#F97316',
  faded_lane_marking: '#F59E0B',
  uneven_surface: '#7C3AED',
}

// The analytics API may return top_states as an array of {state,count} or an
// object {state: count}; normalise both to a sorted array.
function normalizeStates(top) {
  if (!top) return []
  const arr = Array.isArray(top)
    ? top.map((s) => ({ state: s.state ?? s.name, count: s.count ?? s.total ?? 0 }))
    : Object.entries(top).map(([state, count]) => ({ state, count }))
  return arr.filter((s) => s.state).sort((a, b) => b.count - a.count)
}

export default function AdminDashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    api.get('/admin/analytics/summary')
      .then(({ data }) => setStats(data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Intentional one-time fetch on mount; load() also drives the Refresh button.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const byStatus = stats?.by_status ?? {}
  const byType = stats?.by_hazard_type ?? {}
  const typeEntries = Object.entries(byType)
  const typeMax = Math.max(1, ...typeEntries.map(([, c]) => c))
  const states = normalizeStates(stats?.top_states).slice(0, 5)
  const stateMax = Math.max(1, ...states.map((s) => s.count))
  const avgDays = stats?.avg_resolution_days

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('admin.dashboardTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">{t('admin.dashboardLead')}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={load}>{t('admin.refresh')}</Button>
          <Button as={Link} to="/admin/reports">{t('admin.viewQueue')}</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 text-sm">
          <p>{t('admin.analyticsError')}</p>
          <button onClick={load} className="mt-3 text-orange-500 hover:underline cursor-pointer">{t('common.retry')}</button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 animate-rise list-none">
            <li><StatCard accent="orange" icon="∑" label={t('admin.totalReports')} value={stats?.total_reports} /></li>
            <li><StatCard accent="amber" icon="⏳" label={t('admin.pendingReview')} value={byStatus.submitted ?? 0} /></li>
            <li><StatCard accent="blue" icon="✓" label={t('admin.verified')} value={byStatus.verified ?? 0} /></li>
            <li><StatCard accent="green" icon="★" label={t('admin.resolved')} value={byStatus.resolved ?? 0} /></li>
          </ul>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
            {/* Breakdowns */}
            <Card className="p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-4">{t('admin.byType')}</h2>
              {typeEntries.length ? typeEntries.map(([key, count]) => (
                <Bar key={key} label={t(`hazardType.${key}`)} value={count} max={typeMax} dot={TYPE_DOT[key]} />
              )) : <p className="text-slate-400 text-sm py-3">{t('common.noData')}</p>}

              {states.length > 0 && (
                <>
                  <h2 className="text-sm font-bold text-slate-900 mt-6 mb-4">{t('admin.topStates')}</h2>
                  {states.map((s) => <Bar key={s.state} label={s.state} value={s.count} max={stateMax} />)}
                </>
              )}
            </Card>

            {/* Attention column */}
            <div className="flex flex-col gap-4">
              {avgDays != null && (
                <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-card">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-card grid place-items-center text-xl text-blue-700" aria-hidden="true">⚡</div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900 leading-none">{avgDays} {t('admin.days')}</p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1.5">{t('admin.avgResolution')}</p>
                  </div>
                </div>
              )}

              <Card className="p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-4">{t('admin.needsAttention')}</h2>
                <div className="flex flex-col gap-2.5">
                  <Link to="/admin/reports?status=submitted"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 transition-all hover:border-orange-500 hover:shadow-lift hover:translate-x-1">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 grid place-items-center" aria-hidden="true">⚠</div>
                    <p className="text-[13px] font-bold text-slate-900">{t('admin.awaitingValidation')}</p>
                    <span className="ml-auto text-lg font-extrabold text-orange-700">{byStatus.submitted ?? 0}</span>
                  </Link>
                  <Link to="/admin/reports?status=in_progress"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 transition-all hover:border-blue-500 hover:shadow-lift hover:translate-x-1">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 grid place-items-center" aria-hidden="true">🚧</div>
                    <p className="text-[13px] font-bold text-slate-900">{t('admin.inProgress')}</p>
                    <span className="ml-auto text-lg font-extrabold text-blue-700">{byStatus.in_progress ?? 0}</span>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
