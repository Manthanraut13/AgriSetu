import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DiseaseUploader from '../components/DiseaseUploader'
import AdvisoryCard from '../components/AdvisoryCard'
import ChatWidget from '../components/ChatWidget'
import { getPlotSummary, getAdvisory, getAllPlots } from '../api/agrisetu'

export default function FarmerDashboard() {
  const { t, i18n } = useTranslation()
  const [plot, setPlot] = useState(null)
  const [advisory, setAdvisory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDisease, setShowDisease] = useState(false)
  const [showAdvisory, setShowAdvisory] = useState(false)
  const [plotId, setPlotId] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const plotsRes = await getAllPlots()
      if (plotsRes.data?.length > 0) {
        const p = plotsRes.data[0]
        setPlotId(p.id)
        const summaryRes = await getPlotSummary(p.id)
        setPlot(summaryRes.data)
        try {
          const advRes = await getAdvisory(p.id)
          setAdvisory(advRes.data)
        } catch { /* advisory not yet generated */ }
      }
    } catch (err) {
      console.error('Dashboard load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const ndviStatus = (() => {
    const ndvi = plot?.ndvi?.ndvi
    if (!ndvi) return { color: '#6C757D', label: 'No Data', bg: '#F8F9FA', icon: 'help' }
    if (ndvi >= 0.5) return { color: 'text-primary', label: t('dashboard.healthy'), bg: 'bg-primary-fixed-dim/30', icon: 'check_circle' }
    if (ndvi >= 0.3) return { color: 'text-tertiary', label: t('dashboard.caution'), bg: 'bg-tertiary-fixed/30', icon: 'warning' }
    return { color: 'text-error', label: t('dashboard.alert'), bg: 'bg-error-container/30', icon: 'error' }
  })()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-4 rounded-full border-primary border-t-transparent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center px-4 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined text-primary text-3xl">eco</span>
            <span className="text-2xl font-display font-extrabold text-primary tracking-tight">{t('app_name')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-outline-variant/40">
              {[{ code: 'hi', label: 'हिंदी' }, { code: 'mr', label: 'मराठी' }, { code: 'en', label: 'EN' }].map((lang) => (
                <button key={lang.code} onClick={() => i18n.changeLanguage(lang.code)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    i18n.language === lang.code
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}>
                  {lang.label}
                </button>
              ))}
            </div>
            <button onClick={() => window.location.href = '/dashboard/agronomist'}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-sm align-middle mr-1">map</span>
              {t('agronomist_hub')}
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-extrabold text-primary">{t('dashboard.crop_health')}</h1>
          <p className="text-sm text-on-surface-variant">{plot?.plot?.district || 'Farm'} — {plot?.plot?.current_crop || 'N/A'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className={`rounded-3xl p-5 shadow-sm border border-outline-variant/30 bg-surface-container-lowest ${ndviStatus.bg}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-2xl text-primary">satellite_alt</span>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('dashboard.crop_health')}</p>
            </div>
            <p className={`text-2xl font-bold ${ndviStatus.color}`}>{ndviStatus.label}</p>
            {plot?.ndvi?.ndvi && <p className="text-xs text-on-surface-variant mt-1">NDVI: {plot.ndvi.ndvi.toFixed(2)}</p>}
          </div>

          <div className="rounded-3xl p-5 shadow-sm border border-outline-variant/30 bg-surface-container-lowest">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-2xl text-primary">water_drop</span>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('dashboard.water_today')}</p>
            </div>
            <p className="text-2xl font-bold text-on-surface">{plot?.weather?.temp_c ? `${plot.weather.temp_c}°C` : '--'}</p>
            {plot?.weather?.humidity_pct && <p className="text-xs text-on-surface-variant mt-1">{t('dashboard.humidity')}: {plot.weather.humidity_pct}%</p>}
          </div>

          <div className="rounded-3xl p-5 shadow-sm border border-outline-variant/30 bg-surface-container-lowest">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-2xl text-tertiary">weather_snowy</span>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('dashboard.weather_risk')}</p>
            </div>
            <p className="text-2xl font-bold text-on-surface">{plot?.weather?.rainfall_mm ? `${plot.weather.rainfall_mm} mm` : 'Low'}</p>
            {plot?.weather?.description && <p className="text-xs text-on-surface-variant mt-1">{plot.weather.description}</p>}
          </div>

          <div className="rounded-3xl p-5 shadow-sm border border-outline-variant/30 bg-primary-fixed-dim/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-2xl text-primary">bug_report</span>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('dashboard.disease_alert')}</p>
            </div>
            <p className="text-2xl font-bold text-primary">{t('dashboard.no_disease')}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <button onClick={() => { setShowAdvisory(!showAdvisory); setShowDisease(false) }}
            className="flex-1 py-3.5 rounded-full text-on-primary font-semibold shadow-sm text-sm bg-primary flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-lg">eco</span>
            {t('dashboard.get_advisory')}
          </button>
          <button onClick={() => { setShowDisease(!showDisease); setShowAdvisory(false) }}
            className="flex-1 py-3.5 rounded-full font-semibold text-sm bg-surface-container-low text-on-surface border border-outline-variant/40 flex items-center justify-center gap-2 hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-lg">photo_camera</span>
            {t('dashboard.diagnose_disease')}
          </button>
        </div>

        {showAdvisory && advisory && <div className="mb-8"><AdvisoryCard advisory={advisory} /></div>}
        {showDisease && <div className="mb-8"><DiseaseUploader /></div>}

        {plot?.soil && (
          <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/30 p-6 mb-8">
            <h3 className="font-display font-bold mb-4 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">landscape</span>
              {t('dashboard.soil_data')}
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { label: t('dashboard.nitrogen'), value: plot.soil.N ?? '--', icon: 'N' },
                { label: t('dashboard.phosphorus'), value: plot.soil.P ?? '--', icon: 'P' },
                { label: t('dashboard.potassium'), value: plot.soil.K ?? '--', icon: 'K' },
                { label: t('dashboard.ph'), value: plot.soil.pH?.toFixed(1) ?? '--', icon: 'pH' },
                { label: t('dashboard.moisture'), value: plot.soil.moisture_pct?.toFixed(1) ?? '--', icon: '%' },
                { label: t('dashboard.source'), value: plot.soil.source ?? '--', icon: '📡' },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                  <p className="text-xs font-semibold text-on-surface-variant">{item.label}</p>
                  <p className="text-lg font-bold text-on-surface mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {plot?.plot && (
          <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/30 p-6 mb-8">
            <h3 className="font-display font-bold mb-3 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">agriculture</span>
              {t('dashboard.farm_details')}
            </h3>
            <div className="text-sm space-y-2 text-on-surface-variant">
              <p>📍 Lat: {plot.plot.center_lat?.toFixed(4)}, Lon: {plot.plot.center_lon?.toFixed(4)}</p>
              <p>🌾 {t('dashboard.current_crop')}: {plot.plot.current_crop || 'N/A'} | {t('dashboard.previous_crop')}: {plot.plot.last_crop || 'N/A'}</p>
              <p>🗺 {plot.plot.district || ''}, {plot.plot.state || ''}, {plot.plot.country || ''}</p>
              {plot.plot.area_ha && <p>📐 {t('dashboard.area')}: {plot.plot.area_ha} {t('dashboard.hectares')}</p>}
            </div>
          </div>
        )}
      </div>

      <ChatWidget plotId={plotId} />
    </div>
  )
}
