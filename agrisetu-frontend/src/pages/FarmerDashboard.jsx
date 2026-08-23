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

  const ndviValue = plot?.ndvi?.ndvi ?? 0.72

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        <span className="text-sm font-mono text-on-surface-variant">Loading AgriSetu Telemetry...</span>
      </div>
    </div>
  )

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
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'hi' ? 'en' : 'hi')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-outline-variant/50 hover:bg-surface-container transition-colors"
            >
              {i18n.language === 'hi' ? 'EN' : 'हिंदी'}
            </button>
            <button
              onClick={() => window.location.href = '/dashboard/agronomist'}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-container text-on-primary hover:bg-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              <span>FPO View</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Content Container */}
      <main className="px-4 md:px-10 max-w-7xl mx-auto pt-6 space-y-6">
        {/* Hero Card */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 ambient-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-fixed/20 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-on-surface mb-1">
                Namaste, {plot?.plot?.farmer_name || 'Rajesh Ji'}
              </h1>
              <div className="flex items-center gap-1.5 text-on-surface-variant opacity-85 text-sm">
                <span className="material-symbols-outlined text-base text-primary">location_on</span>
                <span>
                  {plot?.plot?.district || 'Nashik'}, {plot?.plot?.state || 'Maharashtra'} — {plot?.plot?.current_crop || 'Soybean'} ({plot?.plot?.area_ha || '2.4'} Ha)
                </span>
              </div>
            </div>

            {/* Weather Pill */}
            <div className="flex items-center gap-3 bg-surface p-3.5 rounded-2xl border border-outline-variant/40 shadow-sm">
              <span className="material-symbols-outlined text-tertiary-container text-4xl">partly_cloudy_day</span>
              <div>
                <div className="text-xl font-bold text-on-surface leading-none">
                  {plot?.weather?.temp_c ? `${plot.weather.temp_c}°C` : '28°C'}
                </div>
                <div className="text-xs text-on-surface-variant opacity-80 mt-1">
                  Humidity {plot?.weather?.humidity_pct ? `${plot.weather.humidity_pct}%` : '65%'}
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
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Crop Vitality</div>
              <div className="text-base font-bold text-on-surface">Optimal Health</div>
              <div className="text-xs text-secondary font-medium">NDVI Satellite</div>
            </div>
          </div>

          {/* Soil Hydration */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex items-start gap-4 hover:translate-y-[-2px] transition-transform">
            <div className="p-3 bg-secondary-fixed/40 rounded-2xl text-secondary">
              <span className="material-symbols-outlined">water_drop</span>
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Soil Hydration</div>
              <div className="text-base font-bold text-on-surface mb-0.5">Sufficient Moisture</div>
              <div className="text-xs font-mono text-on-surface-variant opacity-75">
                Moisture: {plot?.soil?.moisture_pct?.toFixed(1) || '22.4'}%
              </div>
            </div>
          </div>

          {/* Weather Risk */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex items-start gap-4 hover:translate-y-[-2px] transition-transform">
            <div className="p-3 bg-tertiary-fixed/40 rounded-2xl text-tertiary">
              <span className="material-symbols-outlined">umbrella</span>
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Weather Risk</div>
              <div className="text-base font-bold text-on-surface mb-0.5">Low Weather Risk</div>
              <div className="text-xs text-on-surface-variant opacity-75">
                {plot?.weather?.description || 'Rain expected in 5 days'}
              </div>
            </div>
          </div>

          {/* Plant Protection */}
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/40 shadow-sm flex items-start gap-4 hover:translate-y-[-2px] transition-transform">
            <div className="p-3 bg-primary-fixed/40 rounded-2xl text-primary">
              <span className="material-symbols-outlined">shield</span>
            </div>
            <div>
              <div className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Plant Protection</div>
              <div className="text-base font-bold text-on-surface">Zero Active Alerts</div>
              <div className="text-xs text-primary font-medium">Scan recommended</div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => { setShowAdvisory(!showAdvisory); setShowDisease(false) }}
            className="bg-primary text-on-primary hover:bg-primary-container transition-all rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm font-semibold text-sm h-14"
          >
            <span className="material-symbols-outlined">smart_toy</span>
            <span>Request AI Crop Advisory</span>
          </button>
          
          <button
            onClick={() => { setShowDisease(!showDisease); setShowAdvisory(false) }}
            className="bg-surface-container-lowest border-2 border-primary text-primary hover:bg-surface-container transition-all rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm font-semibold text-sm h-14"
          >
            <span className="material-symbols-outlined">camera_alt</span>
            <span>Diagnose Plant Disease</span>
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
              Soil Nutrient Telemetry
            </h2>
            <span className="text-xs text-on-surface-variant font-mono">Source: ISRIC SoilGrids</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">Nitrogen</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.N ?? 140} <span className="text-xs opacity-60">kg/ha</span>
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">Phosphorus</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.P ?? 45} <span className="text-xs opacity-60">kg/ha</span>
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">Potassium</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.K ?? 190} <span className="text-xs opacity-60">kg/ha</span>
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">Soil pH</span>
              <span className="text-lg font-bold font-mono text-primary mt-1">
                {plot?.soil?.pH?.toFixed(1) ?? '6.5'}
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
                  WhatsApp Bot Integration
                </span>
                <span className="text-xs font-mono text-emerald-300">Twilio Webhook Channel</span>
              </div>
              <h3 className="text-xl font-bold font-display text-white">AgriSetu WhatsApp Farmer Bot</h3>
              <p className="text-xs text-emerald-100/80 max-w-xl">
                Get crop advisories, disease scanning, and answers directly on WhatsApp. Send a leaf photo or question anytime!
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
                <span>Open WhatsApp (+1 415 523 8886)</span>
              </a>
              <button
                onClick={() => alert('WhatsApp Webhook Endpoint:\nPOST http://127.0.0.1:8000/api/v1/whatsapp/webhook')}
                className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 px-4 py-2.5 rounded-xl text-xs font-mono transition-colors"
              >
                View Webhook URL
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
