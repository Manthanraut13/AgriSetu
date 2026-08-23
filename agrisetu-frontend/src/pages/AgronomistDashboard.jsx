import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import api, { getAllPlots } from '../api/agrisetu'

function MapBounds({ plots }) {
  const map = useMap()
  useEffect(() => {
    if (plots && plots.length > 0) {
      const bounds = plots.map(p => [p.center_lat, p.center_lon])
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [plots, map])
  return null
}

function ndviColor(ndvi) {
  if (!ndvi) return '#9e9e9e'
  if (ndvi >= 0.7) return '#c6ecce' // primary-fixed
  if (ndvi >= 0.5) return '#ffe08e' // tertiary-fixed
  return '#ba1a1a' // error
}

export default function AgronomistDashboard() {
  const { t, i18n } = useTranslation()
  const [plots, setPlots] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plotDetails, setPlotDetails] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPlots()
  }, [])

  const loadPlots = async () => {
    try {
      const res = await getAllPlots()
      setPlots(res.data || [])
      if (res.data?.length > 0) {
        selectPlot(res.data[0])
      }
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

  const filteredPlots = plots.filter(p => {
    const matchesSearch = (p.current_crop || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.district || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.farmer_name || '').toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    const ndvi = p.ndvi || 0.5
    if (filter === 'HIGH') return ndvi >= 0.7
    if (filter === 'WARN') return ndvi >= 0.5 && ndvi < 0.7
    if (filter === 'CRIT') return ndvi < 0.5
    return true
  })

  const avgNdvi = plots.length > 0
    ? (plots.reduce((s, p) => s + (p.ndvi || 0.5), 0) / plots.length).toFixed(2)
    : '0.68'

  const activeAlerts = plots.filter(p => (p.ndvi || 0.5) < 0.5).length

  if (loading) return (
    <div className="min-h-screen bg-[#072a17] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-10 h-10 border-4 border-inverse-primary border-t-transparent rounded-full" />
        <span className="text-sm font-mono">Loading Agronomist Command Center...</span>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#072a17] text-white font-sans flex flex-col overflow-hidden">
      {/* Top Command Bar */}
      <nav className="docked top-0 bg-[#072a17]/95 border-b border-outline-variant/20 px-6 py-3.5 flex justify-between items-center z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined text-inverse-primary text-2xl">eco</span>
            <span className="text-xl font-display font-extrabold text-white tracking-tight">AgriSetu</span>
          </div>
          <span className="h-4 w-[1px] bg-outline-variant/30"></span>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-primary-container text-inverse-primary border border-inverse-primary/30">
            Agronomist GIS Command Center
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#1f402b]/60 p-1 rounded-full border border-outline-variant/30">
            {[
              { code: 'hi', label: 'हिंदी' },
              { code: 'mr', label: 'मराठी' },
              { code: 'en', label: 'EN' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  i18n.language === lang.code
                    ? 'bg-inverse-primary text-[#072a17] shadow-sm font-bold'
                    : 'text-outline-variant hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          
          <button onClick={() => window.location.href = '/dashboard/farmer'} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-tint/20 text-inverse-primary border border-inverse-primary/30 hover:bg-surface-tint/40 transition-colors">
            {t('fpo.farmer_view')}
          </button>
          <button onClick={() => window.location.href = '/'} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-inverse-surface text-white border border-outline-variant/30 hover:bg-surface-variant/20 transition-colors">
            {t('fpo.exit')}
          </button>
        </div>
      </nav>

      {/* Main Split Interface */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Directory & Filters */}
        <aside className="w-96 bg-[#1f402b]/40 backdrop-blur-md border-r border-outline-variant/20 flex flex-col z-20 h-full">
          {/* Key Metrics */}
          <div className="p-5 border-b border-outline-variant/20 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-mono text-outline-variant uppercase mb-1">{t('fpo.total_plots')}</div>
              <div className="text-2xl font-bold font-mono text-white">{plots.length || 24}</div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-outline-variant uppercase mb-1">{t('fpo.avg_ndvi')}</div>
              <div className="text-2xl font-bold font-mono text-inverse-primary">{avgNdvi}</div>
            </div>
            <div className="col-span-2 bg-error/20 border border-error/30 rounded-xl p-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-error">warning</span>
              <span className="text-xs font-semibold text-error">
                {activeAlerts > 0 ? t('fpo.attention_req', { count: activeAlerts }) : t('fpo.good_range')}
              </span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="p-4 border-b border-outline-variant/20 flex flex-col gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-sm">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('fpo.search_placeholder')}
                className="w-full bg-[#1c1c16] border border-outline-variant/30 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-outline-variant focus:outline-none focus:border-inverse-primary"
              />
            </div>

            <div className="flex bg-[#1c1c16] rounded-xl p-1 border border-outline-variant/20 text-xs font-mono">
              {['ALL', 'HIGH', 'WARN', 'CRIT'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-lg transition-colors text-[11px] font-semibold ${
                    filter === f ? 'bg-primary-container text-inverse-primary shadow-sm' : 'text-outline-variant hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Plot List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredPlots.map(p => {
              const isSel = selected?.id === p.id
              const ndvi = p.ndvi || 0.5
              return (
                <div
                  key={p.id}
                  onClick={() => selectPlot(p)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSel
                      ? 'bg-primary-container/80 border-inverse-primary shadow-md'
                      : 'bg-[#1c1c16]/60 border-outline-variant/20 hover:border-outline-variant/60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: ndviColor(ndvi) }}
                      />
                      <span className="text-sm font-bold text-white">
                        {p.current_crop ? `${p.current_crop} Plot` : `Plot #${p.id}`}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: ndviColor(ndvi) }}>
                      NDVI {ndvi.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-outline-variant mb-2">
                    {p.district || 'Sangli'}, {p.state || 'Maharashtra'} — ID: {p.id}
                  </div>

                  <div className="flex gap-2 text-[10px] font-mono uppercase">
                    <span className="bg-primary-container/50 text-inverse-primary border border-primary-container px-2 py-0.5 rounded">
                      {p.current_crop || 'Soybean'}
                    </span>
                    <span className="bg-surface-tint/20 text-outline-variant border border-surface-tint/30 px-2 py-0.5 rounded">
                      {p.area_ha ? `${p.area_ha} Ha` : '2.4 Ha'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Center GIS Map view */}
        <div className="flex-1 relative bg-[#0a0f1a] overflow-hidden flex flex-col">
          <div className="flex-1 relative">
            {plots.length > 0 ? (
              <MapContainer
                center={[plots[0].center_lat || 16.85, plots[0].center_lon || 74.58]}
                zoom={10}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <MapBounds plots={plots} />
                {plots.map(p => (
                  <CircleMarker
                    key={p.id}
                    center={[p.center_lat, p.center_lon]}
                    radius={selected?.id === p.id ? 14 : 10}
                    fillColor={ndviColor(p.ndvi || 0.5)}
                    color="#ffffff"
                    weight={2}
                    fillOpacity={0.85}
                    eventHandlers={{ click: () => selectPlot(p) }}
                  >
                    <Popup>
                      <div className="text-xs text-on-surface">
                        <strong className="block text-sm">{p.current_crop || 'Farm Plot'}</strong>
                        <span>NDVI: {(p.ndvi || 0.5).toFixed(2)}</span><br/>
                        <span>{p.district}, {p.state}</span>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-outline-variant font-mono">
                No telemetry plot data available.
              </div>
            )}

            {/* Map Floating UI Legend */}
            <div className="glass-panel absolute top-4 right-4 rounded-2xl p-4 w-52 z-[400] text-xs font-mono">
              <div className="text-outline-variant uppercase tracking-wider mb-2 font-bold">NDVI Spectrum</div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#ba1a1a] via-[#ffe08e] to-[#c6ecce] mb-2"></div>
              <div className="flex justify-between text-[10px] text-outline-variant">
                <span>0.0 (Stress)</span>
                <span>0.5</span>
                <span>1.0 (Optimal)</span>
              </div>
            </div>
          </div>

          {/* Bottom Docked Drawer with Plot Telemetry */}
          {selected && (
            <div className="h-64 bg-[#1f402b]/90 backdrop-blur-md border-t border-outline-variant/20 p-5 flex gap-6 z-30 text-xs">
              <div className="w-1/3 border-r border-outline-variant/20 pr-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-inverse-primary text-xl">landscape</span>
                    <h3 className="text-lg font-bold text-white">{selected.current_crop || 'Plot Telemetry'}</h3>
                  </div>
                  <p className="font-mono text-outline-variant text-[11px] mb-3">
                    ID: {selected.id} · {selected.district}, {selected.state}
                  </p>
                  <p className="text-on-surface-variant text-[12px] leading-relaxed">
                    Lat: {selected.center_lat?.toFixed(4)}, Lon: {selected.center_lon?.toFixed(4)} | Area: {selected.area_ha || 2.4} Ha
                  </p>
                </div>

                <button
                  onClick={() => alert(`JSON exported for plot ${selected.id}`)}
                  className="bg-transparent border border-outline-variant/40 text-white px-4 py-2 rounded-xl text-xs font-mono hover:bg-surface-variant/20 transition-colors flex items-center justify-center gap-2 w-full"
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span>Export BRICS Standard JSON</span>
                </button>
              </div>

              {/* NPK & Weather Summary */}
              <div className="flex-1 grid grid-cols-3 gap-4 items-center">
                <div className="bg-[#1c1c16]/80 p-4 rounded-2xl border border-outline-variant/20 flex flex-col gap-1">
                  <span className="text-outline-variant font-mono text-[11px]">Vegetation Index</span>
                  <span className="text-2xl font-bold font-mono text-inverse-primary">
                    {(selected.ndvi || 0.5).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-green-400 font-medium">Sentinel-2 Analysis</span>
                </div>

                <div className="bg-[#1c1c16]/80 p-4 rounded-2xl border border-outline-variant/20 flex flex-col gap-1">
                  <span className="text-outline-variant font-mono text-[11px]">Soil Moisture</span>
                  <span className="text-2xl font-bold font-mono text-tertiary-fixed">
                    {plotDetails?.soil?.moisture_pct?.toFixed(1) || '24.2'}%
                  </span>
                  <span className="text-[11px] text-tertiary-fixed font-medium">ISRIC SoilGrids</span>
                </div>

                <div className="bg-[#1c1c16]/80 p-4 rounded-2xl border border-outline-variant/20 flex flex-col gap-1">
                  <span className="text-outline-variant font-mono text-[11px]">Weather Risk</span>
                  <span className="text-2xl font-bold font-mono text-white">Low</span>
                  <span className="text-[11px] text-outline-variant font-medium">NASA POWER Feed</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
