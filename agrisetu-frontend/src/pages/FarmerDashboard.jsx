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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get first available plot
      const plotsRes = await getAllPlots()
      if (plotsRes.data && plotsRes.data.length > 0) {
        const firstPlot = plotsRes.data[0]
        setPlotId(firstPlot.id)

        const summaryRes = await getPlotSummary(firstPlot.id)
        setPlot(summaryRes.data)

        const advisoryRes = await getAdvisory(firstPlot.id)
        setAdvisory(advisoryRes.data)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getNdviStatus = () => {
    if (!plot?.ndvi?.ndvi) return { color: 'var(--neutral-mid)', label: 'No Data', bg: 'var(--neutral-light)' }
    const ndvi = plot.ndvi.ndvi
    if (ndvi >= 0.5) return { color: 'var(--green-primary)', label: t('dashboard.healthy'), bg: 'var(--green-bg)' }
    if (ndvi >= 0.3) return { color: 'var(--yellow-alert)', label: t('dashboard.caution'), bg: 'var(--yellow-bg)' }
    return { color: 'var(--red-danger)', label: t('dashboard.alert'), bg: 'var(--red-bg)' }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const ndviStatus = getNdviStatus()

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--green-primary)' }}>
          {t('app_name')} {t('dashboard.crop_health')}
        </h1>
        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'hi' ? 'en' : 'hi')}
          className="px-3 py-1 rounded text-sm border"
        >
          {i18n.language === 'hi' ? 'EN' : 'हिंदी'}
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Crop Health */}
        <div className="rounded-xl p-4 shadow-sm" style={{ background: ndviStatus.bg }}>
          <div className="text-2xl mb-1">🌱</div>
          <p className="text-sm font-medium" style={{ color: 'var(--neutral-mid)' }}>{t('dashboard.crop_health')}</p>
          <p className="font-bold text-lg" style={{ color: ndviStatus.color }}>{ndviStatus.label}</p>
          {plot?.ndvi?.ndvi && <p className="text-xs">NDVI: {plot.ndvi.ndvi.toFixed(2)}</p>}
        </div>

        {/* Water Today */}
        <div className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--neutral-light)' }}>
          <div className="text-2xl mb-1">💧</div>
          <p className="text-sm font-medium" style={{ color: 'var(--neutral-mid)' }}>{t('dashboard.water_today')}</p>
          <p className="font-bold text-lg" style={{ color: 'var(--blue-data)' }}>
            {plot?.weather?.temp_c ? `${plot.weather.temp_c}°C` : '--'}
          </p>
        </div>

        {/* Weather Risk */}
        <div className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--neutral-light)' }}>
          <div className="text-2xl mb-1">🌦</div>
          <p className="text-sm font-medium" style={{ color: 'var(--neutral-mid)' }}>{t('dashboard.weather_risk')}</p>
          <p className="font-bold text-lg" style={{ color: 'var(--blue-data)' }}>
            {plot?.weather?.humidity_pct ? `${plot.weather.humidity_pct}%` : '--'}
          </p>
        </div>

        {/* Disease Alert */}
        <div className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--green-bg)' }}>
          <div className="text-2xl mb-1">🐛</div>
          <p className="text-sm font-medium" style={{ color: 'var(--neutral-mid)' }}>{t('dashboard.disease_alert')}</p>
          <p className="font-bold text-lg" style={{ color: 'var(--green-primary)' }}>None</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setShowAdvisory(true); setShowDisease(false) }}
          className="flex-1 py-3 rounded-xl text-white font-semibold shadow-sm"
          style={{ background: 'var(--green-primary)' }}
        >
          {t('dashboard.get_advisory')}
        </button>
        <button
          onClick={() => { setShowDisease(true); setShowAdvisory(false) }}
          className="flex-1 py-3 rounded-xl font-semibold border shadow-sm"
          style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
        >
          {t('dashboard.diagnose_disease')}
        </button>
      </div>

      {/* Advisory Section */}
      {showAdvisory && advisory && (
        <div className="mb-6">
          <AdvisoryCard advisory={advisory} />
        </div>
      )}

      {/* Disease Section */}
      {showDisease && (
        <div className="mb-6">
          <DiseaseUploader />
        </div>
      )}

      {/* Soil Summary */}
      {plot?.soil && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-2">Soil Data</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div><span className="text-gray-500">N:</span> {plot.soil.N ?? '--'}</div>
            <div><span className="text-gray-500">P:</span> {plot.soil.P ?? '--'}</div>
            <div><span className="text-gray-500">K:</span> {plot.soil.K ?? '--'}</div>
            <div><span className="text-gray-500">pH:</span> {plot.soil.pH?.toFixed(1) ?? '--'}</div>
            <div><span className="text-gray-500">Moisture:</span> {plot.soil.moisture_pct?.toFixed(1) ?? '--'}%</div>
          </div>
        </div>
      )}

      {/* Chat Widget */}
      <ChatWidget plotId={plotId} />
    </div>
  )
}
