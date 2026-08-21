import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import api, { getAllPlots } from '../api/agrisetu'

function MapBounds({ plots }) {
  const map = useMap()
  useEffect(() => {
    if (plots.length > 0) {
      const bounds = plots.map(p => [p.center_lat, p.center_lon])
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [plots, map])
  return null
}

function ndviColor(ndvi) {
  if (!ndvi) return '#9e9e9e'
  if (ndvi >= 0.7) return '#2d6a4f'
  if (ndvi >= 0.5) return '#52B788'
  if (ndvi >= 0.3) return '#f4a261'
  return '#e63946'
}

export default function AgronomistDashboard() {
  const [plots, setPlots] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plotDetails, setPlotDetails] = useState(null)

  useEffect(() => {
    loadPlots()
  }, [])

  const loadPlots = async () => {
    try {
      const res = await getAllPlots()
      setPlots(res.data || [])
    } catch (err) {
      console.error('Failed to load plots:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectPlot = async (plot) => {
    setSelected(plot)
    try {
      const res = await api.get(`/api/v1/onboarding/plot/${plot.id}`)
      setPlotDetails(res.data)
    } catch {
      setPlotDetails(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-between items-center" style={{ background: '#2d6a4f', color: 'white' }}>
        <div>
          <h1 className="text-lg font-bold">AgriSetu — FPO Dashboard</h1>
          <p className="text-xs opacity-75">Sangli District, Maharashtra</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.location.href = '/'}
            className="px-3 py-1 rounded text-xs bg-white bg-opacity-20">Home</button>
          <button onClick={() => window.location.href = '/dashboard/farmer'}
            className="px-3 py-1 rounded text-xs bg-white bg-opacity-20">Farmer View</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 p-4 overflow-y-auto border-r" style={{ background: '#F8F9FA' }}>
          <h3 className="font-semibold text-sm mb-3">Overview</h3>
          <div className="space-y-2 mb-6">
            <div className="p-3 rounded-lg bg-white shadow-sm">
              <p className="text-xs" style={{ color: '#6C757D' }}>Total Plots</p>
              <p className="text-2xl font-bold" style={{ color: '#2d6a4f' }}>{plots.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-white shadow-sm">
              <p className="text-xs" style={{ color: '#6C757D' }}>Avg NDVI</p>
              <p className="text-2xl font-bold" style={{ color: '#52B788' }}>
                {plots.length > 0 ? (plots.reduce((s, p) => s + (p.ndvi || 0.5), 0) / plots.length).toFixed(2) : '--'}
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-sm mb-3">Plots</h3>
          <div className="space-y-2">
            {plots.map(p => (
              <button key={p.id} onClick={() => selectPlot(p)}
                className="w-full text-left p-3 rounded-lg bg-white shadow-sm hover:shadow transition-all text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: ndviColor(p.ndvi || 0.5) }} />
                  <div>
                    <p className="font-medium">{p.district || p.state || 'Unknown'}</p>
                    <p className="text-xs" style={{ color: '#6C757D' }}>{p.current_crop || 'N/A'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer center={[20, 75]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapBounds plots={plots} />
            {plots.map(p => (
              <CircleMarker key={p.id}
                center={[p.center_lat, p.center_lon]}
                radius={12}
                fillColor={ndviColor(p.ndvi || 0.5)}
                fillOpacity={0.8}
                color="#fff"
                weight={2}
                eventHandlers={{ click: () => selectPlot(p) }}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{p.district || p.state}</p>
                    <p>Crop: {p.current_crop || 'N/A'}</p>
                    <p>NDVI: {(p.ndvi || 0.5).toFixed(2)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* NDVI Legend */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow p-3 z-[1000]">
            <p className="text-xs font-bold mb-2">NDVI</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#2d6a4f'}} /> Good (&gt;0.5)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#f4a261'}} /> Moderate (0.3-0.5)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#e63946'}} /> Low (&lt;0.3)</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{background:'#9e9e9e'}} /> No data</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="border-t p-4" style={{ background: 'white' }}>
          <div className="flex justify-between items-start max-w-4xl mx-auto">
            <div>
              <h3 className="font-bold text-lg">{selected.district || selected.state || 'Plot'}</h3>
              <p className="text-sm" style={{ color: '#6C757D' }}>
                {selected.center_lat?.toFixed(4)}, {selected.center_lon?.toFixed(4)} | {selected.country}
              </p>
              <p className="text-sm mt-1">Crop: <strong>{selected.current_crop || 'N/A'}</strong> | Previous: {selected.last_crop || 'N/A'}</p>
            </div>
            <button onClick={() => { setSelected(null); setPlotDetails(null) }}
              className="text-gray-400 text-xl">&times;</button>
          </div>

          {plotDetails && (
            <div className="max-w-4xl mx-auto mt-3 grid grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg" style={{ background: '#F8F9FA' }}>
                <p className="text-xs" style={{ color: '#6C757D' }}>NDVI</p>
                <p className="font-bold text-lg">{plotDetails.ndvi?.ndvi?.toFixed(2) ?? '--'}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#F8F9FA' }}>
                <p className="text-xs" style={{ color: '#6C757D' }}>Soil pH</p>
                <p className="font-bold text-lg">{plotDetails.soil?.pH?.toFixed(1) ?? '--'}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#F8F9FA' }}>
                <p className="text-xs" style={{ color: '#6C757D' }}>Temperature</p>
                <p className="font-bold text-lg">{plotDetails.weather?.temp_c ?? '--'}°C</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#F8F9FA' }}>
                <p className="text-xs" style={{ color: '#6C757D' }}>Humidity</p>
                <p className="font-bold text-lg">{plotDetails.weather?.humidity_pct ?? '--'}%</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
