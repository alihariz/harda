// UC008 – Review Hazard Reports  UC009 – Validate  UC010 – Update Status  UC011 – Manage Hazard Data
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'
import ReportDetailModal from './ReportDetailModal'

const STATUSES = ['submitted', 'verified', 'in_progress', 'resolved', 'rejected']

const STATUS_COLOUR = {
  submitted:   'bg-slate-100 text-slate-600',
  verified:    'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-blue-100 text-blue-700',
  rejected:    'bg-red-100 text-red-700',
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-pop text-sm font-semibold flex items-center gap-2 animate-rise ${
      type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
    }`}>
      {type === 'error'
        ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      }
      {message}
    </div>
  )
}

export default function AdminReports() {
  const { t, lang } = useI18n()
  const [searchParams] = useSearchParams()
  const [reports, setReports] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: searchParams.get('status') ?? '',
    hazard_type: searchParams.get('hazard_type') ?? '',
  })
  const [selected, setSelected] = useState(new Set())
  const [updating, setUpdating] = useState(null)
  const [toast, setToast] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [detailEditMode, setDetailEditMode] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  function openModal(reportId, editMode = false) {
    setDetailId(reportId)
    setDetailEditMode(editMode)
  }

  async function deleteReport(reportId) {
    if (!window.confirm(t('admin.deleteConfirm', { id: reportId }))) return
    try {
      await api.delete(`/reports/${reportId}`)
      showToast(t('admin.deleted', { id: reportId }))
      fetchReports()
    } catch {
      showToast(t('admin.deleteFailed', { id: reportId }), 'error')
    }
  }

  async function archiveReport(reportId) {
    try {
      await api.post(`/admin/reports/${reportId}/archive`)
      showToast(t('admin.archived', { id: reportId }))
      fetchReports()
    } catch (e) {
      showToast(e?.response?.data?.message ?? t('admin.archiveFailed', { id: reportId }), 'error')
    }
  }

  const fetchReports = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.hazard_type) params.set('hazard_type', filters.hazard_type)
    if (showArchived) params.set('include_archived', 'true')
    api.get(`/admin/reports?${params}`)
      .then(({ data }) => {
        setReports(data.data?.reports ?? [])
        setTotal(data.data?.total ?? 0)
      })
      .catch(() => showToast(t('admin.loadFailed'), 'error'))
      .finally(() => setLoading(false))
  }, [filters, showArchived, t])

  useEffect(() => { fetchReports() }, [fetchReports])

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(selected.size === reports.length && reports.length > 0
      ? new Set()
      : new Set(reports.map((r) => r.report_id)))
  }

  async function updateStatus(reportId, newStatus) {
    setUpdating(reportId)
    try {
      await api.put(`/reports/${reportId}/status`, { status: newStatus })
      setReports((prev) => prev.map((r) =>
        r.report_id === reportId
          ? { ...r, status: { ...(r.status ?? {}), status_name: newStatus } }
          : r
      ))
      showToast(t('admin.statusChanged', { id: reportId, status: t(`status.${newStatus}`) }))
    } catch {
      showToast(t('admin.statusFailed', { id: reportId }), 'error')
    } finally {
      setUpdating(null)
    }
  }

  async function bulkAction(action) {
    if (selected.size === 0) return
    const actionLabel = action === 'verified' ? t('status.verified')
      : action === 'rejected' ? t('status.rejected')
      : t('admin.archivedBadge')
    try {
      await api.post('/admin/reports/bulk-action', { report_ids: [...selected], action })
      showToast(t('admin.bulkUpdated', { n: selected.size, action: actionLabel }))
      fetchReports()
      setSelected(new Set())
    } catch {
      showToast(t('admin.bulkFailed'), 'error')
    }
  }

  const allSelected = reports.length > 0 && selected.size === reports.length
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'
  const selectClass = 'text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer'

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('admin.queueTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {loading ? t('common.loading') : t('admin.queueTotal', { n: total })}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={selectClass}>
            <option value="">{t('admin.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
          <select value={filters.hazard_type} onChange={(e) => setFilters((f) => ({ ...f, hazard_type: e.target.value }))} className={selectClass}>
            <option value="">{t('map.allTypes')}</option>
            <option value="pothole">{t('hazardType.pothole')}</option>
            <option value="faded_lane_marking">{t('hazardType.faded_lane_marking')}</option>
            <option value="uneven_surface">{t('hazardType.uneven_surface')}</option>
          </select>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`text-sm font-semibold border rounded-xl px-3 py-2 transition-colors cursor-pointer ${
              showArchived ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
            title={showArchived ? t('admin.hideArchivedTitle') : t('admin.showArchivedTitle')}
          >
            {showArchived ? t('admin.archivedOn') : t('admin.showArchived')}
          </button>
          <button onClick={fetchReports} className="text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-600 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer" title={t('admin.refresh')}>
            ↺
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-4 flex-wrap text-sm shadow-card animate-rise">
          <span className="text-orange-800 font-bold">{t('admin.selected', { n: selected.size })}</span>
          <button onClick={() => bulkAction('verified')} className="text-green-700 hover:underline font-semibold cursor-pointer">{t('admin.verifyAll')}</button>
          <button onClick={() => bulkAction('rejected')} className="text-red-600 hover:underline font-semibold cursor-pointer">{t('admin.rejectAll')}</button>
          <button onClick={() => bulkAction('archive')} className="text-slate-600 hover:underline font-semibold cursor-pointer">{t('admin.archiveAll')}</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-slate-700 font-medium cursor-pointer">{t('admin.clearSelection')}</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-card">{t('admin.noReports')}</div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-x-auto shadow-card">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded accent-orange-500 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.colId')}</th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.colTitle')}</th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.colType')}</th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.colSeverity')}</th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.colConfidence')}</th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.colStatus')}</th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.colDate')}</th>
                <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase text-[11px] tracking-wide">{t('admin.updateStatusCol')}</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => {
                const statusName = r.status?.status_name ?? 'submitted'
                const hazardName = r.hazard_type?.type_name ?? null
                const colour = STATUS_COLOUR[statusName] ?? STATUS_COLOUR.submitted
                const isArchived = !!r.archived_at
                const canArchive = !isArchived && (statusName === 'resolved' || statusName === 'rejected')

                return (
                  <tr
                    key={r.report_id}
                    onClick={() => openModal(r.report_id)}
                    className={`cursor-pointer hover:bg-orange-50/60 transition-colors ${selected.has(r.report_id) ? 'bg-orange-50' : ''} ${isArchived ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.report_id)} onChange={() => toggleSelect(r.report_id)} className="rounded accent-orange-500 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{r.report_id}</td>
                    <td className="px-4 py-3 text-slate-800 max-w-[180px]">
                      <p className="truncate font-semibold">{r.title ?? t('admin.untitled')}</p>
                      {r.location?.state && <p className="text-xs text-slate-400 truncate">{r.location.state}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {hazardName ? (
                        <span className="text-slate-600 font-medium">{t(`hazardType.${hazardName}`)}</span>
                      ) : (
                        <button onClick={() => openModal(r.report_id, true)} className="text-xs text-amber-600 hover:text-amber-800 font-semibold hover:underline cursor-pointer">{t('admin.setType')}</button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.severity_score ? (
                        <span className={`font-bold ${r.severity_score >= 4 ? 'text-red-600' : r.severity_score >= 3 ? 'text-amber-600' : 'text-slate-600'}`}>{r.severity_score}/5</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {r.detection_confidence != null ? (
                        <span className={r.detection_low_confidence ? 'text-amber-600 font-bold' : 'text-slate-600 font-medium'}>
                          {r.detection_low_confidence && <span title="Below 70% threshold">⚠ </span>}
                          {(r.detection_confidence * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colour}`}>{t(`status.${statusName}`)}</span>
                        {isArchived && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">{t('admin.archivedBadge')}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {r.report_date ? new Date(r.report_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={statusName}
                        disabled={updating === r.report_id}
                        onChange={(e) => updateStatus(r.report_id, e.target.value)}
                        className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white cursor-pointer"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                      </select>
                      {updating === r.report_id && <span className="ml-2 inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin align-middle" />}
                    </td>
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        {canArchive && (
                          <button onClick={() => archiveReport(r.report_id)} title={t('admin.archived', { id: r.report_id })} className="text-slate-300 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                          </button>
                        )}
                        <button onClick={() => deleteReport(r.report_id)} title={t('admin.deleteConfirm', { id: r.report_id })} className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailId && (
        <ReportDetailModal
          reportId={detailId}
          onClose={() => { setDetailId(null); setDetailEditMode(false) }}
          onUpdated={fetchReports}
          initialEditMode={detailEditMode}
        />
      )}
    </div>
  )
}
