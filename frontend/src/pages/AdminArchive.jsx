// UC012 — Explicitly archived hazard reports (resolved + rejected)
// Audit-ready view with before+after photos. Archive is an explicit admin
// action — resolved/rejected reports don't appear here until archived.
// Backend: GET /admin/archive?state=&team_id=&status=   (admin_required)
//          GET /admin/archive/export.csv                 (admin_required, same filters)
//          POST /admin/reports/:id/unarchive             (admin_required)
import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'
import ReportDetailModal from './ReportDetailModal'

const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
  'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]

const STATUS_BADGE = {
  resolved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
}

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace('/api/v1', '')

function imgUrl(filePath) {
  if (!filePath) return null
  return `${API_ORIGIN}/${filePath}`
}

function SeverityPips({ score }) {
  const { t } = useI18n()
  if (!score) return <span className="text-gray-400 text-xs">—</span>
  const colour = score >= 4 ? 'bg-red-500' : score >= 3 ? 'bg-yellow-400' : 'bg-green-400'
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`inline-block w-2 h-2 rounded-full ${i <= score ? colour : 'bg-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-500 ml-1">{t(`severity.${score}`)}</span>
    </span>
  )
}

function ArchiveCard({ report, onClick, onUnarchive, unarchiving, t, fmtDate }) {
  const before = report.before_image
  const after = report.after_image
  const loc = report.location
  const hazardKey = report.hazard_type?.type_name ?? null
  const hazardName = hazardKey ? t(`hazardType.${hazardKey}`) : '—'
  const teamName = report.assigned_team?.team_name ?? null
  const statusName = report.status?.status_name ?? 'resolved'
  const badgeCls = STATUS_BADGE[statusName] ?? STATUS_BADGE.resolved

  return (
    <div className="w-full text-left bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-card hover:shadow-lift hover:-translate-y-1 hover:border-orange-300 transition-all group">
      {/* Photos — side by side, clicking opens detail */}
      <button className="w-full" onClick={onClick}>
        <div className="grid grid-cols-2 divide-x divide-gray-100 bg-gray-50">
          <div className="relative">
            <span className="absolute top-2 left-2 z-10 text-xs font-medium bg-black/50 text-white px-2 py-0.5 rounded-full">
              {t('admin.before')}
            </span>
            {before ? (
              <img
                src={imgUrl(before.file_path)}
                alt={t('admin.before')}
                className="w-full aspect-video object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-gray-300 text-xs">{t('admin.noPhoto')}</div>
            )}
          </div>
          <div className="relative">
            <span className="absolute top-2 left-2 z-10 text-xs font-medium bg-emerald-600/80 text-white px-2 py-0.5 rounded-full">
              {t('admin.after')}
            </span>
            {after ? (
              <img
                src={imgUrl(after.file_path)}
                alt={t('admin.after')}
                className="w-full aspect-video object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-gray-300 text-xs">{t('admin.noPhoto')}</div>
            )}
          </div>
        </div>
      </button>

      {/* Details */}
      <div className="px-4 py-3">
        <button className="w-full text-left" onClick={onClick}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-orange-600 transition-colors">
              {report.title ?? t('admin.untitled')}
            </p>
            <span className="shrink-0 text-xs font-mono text-gray-400">#{report.report_id}</span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
            <span>{hazardName}</span>
            <SeverityPips score={report.severity_score} />

            {loc?.state && <span className="text-gray-400">{loc.state}</span>}
            {loc?.address_name && (
              <span className="text-gray-400 truncate col-span-2 -mt-1">{loc.address_name}</span>
            )}

            {teamName && (
              <span className="col-span-2 mt-0.5 text-orange-600 font-medium">{teamName}</span>
            )}
          </div>
        </button>

        <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`font-medium px-2 py-0.5 rounded-full ${badgeCls}`}>{t(`status.${statusName}`)}</span>
            <span className="text-gray-400">{t('admin.archivedDate', { date: fmtDate(report.archived_at) })}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onUnarchive(report.report_id) }}
            disabled={unarchiving === report.report_id}
            className="text-gray-400 hover:text-orange-600 transition-colors font-medium disabled:opacity-50"
          >
            {unarchiving === report.report_id ? t('admin.restoring') : t('admin.unarchive')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminArchive() {
  const { t, lang } = useI18n()
  const [reports, setReports] = useState([])
  const [total, setTotal] = useState(0)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [unarchiving, setUnarchiving] = useState(null)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ state: '', team_id: '', status: '' })
  const [detailId, setDetailId] = useState(null)

  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'
  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const fetchArchive = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = {}
    if (filters.state) params.state = filters.state
    if (filters.team_id) params.team_id = filters.team_id
    if (filters.status) params.status = filters.status
    try {
      const { data } = await api.get('/admin/archive', { params })
      setReports(data.data?.reports ?? [])
      setTotal(data.data?.total ?? 0)
    } catch {
      setError(t('admin.archiveLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [filters, t])

  useEffect(() => { fetchArchive() }, [fetchArchive])

  useEffect(() => {
    api.get('/admin/teams')
      .then(({ data }) => setTeams(data.data ?? []))
      .catch(() => {})
  }, [])

  async function handleUnarchive(reportId) {
    setUnarchiving(reportId)
    try {
      await api.post(`/admin/reports/${reportId}/unarchive`)
      fetchArchive()
    } catch {
      setError(t('admin.unarchiveFailed', { id: reportId }))
    } finally {
      setUnarchiving(null)
    }
  }

  async function handleExportCsv() {
    setExporting(true)
    try {
      const params = {}
      if (filters.state) params.state = filters.state
      if (filters.team_id) params.team_id = filters.team_id
      if (filters.status) params.status = filters.status
      const res = await api.get('/admin/archive/export.csv', {
        params,
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `harda_archive_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('admin.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('admin.archiveHeading')}</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {loading ? t('common.loading') : t('admin.archiveCount', { n: total })}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={exporting || total === 0}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-[0_6px_14px_-4px_rgba(234,88,12,0.45)] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? t('admin.exporting') : t('admin.exportCsv')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer transition"
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="resolved">{t('admin.resolvedOnly')}</option>
          <option value="rejected">{t('admin.rejectedOnly')}</option>
        </select>

        <select
          value={filters.state}
          onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
          className="text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer transition"
        >
          <option value="">{t('admin.allStates')}</option>
          {MY_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.team_id}
          onChange={(e) => setFilters((f) => ({ ...f, team_id: e.target.value }))}
          className="text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer transition"
        >
          <option value="">{t('admin.allTeams')}</option>
          {teams.map((team) => (
            <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
          ))}
        </select>

        <button
          onClick={fetchArchive}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
          title={t('admin.refresh')}
        >
          ↺
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-24">
          <p className="text-gray-400 text-lg">{t('admin.archiveEmpty')}</p>
          <p className="text-gray-300 text-sm mt-1">
            {t('admin.archiveEmptyHint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reports.map((r) => (
            <ArchiveCard
              key={r.report_id}
              report={r}
              onClick={() => setDetailId(r.report_id)}
              onUnarchive={handleUnarchive}
              unarchiving={unarchiving}
              t={t}
              fmtDate={fmtDate}
            />
          ))}
        </div>
      )}

      {detailId && (
        <ReportDetailModal
          reportId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={fetchArchive}
        />
      )}
    </div>
  )
}
