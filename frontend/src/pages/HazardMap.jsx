// UC003 – View Hazard Map
import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import api from '../api/axios'
import { useI18n } from '../i18n/I18nContext'

const CENTRE = { lat: 4.2105, lng: 101.9758 }
const DEFAULT_ZOOM = 6

const TYPE_ICON = {
  pothole:             'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  faded_lane_marking:  'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  uneven_surface:      'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
}
const DEFAULT_ICON = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'

const LEGEND = [
  { colour: '#F97316', key: 'pothole' },
  { colour: '#F59E0B', key: 'faded_lane_marking' },
  { colour: '#7C3AED', key: 'uneven_surface' },
]

export default function HazardMap() {
  const { t } = useI18n()
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  })

  const mapRef = useRef(null)
  const onMapLoad = useCallback((map) => { mapRef.current = map }, [])

  const [markers, setMarkers] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/locations/hazards')
      .then(({ data }) => setMarkers(Array.isArray(data.data) ? data.data : []))
      .catch(() => setFetchError(t('map.loadError')))
  }, [t])

  const visible = typeFilter ? markers.filter((m) => m.hazard_type === typeFilter) : markers

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-red-500 text-sm">
        {t('map.mapsError')}
      </div>
    )
  }

  const selectClass =
    'text-sm border border-slate-300 rounded-xl px-3 py-2 text-slate-700 bg-white shadow-card ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center gap-3 flex-wrap shadow-sm z-10">
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{t('map.title')}</h1>
        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">{t('map.count', { n: visible.length })}</span>

        <div className="ml-auto flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
            <option value="">{t('map.allTypes')}</option>
            <option value="pothole">{t('hazardType.pothole')}</option>
            <option value="faded_lane_marking">{t('hazardType.faded_lane_marking')}</option>
            <option value="uneven_surface">{t('hazardType.uneven_surface')}</option>
          </select>
        </div>

        {fetchError && (
          <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">{fetchError}</span>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="w-9 h-9 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isLoaded && (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={CENTRE}
            zoom={DEFAULT_ZOOM}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControlOptions: { position: 3 },
              fullscreenControlOptions: { position: 7 },
            }}
          >
            {visible.map((hazard) => (
              <Marker
                key={hazard.report_id}
                position={{ lat: hazard.latitude, lng: hazard.longitude }}
                icon={TYPE_ICON[hazard.hazard_type] ?? DEFAULT_ICON}
                title={hazard.hazard_type ? t(`hazardType.${hazard.hazard_type}`) : t('map.unknownHazard')}
                onClick={() => setSelected(hazard)}
              />
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: selected.latitude, lng: selected.longitude }}
                onCloseClick={() => setSelected(null)}
              >
                <div className="text-sm min-w-[190px] p-0.5">
                  <p className="font-bold text-slate-900 mb-1">
                    {selected.hazard_type ? t(`hazardType.${selected.hazard_type}`) : t('map.unknownHazard')}
                  </p>
                  {selected.severity_score && (
                    <p className="text-slate-600">
                      {t('map.severity')} <span className="font-semibold">{t(`severity.${selected.severity_score}`)} ({selected.severity_score}/5)</span>
                    </p>
                  )}
                  {selected.address_name && <p className="text-slate-500 text-xs mt-1">{selected.address_name}</p>}
                  {selected.state && <p className="text-slate-400 text-xs">{selected.state}</p>}
                  <p className="text-slate-400 text-xs mt-1 font-mono">{t('map.report', { id: selected.report_id })}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-4 bg-white rounded-2xl shadow-lift px-4 py-3.5 text-xs text-slate-600 space-y-2 z-10 pointer-events-none border border-slate-100">
          <p className="font-bold text-slate-800 mb-1.5">{t('map.legend')}</p>
          {LEGEND.map(({ colour, key }) => (
            <div key={key} className="flex items-center gap-2 font-medium">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colour }} />
              {t(`hazardType.${key}`)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
