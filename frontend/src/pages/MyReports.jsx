// UC005 – Check Hazard Status  UC006 – Manage Personal Account
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import api from '../api/axios'

const STATUS_COLOUR = {
  submitted:   'bg-gray-100 text-gray-600',
  verified:    'bg-green-100 text-green-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved:    'bg-blue-100 text-blue-700',
  rejected:    'bg-red-100 text-red-700',
}

function StatusBadge({ statusName }) {
  const { t } = useI18n()
  const colour = STATUS_COLOUR[statusName] ?? 'bg-gray-100 text-gray-600'
  const label = t(`status.${statusName}`)
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${colour}`}>
      {label}
    </span>
  )
}

export default function MyReports() {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    api.get(`/reports/user/${user.user_id}`)
      .then(({ data }) => setReports(data.data ?? []))
      .catch(() => setError(t('myReports.loadError')))
      .finally(() => setLoading(false))
  }, [user, t])

  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY'
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">{t('myReports.title')}</h1>
        <Link
          to="/submit"
          className="text-sm bg-orange-500 hover:bg-orange-400 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {t('myReports.newReport')}
        </Link>
      </div>
      <p className="text-gray-500 text-sm mb-8">{t('myReports.lead')}</p>

      {/* Status legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(STATUS_COLOUR).map(([key, colour]) => (
          <span key={key} className={`text-xs px-2 py-0.5 rounded-full ${colour}`}>{t(`status.${key}`)}</span>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mb-3">{t('myReports.empty')}</p>
          <Link to="/submit" className="text-sm bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg">
            {t('myReports.submitFirst')}
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {reports.map((r) => {
          const statusName = r.status?.status_name ?? 'submitted'
          const hazardName = r.hazard_type?.type_name ?? null
          const address = r.location?.address_name ?? null
          const state = r.location?.state ?? null

          return (
            <div key={r.report_id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-gray-400 shrink-0">#{r.report_id}</span>
                  <p className="font-semibold text-gray-800 truncate">{r.title ?? t('myReports.untitled')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {r.detection_low_confidence && statusName === 'submitted' && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                      {t('myReports.awaitingReview')}
                    </span>
                  )}
                  <StatusBadge statusName={statusName} />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                {hazardName && (
                  <span className="font-medium text-gray-700">
                    {t(`hazardType.${hazardName}`)}
                  </span>
                )}
                {r.severity_score && (
                  <span>
                    {t('myReports.severity')} <span className="font-medium text-gray-700">{t(`severity.${r.severity_score}`)} ({r.severity_score}/5)</span>
                  </span>
                )}
              </div>

              {(address || state) && (
                <p className="text-xs text-gray-400 mt-1.5 truncate">
                  📍 {[address, state].filter(Boolean).join(', ')}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {r.report_date ? t('myReports.submittedOn', { date: fmtDate(r.report_date) }) : '—'}
                </p>
                {r.validation_date && (
                  <p className="text-xs text-gray-400">
                    {t('myReports.validatedOn', { date: fmtDate(r.validation_date) })}
                  </p>
                )}
                {r.resolution_date && (
                  <p className="text-xs text-blue-500 font-medium">
                    {t('myReports.resolvedOn', { date: fmtDate(r.resolution_date) })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
