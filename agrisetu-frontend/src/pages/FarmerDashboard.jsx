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
  const [isRegistered, setIsRegistered] = useState(false)
  const [farmerInfo, setFarmerInfo] = useState(null)

  const handleLogout = () => {
    localStorage.removeItem('agrisetu_farmer')
    localStorage.removeItem('agrisetu_active_plot_id')
    setIsRegistered(false)
    setFarmerInfo(null)
    setPlot(null)
  }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const savedFarmer = JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}')
      const registered = Boolean(savedFarmer && savedFarmer.is_registered && savedFarmer.name)
      setIsRegistered(registered)
      setFarmerInfo(savedFarmer)

      if (!registered) {
        setPlot(null)
        setLoading(false)
        return
      }

      const activePlotId = localStorage.getItem('agrisetu_active_plot_id')
      const plotsRes = await getAllPlots()
      const allPlots = plotsRes.data || []
      
      let targetPlot = null
      if (activePlotId) {
        targetPlot = allPlots.find(p => p.id === activePlotId) || allPlots[allPlots.length - 1]
      } else {
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
      }
    } catch (err) {
      console.error('Dashboard load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const ndviValue = plot?.ndvi?.ndvi ?? 0.72

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        <span className="text-sm font-mono text-on-surface-variant">Loading AgriSetu Telemetry...</span>
      </div>
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
    <div className="bg-background text-on-background font-sans min-h-screen pb-16 selection:bg-secondary-container">
      {/* Navbar */}
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-40">
        <div className="flex justify-between items-center px-4 md:px-10 py-3.5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined text-primary text-2xl">eco</span>
            <span className="text-xl font-display font-extrabold text-primary">AgriSetu</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold ml-2">
              Farmer Hub
            </span>
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
            {isRegistered && (
              <button
                onClick={handleLogout}
                title="Logout & Clear Registration"
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-outline-variant/30 text-on-surface hover:bg-error/20 hover:text-error transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                <span>Reset / Logout</span>
              </button>
            )}
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
        {!isRegistered ? (
          /* Unregistered Standby State */
          <section className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/40 shadow-md text-center max-w-3xl mx-auto my-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center mx-auto text-3xl shadow-sm">
              <span className="material-symbols-outlined text-4xl">app_registration</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface">
                {t('onboarding.not_registered_banner') || 'Registration Required'}
              </h1>
              <p className="text-sm text-on-surface-variant max-w-xl mx-auto leading-relaxed">
                Welcome to AgriSetu! To view real-time Sentinel-2 satellite vitality, ISRIC soil nutrient telemetry, NASA POWER weather alerts, and AI crop advisory, please register your farm plot.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-2">
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">satellite_alt</span>
                <h3 className="font-bold text-sm text-on-surface">Satellite Vitality</h3>
                <p className="text-xs text-on-surface-variant">Live Sentinel-2 NDVI telemetry for your crop field.</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                <span className="material-symbols-outlined text-secondary text-2xl">science</span>
                <h3 className="font-bold text-sm text-on-surface">Soil Health Telemetry</h3>
                <p className="text-xs text-on-surface-variant">Real-time Nitrogen, Phosphorus, Potassium & pH levels.</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                <span className="material-symbols-outlined text-tertiary text-2xl">smart_toy</span>
                <h3 className="font-bold text-sm text-on-surface">AI Multilingual Advisory</h3>
                <p className="text-xs text-on-surface-variant">Personalized advisory in Hindi, Marathi & English.</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => window.location.href = '/onboarding'}
                className="px-8 py-3.5 bg-primary text-on-primary font-bold text-sm rounded-2xl shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">how_to_reg</span>
                <span>{t('onboarding.register_button') || 'Register Your Farm Plot (1 Min)'}</span>
              </button>
            </div>
          </section>
        ) : (
          /* Registered Farmer Dashboard */
          <>
            {/* Hero Card */}
            <section className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 ambient-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-fixed/20 to-transparent rounded-bl-full pointer-events-none"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface mb-1">
                    {t('welcome_farmer')}, {farmerInfo?.name || (i18n.language === 'mr' ? 'शेतकरी' : i18n.language === 'hi' ? 'किसान' : 'Farmer')}
                  </h1>
                  <div className="flex items-center gap-1.5 text-on-surface-variant opacity-85 text-sm">
                    <span className="material-symbols-outlined text-base text-primary">location_on</span>
                    <span>
                      {farmerInfo?.district || (i18n.language === 'mr' ? 'शेतजमीन' : i18n.language === 'hi' ? 'खेत' : 'Farm Plot')} — {farmerInfo?.crop || (i18n.language === 'mr' ? 'पीक' : i18n.language === 'hi' ? 'फसल' : 'Crop')}
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
          </div>
        </section>

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
        </section>

        {/* Dynamic Accordion Components */}
        {showAdvisory && advisory && (
          <section className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/40 shadow-sm">
            <AdvisoryCard advisory={advisory} />
          </section>
        )}

        {showDisease && (
          <section className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/40 shadow-sm">
            <DiseaseUploader />
          </section>
        )}

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
          </>
        )}
      </main>

      {/* Floating AI Chat Assistant */}
      <ChatWidget plotId={plotId} />
    </div>
  )
}
