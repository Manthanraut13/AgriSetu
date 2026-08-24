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
      const savedFarmer = JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}')
      const isRegistered = Boolean(savedFarmer && (savedFarmer.is_registered || savedFarmer.name))
      const activePlotId = localStorage.getItem('agrisetu_active_plot_id')
      
      const plotsRes = await getAllPlots()
      const allPlots = plotsRes.data || []
      
      let targetPlot = null
      if (isRegistered && activePlotId) {
        targetPlot = allPlots.find(p => p.id === activePlotId) || allPlots[allPlots.length - 1]
      } else if (isRegistered) {
        targetPlot = allPlots[allPlots.length - 1]
      }
      
      if (targetPlot) {
        setPlotId(targetPlot.id)
        const summaryRes = await getPlotSummary(targetPlot.id)
        const summaryData = summaryRes.data || {}
        if (summaryData.plot && savedFarmer.name) {
          summaryData.plot.farmer_name = savedFarmer.name
          summaryData.plot.district = savedFarmer.district || summaryData.plot.district
          summaryData.plot.state = savedFarmer.state || summaryData.plot.state
          summaryData.plot.current_crop = savedFarmer.crop || summaryData.plot.current_crop
        }
        setPlot(summaryData)
        try {
          const advRes = await getAdvisory(targetPlot.id)
          setAdvisory(advRes.data)
        } catch { /* advisory not yet generated */ }
      } else if (allPlots.length > 0) {
        setPlotId(allPlots[0].id)
        const summaryRes = await getPlotSummary(allPlots[0].id)
        setPlot(summaryRes.data || {})
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

  const handleRequestAdvisory = async () => {
    if (!showAdvisory && plotId) {
      setLoading(true)
      try {
        const advRes = await getAdvisory(plotId)
        setAdvisory(advRes.data)
      } catch (e) {
        console.error('Advisory fetch failed:', e)
      } finally {
        setLoading(false)
      }
    }
    setShowAdvisory(!showAdvisory)
    setShowDisease(false)
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center px-4 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined text-primary text-3xl">eco</span>
            <span className="text-2xl font-display font-extrabold text-primary tracking-tight">{t('app_name')}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40">
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
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => window.location.href = '/dashboard/agronomist'}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-container text-on-primary hover:bg-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              <span>{t('agronomist_hub')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Content Container */}
      <main className="px-4 md:px-10 max-w-7xl mx-auto pt-6 space-y-6">
        {/* Unregistered Banner */}
        {!(JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}').name) && (
          <div className="bg-primary-container/30 border border-primary/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-on-surface">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">app_registration</span>
              <span className="text-xs sm:text-sm font-medium">{t('onboarding.not_registered_banner')}</span>
            </div>
            <button
              onClick={() => window.location.href = '/onboarding'}
              className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-all flex-shrink-0"
            >
              {t('onboarding.register_button')}
            </button>
          </div>
        )}

        {/* Hero Card */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 ambient-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-fixed/20 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface mb-1">
                {t('welcome_farmer')}, {JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}').name || (i18n.language === 'mr' ? 'शेतकरी' : i18n.language === 'hi' ? 'किसान' : 'Farmer')}
              </h1>
              <div className="flex items-center gap-1.5 text-on-surface-variant opacity-85 text-sm">
                <span className="material-symbols-outlined text-base text-primary">location_on</span>
                <span>
                  {JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}').district || (i18n.language === 'mr' ? 'शेतजमीन' : i18n.language === 'hi' ? 'खेत' : 'Farm Plot')} — {JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}').crop || (i18n.language === 'mr' ? 'पीक' : i18n.language === 'hi' ? 'फसल' : 'Crop')}
                </span>
              </div>
            </div>

            {/* Weather Pill */}
            <div className="flex items-center gap-3 bg-surface p-3.5 rounded-2xl border border-outline-variant/40 shadow-sm">
              <span className="material-symbols-outlined text-tertiary-container text-4xl">partly_cloudy_day</span>
              <div>
                <div className="text-xl font-bold text-on-surface leading-none">
                  {plot?.weather?.temp_c != null ? `${plot.weather.temp_c}°C` : '--'}
                </div>
                <div className="text-xs text-on-surface-variant opacity-80 mt-1">
                  {t('dashboard.humidity')} {plot?.weather?.humidity_pct != null ? `${plot.weather.humidity_pct}%` : '--'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Telemetry Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Crop Vitality */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex items-center gap-4 hover:translate-y-[-2px] transition-transform">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-surface-variant stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3.5"></path>
                <path className="text-primary stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={`${Math.round(ndviValue * 100)}, 100`} strokeWidth="3.5"></path>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono text-sm text-primary font-bold">
                {ndviValue.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('dashboard.crop_health')}</div>
              <div className="text-base font-bold text-on-surface">{t('dashboard.healthy')}</div>
              <div className="text-xs text-secondary font-medium">NDVI Satellite</div>
            </div>
            <p className={`text-2xl font-bold ${ndviStatus.color}`}>{ndviStatus.label}</p>
            {plot?.ndvi?.ndvi && <p className="text-xs text-on-surface-variant mt-1">NDVI: {plot.ndvi.ndvi.toFixed(2)}</p>}
          </div>

          {/* Soil Hydration */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex items-start gap-4 hover:translate-y-[-2px] transition-transform">
            <div className="p-3 bg-secondary-fixed/40 rounded-2xl text-secondary">
              <span className="material-symbols-outlined">water_drop</span>
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('dashboard.water_today')}</div>
              <div className="text-base font-bold text-on-surface mb-0.5">{plot?.soil?.moisture_pct != null ? `${plot.soil.moisture_pct.toFixed(1)}%` : t('dashboard.healthy')}</div>
              <div className="text-xs font-mono text-on-surface-variant opacity-75">
                {t('dashboard.moisture')}: {plot?.soil?.moisture_pct?.toFixed(1) || '--'}%
              </div>
            </div>
            <p className="text-2xl font-bold text-on-surface">{plot?.weather?.temp_c ? `${plot.weather.temp_c}°C` : '--'}</p>
            {plot?.weather?.humidity_pct && <p className="text-xs text-on-surface-variant mt-1">{t('dashboard.humidity')}: {plot.weather.humidity_pct}%</p>}
          </div>

          {/* Weather Risk */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex items-start gap-4 hover:translate-y-[-2px] transition-transform">
            <div className="p-3 bg-tertiary-fixed/40 rounded-2xl text-tertiary">
              <span className="material-symbols-outlined">umbrella</span>
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('dashboard.weather_risk')}</div>
              <div className="text-base font-bold text-on-surface mb-0.5">{plot?.weather?.rainfall_mm ? `${plot.weather.rainfall_mm} mm` : t('dashboard.healthy')}</div>
              <div className="text-xs text-on-surface-variant opacity-75">
                {plot?.weather?.description || '--'}
              </div>
            </div>
            <p className="text-2xl font-bold text-on-surface">{plot?.weather?.rainfall_mm ? `${plot.weather.rainfall_mm} mm` : 'Low'}</p>
            {plot?.weather?.description && <p className="text-xs text-on-surface-variant mt-1">{plot.weather.description}</p>}
          </div>

          {/* Plant Protection */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex items-start gap-4 hover:translate-y-[-2px] transition-transform">
            <div className="p-3 bg-primary-fixed/40 rounded-2xl text-primary">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('dashboard.disease_alert')}</div>
              <div className="text-base font-bold text-on-surface">{t('dashboard.no_disease')}</div>
            </div>
            <p className="text-2xl font-bold text-primary">{t('dashboard.no_disease')}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleRequestAdvisory}
            className="bg-primary text-on-primary hover:bg-primary-container transition-all rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm font-semibold text-sm h-14"
          >
            <span className="material-symbols-outlined">smart_toy</span>
            <span>{t('dashboard.get_advisory')}</span>
          </button>
          
          <button
            onClick={() => { setShowDisease(!showDisease); setShowAdvisory(false) }}
            className="bg-surface-container-lowest border-2 border-primary text-primary hover:bg-surface-container transition-all rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm font-semibold text-sm h-14"
          >
            <span className="material-symbols-outlined">camera_alt</span>
            <span>{t('dashboard.diagnose_disease')}</span>
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

        {/* Soil Nutrient Telemetry Panel */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">science</span>
              {t('dashboard.soil_data')}
            </h2>
            <span className="text-xs text-on-surface-variant font-mono">Source: ISRIC SoilGrids</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">{t('dashboard.nitrogen')}</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.N ?? '--'} <span className="text-xs opacity-60">kg/ha</span>
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">{t('dashboard.phosphorus')}</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.P ?? '--'} <span className="text-xs opacity-60">kg/ha</span>
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">{t('dashboard.potassium')}</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.K ?? '--'} <span className="text-xs opacity-60">kg/ha</span>
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">{t('dashboard.ph')}</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.pH?.toFixed(1) ?? '--'}
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">Moisture</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.moisture_pct?.toFixed(1) ?? '22.4'}%
              </span>
            </div>
          </div>
        </section>

        {/* WhatsApp Bot Advisory Channel */}
        <section className="bg-gradient-to-r from-emerald-900 to-green-950 text-white rounded-3xl p-6 shadow-md border border-emerald-700/40 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-700/60 text-emerald-200 text-[11px] font-mono font-bold uppercase">
                  {t('whatsapp.badge')}
                </span>
                <span className="text-xs font-mono text-emerald-300">{t('whatsapp.channel')}</span>
              </div>
              <h3 className="text-xl font-bold font-display text-white">{t('whatsapp.title')}</h3>
              <p className="text-xs text-emerald-100/80 max-w-xl">
                {t('whatsapp.desc')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://wa.me/14155238886?text=join%20something"
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>{t('whatsapp.open_btn')}</span>
              </a>
              <button
                onClick={() => alert('WhatsApp Webhook Endpoint:\nPOST http://127.0.0.1:8000/api/v1/whatsapp/webhook')}
                className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 px-4 py-2.5 rounded-xl text-xs font-mono transition-colors"
              >
                {t('whatsapp.view_webhook')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Floating AI Chat Assistant */}
      <ChatWidget plotId={plotId} />
    </div>
  )
}
