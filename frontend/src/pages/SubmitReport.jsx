// UC001 – Upload Hazard Image  UC002 – Auto Capture Geolocation
import { useState, useEffect } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'

const MAX_BYTES = 10 * 1024 * 1024

export default function SubmitReport() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locStatus, setLocStatus] = useState(null) // null | 'detecting' | 'ok' | 'error'
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Auto-request GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) return
    setLocStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocStatus('ok')
      },
      () => setLocStatus('error'),
      { timeout: 8000 }
    )
  }, [])

  function handleFileChange(e) {
    const selected = e.target.files[0]
    if (!selected) return
    if (selected.size > MAX_BYTES) {
      setError(t('submit.errTooLarge'))
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setResult(null)
    setError(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    if (dropped.size > MAX_BYTES) { setError(t('submit.errTooLargeShort')); return }
    if (!dropped.type.match(/image\/(jpeg|png)/)) { setError(t('submit.errImageType')); return }
    setFile(dropped)
    setPreview(URL.createObjectURL(dropped))
    setResult(null)
    setError(null)
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocStatus('error'); return }
    setLocStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocStatus('ok')
      },
      () => setLocStatus('error'),
      { timeout: 8000 }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) return
    if (!lat || !lng) { setError(t('submit.errLocationRequired')); return }

    setSubmitting(true)
    setError(null)

    const form = new FormData()
    form.append('image', file)
    form.append('description', description)
    form.append('title', title || 'Hazard Report')
    form.append('latitude', lat)
    form.append('longitude', lng)

    try {
      const { data } = await api.post('/reports', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.message ?? t('submit.errSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setResult(null); setFile(null); setPreview(null)
    setDescription(''); setTitle(''); setError(null)
  }

  const detection = result?.data?.detection
  const hazardTypeKey = result?.data?.hazard_type?.type_name ?? detection?.hazard_type ?? null
  const hazardTypeName = hazardTypeKey ? t(`hazardType.${hazardTypeKey}`) : '—'
  const confidence = detection?.confidence ?? 0

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('submit.title')}</h1>
      <p className="text-gray-500 text-sm mb-8">
        {t('submit.lead')}
        {user ? t('submit.submittingAs', { name: user.username }) : t('submit.guest')}
      </p>

      {result ? (
        /* ── Success screen ─────────────────────────────────────────── */
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-green-800 mb-1">{t('submit.successTitle')}</h2>
          <p className="text-green-700 text-sm">
            {t('submit.trackingId')}: <span className="font-mono font-bold">#{result.data?.report_id ?? '—'}</span>
          </p>
          {detection && !detection.low_confidence ? (
            <div className="mt-3 bg-white border border-green-200 rounded-lg px-4 py-3 text-left inline-block w-full max-w-xs mx-auto">
              <p className="text-xs text-gray-500 mb-1">{t('submit.aiDetected')}</p>
              <p className="text-gray-800 font-semibold">{hazardTypeName}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${Math.round(confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {t('submit.confidence', { pct: Math.round(confidence * 100) })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">{t('submit.severity', { score: result.data?.severity_score ?? '—' })}</p>
            </div>
          ) : (
            <p className="text-green-600 text-sm mt-2">
              {detection?.low_confidence
                ? t('submit.uncertain')
                : t('submit.noDetection')}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-4">{t('submit.appearOnMap')}</p>
          <button
            onClick={reset}
            className="mt-4 text-sm text-green-700 underline hover:text-green-900"
          >
            {t('submit.submitAnother')}
          </button>
        </div>
      ) : (
        /* ── Submission form ────────────────────────────────────────── */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('submit.photo')} <span className="text-red-500">*</span></label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input').click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="max-h-56 mx-auto rounded-lg object-contain" />
                  <p className="text-xs text-gray-400 mt-2">{file?.name} · {(file?.size / 1024 / 1024).toFixed(1)} MB</p>
                  <p className="text-xs text-orange-500 mt-0.5">{t('submit.clickToChange')}</p>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">{t('submit.uploadCta')}</p>
                  <p className="text-gray-400 text-xs mt-1">{t('submit.uploadHint')}</p>
                </>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('submit.titleLabel')} <span className="text-gray-400">{t('common.optional')}</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('submit.titlePlaceholder')}
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                {t('submit.location')} <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={requestLocation}
                className="text-xs text-orange-500 hover:text-orange-700 flex items-center gap-1"
              >
                {locStatus === 'detecting' ? (
                  <span className="inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {locStatus === 'detecting' ? t('submit.detecting') : locStatus === 'ok' ? t('submit.reDetect') : t('submit.useLocation')}
              </button>
            </div>
            {locStatus === 'ok' && (
              <p className="text-xs text-green-600 mb-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t('submit.gpsDetected')}
              </p>
            )}
            {locStatus === 'error' && (
              <p className="text-xs text-yellow-600 mb-1.5">{t('submit.gpsUnavailable')}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">{t('submit.latitude')}</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 3.1390"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">{t('submit.longitude')}</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 101.6869"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('submit.description')} <span className="text-gray-400">{t('common.optional')}</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('submit.descPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={!file || submitting}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('submit.analysing')}
              </span>
            ) : t('submit.submit')}
          </button>
        </form>
      )}
    </div>
  )
}
