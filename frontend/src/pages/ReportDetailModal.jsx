// UC008/UC009/UC010/UC011 — Admin report detail modal.
// UC011 — Manage Hazard Data (admin override for low-confidence detections)
// Opened by clicking any row in AdminReports.jsx.
// Fetches GET /reports/:id (includes before/after images) + GET /admin/teams in parallel.
// Actions available per status:
//   submitted  → Validate / Reject
//   verified   → Assign field-crew team (PUT /admin/reports/:id/assign)
//   in_progress → read-only, awaiting crew after-photo
//   resolved   → read-only audit view with before+after photos
import { useEffect, useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'

const STATUS_COLOUR = {
  submitted:   'bg-slate-100 text-slate-700',
  verified:    'bg-green-100 text-green-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-blue-100 text-blue-700',
  rejected:    'bg-red-100 text-red-700',
}

function imgUrl(filePath) {
  if (!filePath) return null
  // Nginx proxies /uploads/ → backend; use a root-relative URL so this works
  // regardless of how VITE_API_BASE_URL is configured at build time.
  return `/${filePath}`
}

function fmtDate(iso, locale = 'en-MY') {
  if (!iso) return null
  return new Date(iso).toLocaleString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── sub-components ────────────────────────────────────────────────────────────

function Spinner({ size = 8 }) {
  return (
    <div className={`w-${size} h-${size} border-4 border-orange-400 border-t-transparent rounded-full animate-spin`} />
  )
}

function SeverityDots({ score }) {
  const { t } = useI18n()
  if (!score) return <span className="text-slate-400">—</span>
  const dotColour = score >= 4 ? 'bg-red-500' : score >= 3 ? 'bg-amber-400' : 'bg-green-400'
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`inline-block w-2.5 h-2.5 rounded-full ${i <= score ? dotColour : 'bg-slate-200'}`} />
      ))}
      <span className="text-xs text-slate-500 ml-1">{t(`severity.${score}`)}</span>
    </span>
  )
}

function InfoRow({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <div className="px-6 py-5 border-t border-gray-100 first:border-t-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Timeline({ report, locale }) {
  const { t } = useI18n()
  const steps = [
    { label: t('admin.reported'),  date: report.report_date },
    { label: t('admin.validated'), date: report.validation_date },
    { label: t('admin.assigned'),  date: report.assigned_at },
    { label: t('status.resolved'), date: report.resolution_date },
  ]
  return (
    <div className="flex items-start">
      {steps.map((step, i) => {
        const done = !!step.date
        const nextDone = !!steps[i + 1]?.date
        return (
          <div key={step.label} className="flex-1 min-w-0">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${done ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`} />
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 ${done && nextDone ? 'bg-orange-400' : 'bg-gray-200'}`} />
              )}
            </div>
            <p className={`text-xs mt-1.5 font-medium truncate ${done ? 'text-gray-800' : 'text-gray-400'}`}>
              {step.label}
            </p>
            {step.date && (
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{fmtDate(step.date, locale)}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MapPreview({ lat, lng }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  })
  if (!lat || !lng) return null
  if (!isLoaded) return <div className="h-36 rounded-xl bg-gray-100 animate-pulse" />
  const pos = { lat: Number(lat), lng: Number(lng) }
  return (
    <GoogleMap
      mapContainerClassName="w-full h-36 rounded-xl border border-gray-200"
      center={pos}
      zoom={15}
      options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative' }}
    >
      <Marker position={pos} />
    </GoogleMap>
  )
}

function PhotoPair({ before, after }) {
  const { t } = useI18n()
  if (!before && !after) return null
  const both = before && after
  return (
    <Section title={t('admin.photos')}>
      <div className={`grid gap-4 ${both ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
        {before && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1.5">{t('admin.before')}</p>
            <img
              src={imgUrl(before.file_path)}
              alt={t('admin.before')}
              className="w-full aspect-video object-cover rounded-xl border border-gray-200 bg-gray-100"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}
        {after && (
          <div>
            <p className="text-xs font-medium text-emerald-600 mb-1.5">{t('admin.after')}</p>
            <img
              src={imgUrl(after.file_path)}
              alt={t('admin.after')}
              className="w-full aspect-video object-cover rounded-xl border border-emerald-200 bg-gray-100"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}
      </div>
    </Section>
  )
}

function ActionPanel({ report, teams, onAction }) {
  const { t } = useI18n()
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [busy, setBusy] = useState(false)
  const status = report?.status?.status_name

  async function validate(newStatus) {
    setBusy(true)
    try { await onAction('validate', newStatus) } finally { setBusy(false) }
  }

  async function assign() {
    if (!selectedTeamId) return
    setBusy(true)
    try { await onAction('assign', Number(selectedTeamId)) } finally { setBusy(false) }
  }

  if (status === 'resolved' || status === 'rejected') return null

  return (
    <Section title={t('admin.actionsTitle')}>
      {status === 'submitted' && (
        <div className="flex gap-3">
          <button
            onClick={() => validate('verified')}
            disabled={busy}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            {busy ? t('admin.processing') : t('admin.validateBtn')}
          </button>
          <button
            onClick={() => validate('rejected')}
            disabled={busy}
            className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            {t('admin.rejectBtn')}
          </button>
        </div>
      )}

      {status === 'verified' && (
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              {t('admin.assignTeamLabel')}
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value="">{t('admin.selectTeamPlaceholder')}</option>
              {teams.map((team) => (
                <option key={team.team_id} value={team.team_id}>
                  {team.team_name} — {team.region}
                  {team.member_count != null ? ` (${t('admin.members', { n: team.member_count })})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={assign}
            disabled={!selectedTeamId || busy}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors whitespace-nowrap"
          >
            {busy ? t('admin.assigning') : t('admin.assignTeam')}
          </button>
        </div>
      )}

      {status === 'in_progress' && (
        <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          {t('admin.waitingAfterPhoto')}
        </p>
      )}
    </Section>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function ReportDetailModal({ reportId, onClose, onUpdated, initialEditMode = false }) {
  const { t, lang } = useI18n()
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'
  const [report, setReport] = useState(null)
  const [teams, setTeams] = useState([])
  const [hazardTypes, setHazardTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  // UC011 edit state
  const [editDetails, setEditDetails] = useState(initialEditMode)
  const [draftDetails, setDraftDetails] = useState({})
  const [editLoc, setEditLoc] = useState(false)
  const [draftLoc, setDraftLoc] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    try {
      const [rRes, tRes, htRes] = await Promise.all([
        api.get(`/reports/${reportId}`),
        api.get('/admin/teams'),
        api.get('/admin/hazard-types'),
      ])
      setReport(rRes.data.data ?? rRes.data)
      setTeams(tRes.data.data ?? [])
      setHazardTypes(htRes.data.data ?? [])
    } catch {
      setError(t('admin.loadReportFailed'))
    } finally {
      setLoading(false)
    }
  }, [reportId, t])

  useEffect(() => { load() }, [load])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // UC011 — open detail edit mode pre-populated from current report data
  function startEditDetails() {
    setDraftDetails({
      hazard_type_id: report.hazard_type?.hazard_type_id ?? '',
      severity_score: report.severity_score ?? '',
      title: report.title ?? '',
      description: report.description ?? '',
      is_public: report.is_public ?? true,
    })
    setEditDetails(true)
  }

  async function saveDetails() {
    setSaving(true)
    try {
      const payload = {
        hazard_type_id: draftDetails.hazard_type_id !== '' ? Number(draftDetails.hazard_type_id) : null,
        severity_score: draftDetails.severity_score !== '' ? Number(draftDetails.severity_score) : null,
        title: draftDetails.title,
        description: draftDetails.description,
        is_public: draftDetails.is_public,
      }
      await api.put(`/admin/reports/${reportId}`, payload)
      showToast(t('admin.toastDetails'))
      setEditDetails(false)
      await load()
      onUpdated()
    } catch (e) {
      showToast(e?.response?.data?.message ?? t('admin.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function startEditLoc() {
    const loc = report?.location ?? {}
    setDraftLoc({
      latitude: loc.latitude ?? '',
      longitude: loc.longitude ?? '',
      address_name: loc.address_name ?? '',
      state: loc.state ?? '',
    })
    setEditLoc(true)
  }

  async function saveLoc() {
    setSaving(true)
    try {
      const payload = {
        latitude: draftLoc.latitude !== '' ? Number(draftLoc.latitude) : undefined,
        longitude: draftLoc.longitude !== '' ? Number(draftLoc.longitude) : undefined,
        address_name: draftLoc.address_name,
        state: draftLoc.state,
      }
      await api.put(`/admin/reports/${reportId}`, payload)
      showToast(t('admin.toastLocation'))
      setEditLoc(false)
      await load()
      onUpdated()
    } catch (e) {
      showToast(e?.response?.data?.message ?? t('admin.saveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.delete(`/reports/${reportId}`)
      onUpdated()
      onClose()
    } catch (e) {
      showToast(e?.response?.data?.message ?? t('admin.deleteFailedShort'), 'error')
      setDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  async function handleArchive() {
    setArchiving(true)
    try {
      await api.post(`/admin/reports/${reportId}/archive`)
      showToast(t('admin.toastArchived'))
      await load()
      onUpdated()
    } catch (e) {
      showToast(e?.response?.data?.message ?? t('admin.archiveFailedShort'), 'error')
    } finally {
      setArchiving(false)
    }
  }

  async function handleUnarchive() {
    setArchiving(true)
    try {
      await api.post(`/admin/reports/${reportId}/unarchive`)
      showToast(t('admin.toastRestored'))
      await load()
      onUpdated()
    } catch (e) {
      showToast(e?.response?.data?.message ?? t('admin.unarchiveFailedShort'), 'error')
    } finally {
      setArchiving(false)
    }
  }

  async function handleAction(type, payload) {
    try {
      if (type === 'validate') {
        await api.put(`/reports/${reportId}/status`, { status: payload })
        showToast(payload === 'verified' ? t('admin.toastVerified') : t('admin.toastRejected'))
      } else if (type === 'assign') {
        await api.put(`/admin/reports/${reportId}/assign`, { team_id: payload })
        showToast(t('admin.toastAssigned'))
      }
      await load()
      onUpdated()
    } catch (e) {
      const msg = e?.response?.data?.message ?? t('admin.actionFailed')
      showToast(msg, 'error')
    }
  }

  const statusName = report?.status?.status_name ?? 'submitted'
  const statusColour = STATUS_COLOUR[statusName] ?? STATUS_COLOUR.submitted
  const loc = report?.location

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Panel */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            {report ? (
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{report.title ?? t('admin.untitled')}</h2>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColour}`}>
                    {t(`status.${statusName}`)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{t('admin.reportNo', { id: reportId })}</p>
              </div>
            ) : (
              <div className="h-10 w-60 bg-gray-100 animate-pulse rounded-lg" />
            )}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setDeleteConfirm((v) => !v)}
                aria-label={t('admin.deleteReportTitle')}
                title={t('admin.deleteReportTitle')}
                className="text-gray-400 hover:text-red-500 transition-colors rounded-lg p-1 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1M4 7h16" />
                </svg>
              </button>
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                className="text-gray-400 hover:text-gray-700 transition-colors rounded-lg p-1 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Spinner size={10} />
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 inline-block">{error}</p>
            </div>
          ) : (
            <div className="overflow-y-auto">

              {/* Delete confirmation panel */}
              {deleteConfirm && (
                <div className="mx-6 mt-5 bg-red-50 border border-red-300 rounded-xl px-4 py-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-red-800">
                    {t('admin.deleteQuestion', { id: reportId })}
                  </p>
                  <p className="text-xs text-red-700">
                    {t('admin.deleteExplain')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                    >
                      {deleting ? t('admin.deleting') : t('admin.deleteYes')}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleting}
                      className="border border-red-300 text-red-700 hover:bg-red-100 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Low-confidence callout — prompts admin to set type/severity before validating */}
              {report.detection_low_confidence && !report.hazard_type && (
                <div className="mx-6 mt-5 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 flex gap-3 items-start">
                  <span className="text-yellow-500 shrink-0 mt-0.5">⚠</span>
                  <p className="text-sm text-yellow-800">
                    {t('admin.lowConfClassify')}{' '}
                    <button
                      onClick={startEditDetails}
                      className="font-semibold underline hover:text-yellow-900"
                    >
                      {t('admin.lowConfSetManually')}
                    </button>{' '}
                    {t('admin.lowConfBefore')}
                  </p>
                </div>
              )}

              {/* Photos */}
              <PhotoPair before={report.before_image} after={report.after_image} />

              {/* Location */}
              {loc && (
                <Section
                  title={t('admin.locationTitle')}
                  action={!editLoc && (
                    <button
                      onClick={startEditLoc}
                      className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      {t('admin.editLocation')}
                    </button>
                  )}
                >
                  {editLoc ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{t('submit.latitude')}</label>
                          <input
                            type="number"
                            step="any"
                            value={draftLoc.latitude}
                            onChange={(e) => setDraftLoc((d) => ({ ...d, latitude: e.target.value }))}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">{t('submit.longitude')}</label>
                          <input
                            type="number"
                            step="any"
                            value={draftLoc.longitude}
                            onChange={(e) => setDraftLoc((d) => ({ ...d, longitude: e.target.value }))}
                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">{t('admin.addressLabel')}</label>
                        <input
                          type="text"
                          value={draftLoc.address_name}
                          onChange={(e) => setDraftLoc((d) => ({ ...d, address_name: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">{t('admin.stateLabel')}</label>
                        <input
                          type="text"
                          value={draftLoc.state}
                          onChange={(e) => setDraftLoc((d) => ({ ...d, state: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={saveLoc}
                          disabled={saving}
                          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                        >
                          {saving ? t('admin.saving') : t('admin.saveLocation')}
                        </button>
                        <button
                          onClick={() => setEditLoc(false)}
                          disabled={saving}
                          className="border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium text-gray-800">{loc.address_name ?? '—'}</p>
                        {loc.state && <p className="text-sm text-gray-500 mt-0.5">{loc.state}</p>}
                        <p className="text-xs text-gray-400 font-mono mt-2">
                          {Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}
                        </p>
                      </div>
                      <MapPreview lat={loc.latitude} lng={loc.longitude} />
                    </div>
                  )}
                </Section>
              )}

              {/* Hazard details */}
              <Section
                title={t('admin.hazardDetails')}
                action={!editDetails && (
                  <button
                    onClick={startEditDetails}
                    title={t('admin.edit')}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536M9 13l-4 1 1-4 9.293-9.293a1 1 0 011.414 0l2.586 2.586a1 1 0 010 1.414L9 13z" />
                    </svg>
                    {t('admin.edit')}
                  </button>
                )}
              >
                {editDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">{t('admin.hazardTypeLabel')}</label>
                        <select
                          value={draftDetails.hazard_type_id}
                          onChange={(e) => setDraftDetails((d) => ({ ...d, hazard_type_id: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        >
                          <option value="">{t('admin.notSet')}</option>
                          {hazardTypes.map((ht) => (
                            <option key={ht.hazard_type_id} value={ht.hazard_type_id}>
                              {t(`hazardType.${ht.type_name}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">{t('admin.severityRange')}</label>
                        <select
                          value={draftDetails.severity_score}
                          onChange={(e) => setDraftDetails((d) => ({ ...d, severity_score: e.target.value }))}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        >
                          <option value="">{t('admin.notSet')}</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n} — {t(`severity.${n}`)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">{t('admin.titleLabel')}</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={draftDetails.title}
                        onChange={(e) => setDraftDetails((d) => ({ ...d, title: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">{t('admin.descriptionLabel')}</label>
                      <textarea
                        rows={3}
                        value={draftDetails.description}
                        onChange={(e) => setDraftDetails((d) => ({ ...d, description: e.target.value }))}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_public_edit"
                        checked={!!draftDetails.is_public}
                        onChange={(e) => setDraftDetails((d) => ({ ...d, is_public: e.target.checked }))}
                        className="accent-orange-500"
                      />
                      <label htmlFor="is_public_edit" className="text-sm text-gray-600">{t('admin.publicLabel')}</label>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={saveDetails}
                        disabled={saving}
                        className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
                      >
                        {saving ? t('admin.saving') : t('admin.saveChanges')}
                      </button>
                      <button
                        onClick={() => setEditDetails(false)}
                        disabled={saving}
                        className="border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                      <InfoRow label={t('admin.typeLabel')}>
                        <span>
                          {report.hazard_type?.type_name ? t(`hazardType.${report.hazard_type.type_name}`) : '—'}
                        </span>
                      </InfoRow>
                      <InfoRow label={t('myReports.severity').replace(':', '')}>
                        <SeverityDots score={report.severity_score} />
                      </InfoRow>
                      <InfoRow label={t('admin.aiConfidence')}>
                        {report.detection_confidence != null ? (
                          <span className={report.detection_low_confidence ? 'text-amber-600 font-semibold' : ''}>
                            {(report.detection_confidence * 100).toFixed(1)}%
                            {report.detection_low_confidence && (
                              <span className="block text-xs font-normal text-amber-600 mt-0.5">
                                {t('admin.belowThreshold')}
                              </span>
                            )}
                          </span>
                        ) : '—'}
                      </InfoRow>
                      <InfoRow label={t('admin.submitter')}>
                        {report.user_id ? t('admin.userNo', { id: report.user_id }) : t('admin.guest')}
                      </InfoRow>
                      <InfoRow label={t('admin.visibility')}>
                        {report.is_public ? t('admin.publicVal') : t('admin.privateVal')}
                      </InfoRow>
                    </div>
                    {report.description && (
                      <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs font-medium text-gray-400 mb-1">{t('admin.descriptionLabel')}</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{report.description}</p>
                      </div>
                    )}
                  </>
                )}
              </Section>

              {/* Timeline */}
              <Section title={t('admin.timeline')}>
                <Timeline report={report} locale={locale} />
              </Section>

              {/* Assigned team (when set) */}
              {report.assigned_team && (
                <Section title={t('admin.assignedTeam')}>
                  <div className="flex items-start gap-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{report.assigned_team.team_name}</p>
                      {report.assigned_team.region && (
                        <p className="text-sm text-gray-500 mt-0.5">{report.assigned_team.region}</p>
                      )}
                    </div>
                    {report.assigned_at && (
                      <p className="text-xs text-gray-400 whitespace-nowrap mt-0.5 shrink-0">
                        {t('admin.assignedOn', { date: fmtDate(report.assigned_at, locale) })}
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* Archive section — for resolved/rejected reports */}
              {(statusName === 'resolved' || statusName === 'rejected') && (
                <Section title={t('admin.archiveSection')}>
                  {report.archived_at ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-700 font-medium">{t('admin.archivedWord')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmtDate(report.archived_at, locale)}
                        </p>
                      </div>
                      <button
                        onClick={handleUnarchive}
                        disabled={archiving}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline disabled:opacity-50 shrink-0"
                      >
                        {archiving ? t('admin.restoring') : t('admin.unarchiveArrow')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div className="text-sm text-blue-800">
                        {statusName === 'resolved'
                          ? t('admin.archiveResolvedPrompt', { date: report.resolution_date ? ` ${fmtDate(report.resolution_date, locale)}` : '' })
                          : t('admin.archiveRejectedPrompt')}
                      </div>
                      <button
                        onClick={handleArchive}
                        disabled={archiving}
                        className="shrink-0 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors"
                      >
                        {archiving ? t('admin.archiving') : t('admin.archiveBtn')}
                      </button>
                    </div>
                  )}
                </Section>
              )}

              {/* Action panel — hidden for archived reports */}
              {!report.archived_at && (
                <ActionPanel
                  report={report}
                  teams={teams}
                  onAction={handleAction}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast — above modal z-layer */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error'
            ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          }
          {toast.msg}
        </div>
      )}
    </>
  )
}
