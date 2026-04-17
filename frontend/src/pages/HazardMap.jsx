// UC003 – View Hazard Map
import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import api from '../api/axios'

const CENTRE = { lat: 4.2105, lng: 101.9758 }
const DEFAULT_ZOOM = 6

// Google Maps coloured pin icons per hazard type
const TYPE_ICON = {
  pothole:             'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  faded_lane_marking:  'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  uneven_surface:      'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
}
const DEFAULT_ICON = 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'

const LEGEND = [
  { colour: 'bg-red-500',    label: 'Pothole',         key: 'pothole' },
  { colour: 'bg-yellow-400', label: 'Faded Lane',       key: 'faded_lane_marking' },
  { colour: 'bg-orange-500', label: 'Uneven Surface',   key: 'uneven_surface' },
]

const SEVERITY_LABEL = ['', 'Very Low', 'Low', 'Medium', 'High', 'Critical']

export default function HazardMap() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  })

  const mapRef = useRef(null)
  const onMapLoad = useCallback((map) => { mapRef.current = map }, [])

  const [markers, setMarkers] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState(null) // marker shown in InfoWindow

  useEffect(() => {
    api.get('/locations/hazards')
      .then(({ data }) => setMarkers(Array.isArray(data.data) ? data.data : []))
      .catch(() => setFetchError('Could not load hazard locations.'))
  }, [])

  const visible = typeFilter
    ? markers.filter((m) => m.hazard_type === typeFilter)
    : markers

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-red-500 text-sm">
        Failed to load Google Maps. Check your API key.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm">
        <h1 className="text-lg font-semibold text-gray-800">Road Hazard Map</h1>
        <span className="text-sm text-gray-400">{visible.length} hazard{visible.length !== 1 ? 's' : ''}</span>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">All Types</option>
            <option value="pothole">Pothole</option>
            <option value="faded_lane_marking">Faded Lane Marking</option>
            <option value="uneven_surface">Uneven Surface</option>
          </select>
        </div>

        {fetchError && (
          <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded-md">{fetchError}</span>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
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
              mapTypeControlOptions: { position: 3 /* TOP_RIGHT */ },
              fullscreenControlOptions: { position: 7 /* RIGHT_BOTTOM */ },
            }}
          >
            {visible.map((hazard) => (
              <Marker
                key={hazard.report_id}
                position={{ lat: hazard.latitude, lng: hazard.longitude }}
                icon={TYPE_ICON[hazard.hazard_type] ?? DEFAULT_ICON}
                title={hazard.hazard_type?.replace('_', ' ') ?? 'Hazard'}
                onClick={() => setSelected(hazard)}
              />
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: selected.latitude, lng: selected.longitude }}
                onCloseClick={() => setSelected(null)}
              >
                <div className="text-sm min-w-[180px]">
                  <p className="font-semibold text-gray-800 capitalize mb-1">
                    {selected.hazard_type?.replace(/_/g, ' ') ?? 'Unknown hazard'}
                  </p>
                  {selected.severity_score && (
                    <p className="text-gray-600">
                      Severity: <span className="font-medium">{SEVERITY_LABEL[selected.severity_score]} ({selected.severity_score}/5)</span>
                    </p>
                  )}
                  {selected.address_name && (
                    <p className="text-gray-500 text-xs mt-1">{selected.address_name}</p>
                  )}
                  {selected.state && (
                    <p className="text-gray-400 text-xs">{selected.state}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">Report #{selected.report_id}</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-4 bg-white rounded-xl shadow-md px-4 py-3 text-xs text-gray-600 space-y-1.5 z-10 pointer-events-none">
          <p className="font-semibold text-gray-700 mb-2">Legend</p>
          {LEGEND.map(({ colour, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${colour}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
