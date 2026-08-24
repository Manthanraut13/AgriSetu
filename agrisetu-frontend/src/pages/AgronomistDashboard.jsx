import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import api, { getAllPlots } from '../api/agrisetu'
import { autoDetectAndSwitchLanguage } from '../utils/langDetect'

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
  if (ndvi >= 0.7) return '#072a17'
  if (ndvi >= 0.5) return '#45664b'
  if (ndvi >= 0.3) return '#cea72c'
  return '#ba1a1a'
}

export default function AgronomistDashboard() {
  const { t, i18n } = useTranslation()
  const [plots, setPlots] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plotDetails, setPlotDetails] = useState(null)

  useEffect(() => { loadPlots() }, [])

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-4 rounded-full border-primary border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="p-4 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined text-primary text-3xl">eco</span>
            <span className="text-2xl font-display font-extrabold text-primary tracking-tight">{t('app_name')}</span>
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
                onChange={(e) => {
                  setSearch(e.target.value)
                  autoDetectAndSwitchLanguage(e.target.value)
                }}
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
            <button onClick={() => window.location.href = '/dashboard/farmer'}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-sm align-middle mr-1">person</span>
              {t('fpo.farmer_view')}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 p-4 overflow-y-auto border-r border-outline-variant/30 bg-surface-container-low">
          <h3 className="font-display font-bold mb-4 text-primary text-sm uppercase tracking-wide">Overview</h3>
          <div className="space-y-3 mb-6">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
              <p className="text-xs font-semibold text-on-surface-variant">{t('fpo.total_plots')}</p>
              <p className="text-3xl font-bold text-primary">{plots.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
              <p className="text-xs font-semibold text-on-surface-variant">{t('fpo.avg_ndvi')}</p>
              <p className="text-3xl font-bold text-primary">
                {plots.length > 0 ? (plots.reduce((s, p) => s + (p.ndvi || 0.5), 0) / plots.length).toFixed(2) : '--'}
              </p>
            </div>
          </div>

          <h3 className="font-display font-bold mb-3 text-primary text-sm uppercase tracking-wide">Plots</h3>
          <div className="space-y-2">
            {plots.map(p => (
              <button key={p.id} onClick={() => selectPlot(p)}
                className="w-full text-left p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:shadow-sm transition-all text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ndviColor(p.ndvi || 0.5) }} />
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface truncate">{p.district || p.state || 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant truncate">{p.current_crop || 'N/A'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative">
          <MapContainer center={[20, 75]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapBounds plots={plots} />
            {plots.map(p => (
              <CircleMarker key={p.id}
                center={[p.center_lat, p.center_lon]} radius={12}
                fillColor={ndviColor(p.ndvi || 0.5)} fillOpacity={0.8}
                color="#fff" weight={2}
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
          <div className="absolute bottom-4 right-4 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 p-4 z-[1000]">
            <p className="text-xs font-bold mb-2 text-primary uppercase tracking-wide">{t('fpo.ndvi_legend')}</p>
            <div className="space-y-1.5 text-xs">
              {[
                { color: '#072a17', label: t('fpo.good') },
                { color: '#cea72c', label: t('fpo.moderate') },
                { color: '#ba1a1a', label: t('fpo.low') },
                { color: '#9e9e9e', label: t('fpo.no_data') },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ background: item.color }} />
                  <span className="text-on-surface-variant">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="border-t border-outline-variant/30 p-4 bg-surface-container-lowest">
          <div className="flex justify-between items-start max-w-4xl mx-auto">
            <div>
              <h3 className="font-display font-bold text-lg text-primary">{selected.district || selected.state || 'Plot'}</h3>
              <p className="text-sm text-on-surface-variant">{selected.center_lat?.toFixed(4)}, {selected.center_lon?.toFixed(4)} | {selected.country}</p>
              <p className="text-sm mt-1 text-on-surface">{t('dashboard.current_crop')}: <strong>{selected.current_crop || 'N/A'}</strong> | {t('dashboard.previous_crop')}: {selected.last_crop || 'N/A'}</p>
            </div>
            <button onClick={() => { setSelected(null); setPlotDetails(null) }} className="text-on-surface-variant hover:text-error">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {plotDetails && (
            <div className="max-w-4xl mx-auto mt-4 grid grid-cols-4 gap-4 text-sm">
              {[
                { label: 'NDVI', value: plotDetails.ndvi?.ndvi?.toFixed(2) ?? '--' },
                { label: t('dashboard.ph'), value: plotDetails.soil?.pH?.toFixed(1) ?? '--' },
                { label: t('dashboard.temperature'), value: plotDetails.weather?.temp_c ?? '--' },
                { label: t('dashboard.humidity'), value: plotDetails.weather?.humidity_pct ?? '--' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                  <p className="text-xs font-semibold text-on-surface-variant">{item.label}</p>
                  <p className="font-bold text-lg text-on-surface">{item.value}{item.label === t('dashboard.humidity') ? '%' : item.label === t('dashboard.temperature') ? '°C' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
