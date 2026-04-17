// UC008–UC012 – Admin Dashboard (analytics summary)
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

const TYPE_COLOURS = {
  pothole:            'bg-red-500',
  faded_lane_marking: 'bg-yellow-400',
  uneven_surface:     'bg-orange-500',
}

const TYPE_LABELS = {
  pothole:            'Pothole',
  faded_lane_marking: 'Faded Lane Marking',
  uneven_surface:     'Uneven Surface',
}

function StatCard({ label, value, colour, icon }) {
  return (
    <div className={`rounded-xl p-5 ${colour} flex items-start justify-between`}>
      <div>
        <p className="text-sm font-medium opacity-75">{label}</p>
        <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
      </div>
      <div className="opacity-20 text-4xl font-black select-none">{icon}</div>
    </div>
  )
}

function BarChart({ data, title, colourFn, labelFn }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>
    )
  }
  const max = Math.max(...Object.values(data))
  return (
    <div>
      <p className="text-base font-semibold text-gray-700 mb-4">{title}</p>
      <div className="space-y-3">
        {Object.entries(data).map(([key, count]) => {
          const pct = max > 0 ? (count / max) * 100 : 0
          const colour = colourFn ? colourFn(key) : 'bg-orange-400'
          const label = labelFn ? labelFn(key) : key.replace(/_/g, ' ')
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span className="capitalize">{label}</span>
                <span className="font-semibold text-gray-800">{count}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${colour}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const STATUS_COLOURS_BAR = {
  submitted:   'bg-gray-400',
  verified:    'bg-green-500',
  in_progress: 'bg-yellow-400',
  resolved:    'bg-blue-500',
  rejected:    'bg-red-400',
}

const STATUS_LABELS = {
  submitted:   'Submitted',
  verified:    'Verified',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  rejected:    'Rejected',
}

export default function AdminDashboard() {
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

  useEffect(() => { load() }, [load])

  const byStatus = stats?.by_status ?? {}
  const byType = stats?.by_hazard_type ?? {}

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Overview of hazard reports and system activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="text-sm border border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            ↺ Refresh
          </button>
          <Link
            to="/admin/reports"
            className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            View Report Queue →
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 text-sm">
          <p>Failed to load analytics.</p>
          <button onClick={load} className="mt-3 text-orange-500 hover:underline">Retry</button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Total Reports"
              value={stats?.total_reports}
              colour="bg-gray-800 text-white"
              icon="∑"
            />
            <StatCard
              label="Pending Review"
              value={byStatus.submitted ?? 0}
              colour="bg-yellow-50 text-yellow-900"
              icon="⏳"
            />
            <StatCard
              label="Verified"
              value={byStatus.verified ?? 0}
              colour="bg-green-50 text-green-900"
              icon="✓"
            />
            <StatCard
              label="Resolved"
              value={byStatus.resolved ?? 0}
              colour="bg-blue-50 text-blue-900"
              icon="★"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <BarChart
                title="Reports by Hazard Type"
                data={byType}
                colourFn={(key) => TYPE_COLOURS[key] ?? 'bg-gray-400'}
                labelFn={(key) => TYPE_LABELS[key] ?? key.replace(/_/g, ' ')}
              />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <BarChart
                title="Reports by Status"
                data={byStatus}
                colourFn={(key) => STATUS_COLOURS_BAR[key] ?? 'bg-gray-400'}
                labelFn={(key) => STATUS_LABELS[key] ?? key.replace(/_/g, ' ')}
              />
            </div>
          </div>

          {/* Quick-action strip */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/admin/reports?status=submitted"
              className="bg-white border border-yellow-200 hover:border-yellow-400 rounded-xl px-5 py-4 flex items-center justify-between transition-colors group"
            >
              <div>
                <p className="text-sm text-gray-500">Awaiting validation</p>
                <p className="text-xl font-bold text-yellow-700 mt-0.5">{byStatus.submitted ?? 0}</p>
              </div>
              <span className="text-yellow-300 group-hover:text-yellow-400 text-2xl">→</span>
            </Link>
            <Link
              to="/admin/reports?status=in_progress"
              className="bg-white border border-blue-100 hover:border-blue-300 rounded-xl px-5 py-4 flex items-center justify-between transition-colors group"
            >
              <div>
                <p className="text-sm text-gray-500">In progress</p>
                <p className="text-xl font-bold text-blue-700 mt-0.5">{byStatus.in_progress ?? 0}</p>
              </div>
              <span className="text-blue-200 group-hover:text-blue-400 text-2xl">→</span>
            </Link>
            <Link
              to="/admin/reports?status=rejected"
              className="bg-white border border-red-100 hover:border-red-300 rounded-xl px-5 py-4 flex items-center justify-between transition-colors group"
            >
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-xl font-bold text-red-700 mt-0.5">{byStatus.rejected ?? 0}</p>
              </div>
              <span className="text-red-200 group-hover:text-red-400 text-2xl">→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
