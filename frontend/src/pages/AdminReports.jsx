// UC008 – Review Hazard Reports  UC009 – Validate  UC010 – Update Status  UC011 – Manage Hazard Data
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import ReportDetailModal from './ReportDetailModal'

const STATUSES = ['submitted', 'verified', 'in_progress', 'resolved', 'rejected']

const STATUS_META = {
  submitted:   { colour: 'bg-gray-100 text-gray-600',    label: 'Submitted' },
  verified:    { colour: 'bg-green-100 text-green-700',  label: 'Verified' },
  in_progress: { colour: 'bg-yellow-100 text-yellow-700', label: 'In Progress' },
  resolved:    { colour: 'bg-blue-100 text-blue-700',    label: 'Resolved' },
  rejected:    { colour: 'bg-red-100 text-red-700',      label: 'Rejected' },
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
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
  const [toast, setToast] = useState(null) // { message, type }
  const [detailId, setDetailId] = useState(null) // report_id currently open in modal
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
    if (!window.confirm(`Permanently delete Report #${reportId}? This cannot be undone.`)) return
    try {
      await api.delete(`/reports/${reportId}`)
      showToast(`Report #${reportId} deleted`)
      fetchReports()
    } catch {
      showToast(`Failed to delete Report #${reportId}.`, 'error')
    }
  }

  async function archiveReport(reportId) {
    try {
      await api.post(`/admin/reports/${reportId}/archive`)
      showToast(`Report #${reportId} archived`)
      fetchReports()
    } catch (e) {
      showToast(e?.response?.data?.message ?? `Failed to archive Report #${reportId}.`, 'error')
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
      .catch(() => showToast('Failed to load reports.', 'error'))
      .finally(() => setLoading(false))
  }, [filters, showArchived])

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
      showToast(`Report #${reportId} → ${newStatus.replace('_', ' ')}`)
    } catch {
      showToast(`Failed to update report #${reportId}.`, 'error')
    } finally {
      setUpdating(null)
    }
  }

  async function bulkAction(action) {
    if (selected.size === 0) return
    try {
      await api.post('/admin/reports/bulk-action', { report_ids: [...selected], action })
      showToast(`${selected.size} report${selected.size !== 1 ? 's' : ''} updated to "${action.replace('_', ' ')}"`)
      fetchReports()
      setSelected(new Set())
    } catch {
      showToast('Bulk action failed. Please try again.', 'error')
    }
  }

  const allSelected = reports.length > 0 && selected.size === reports.length

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Report Queue</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? 'Loading…' : `${total} report${total !== 1 ? 's' : ''} total`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
            ))}
          </select>
          <select
            value={filters.hazard_type}
            onChange={(e) => setFilters((f) => ({ ...f, hazard_type: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">All Types</option>
            <option value="pothole">Pothole</option>
            <option value="faded_lane_marking">Faded Lane Marking</option>
            <option value="uneven_surface">Uneven Surface</option>
          </select>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`text-sm border rounded-lg px-3 py-1.5 transition-colors ${
              showArchived
                ? 'border-orange-400 bg-orange-50 text-orange-700 font-medium'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
            title={showArchived ? 'Hide archived reports' : 'Show archived reports'}
          >
            {showArchived ? '⊙ Archived on' : '⊙ Show archived'}
          </button>
          <button
            onClick={fetchReports}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-3 flex-wrap text-sm">
          <span className="text-orange-800 font-medium">{selected.size} selected</span>
          <button
            onClick={() => bulkAction('verified')}
            className="text-green-700 hover:underline font-medium"
          >
            ✓ Verify all
          </button>
          <button
            onClick={() => bulkAction('rejected')}
            className="text-red-600 hover:underline font-medium"
          >
            ✕ Reject all
          </button>
          <button
            onClick={() => bulkAction('archive')}
            className="text-gray-600 hover:underline font-medium"
          >
            ↓ Archive all
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No reports match the selected filters.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded accent-orange-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">ID</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Title</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Type</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Sev.</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Conf.</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Date</th>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Update Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => {
                const statusName = r.status?.status_name ?? 'submitted'
                const hazardName = r.hazard_type?.type_name ?? null
                const meta = STATUS_META[statusName] ?? STATUS_META.submitted

                const isArchived = !!r.archived_at
                const canArchive = !isArchived && (statusName === 'resolved' || statusName === 'rejected')

                return (
                  <tr
                    key={r.report_id}
                    onClick={() => openModal(r.report_id)}
                    className={`cursor-pointer hover:bg-orange-50 transition-colors ${selected.has(r.report_id) ? 'bg-orange-50' : ''} ${isArchived ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.report_id)}
                        onChange={() => toggleSelect(r.report_id)}
                        className="rounded accent-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{r.report_id}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[180px]">
                      <p className="truncate font-medium">{r.title ?? 'Untitled'}</p>
                      {r.location?.state && (
                        <p className="text-xs text-gray-400 truncate">{r.location.state}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {hazardName ? (
                        <span className="text-gray-600">{hazardName.replace(/_/g, ' ')}</span>
                      ) : (
                        <button
                          onClick={() => openModal(r.report_id, true)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium hover:underline"
                        >
                          Set type →
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.severity_score ? (
                        <span className={`font-medium ${r.severity_score >= 4 ? 'text-red-600' : r.severity_score >= 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {r.severity_score}/5
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {r.detection_confidence != null ? (
                        <span className={r.detection_low_confidence ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                          {r.detection_low_confidence && <span title="Below 70% threshold">⚠ </span>}
                          {(r.detection_confidence * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.colour}`}>
                          {meta.label}
                        </span>
                        {isArchived && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Archived
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {r.report_date
                        ? new Date(r.report_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={statusName}
                        disabled={updating === r.report_id}
                        onChange={(e) => updateStatus(r.report_id, e.target.value)}
                        className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50 bg-white"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
                        ))}
                      </select>
                      {updating === r.report_id && (
                        <span className="ml-2 inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin align-middle" />
                      )}
                    </td>
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        {canArchive && (
                          <button
                            onClick={() => archiveReport(r.report_id)}
                            title="Archive report"
                            className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => deleteReport(r.report_id)}
                          title="Delete report"
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1M4 7h16" />
                          </svg>
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
