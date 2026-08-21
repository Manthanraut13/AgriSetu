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
    if (!ndvi) return { color: '#6C757D', label: 'No Data', bg: '#F8F9FA', icon: '❓' }
    if (ndvi >= 0.5) return { color: '#2d6a4f', label: t('dashboard.healthy'), bg: '#d8f3dc', icon: '🟢' }
    if (ndvi >= 0.3) return { color: '#f4a261', label: t('dashboard.caution'), bg: '#fff3e0', icon: '🟡' }
    return { color: '#e63946', label: t('dashboard.alert'), bg: '#ffe8e8', icon: '🔴' }
  })()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: '#52B788', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold" style={{ color: '#2d6a4f' }}>🌾 {t('app_name')}</h1>
        <div className="flex gap-2">
          <button onClick={() => i18n.changeLanguage(i18n.language === 'hi' ? 'en' : 'hi')}
            className="px-3 py-1 rounded text-sm border">
            {i18n.language === 'hi' ? 'EN' : 'हिंदी'}
          </button>
          <button onClick={() => window.location.href = '/dashboard/agronomist'}
            className="px-3 py-1 rounded text-sm border">
            FPO View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl p-4 shadow-sm" style={{ background: ndviStatus.bg }}>
          <div className="text-2xl mb-1">{ndviStatus.icon}</div>
          <p className="text-xs" style={{ color: '#6C757D' }}>{t('dashboard.crop_health')}</p>
          <p className="font-bold" style={{ color: ndviStatus.color }}>{ndviStatus.label}</p>
          {plot?.ndvi?.ndvi && <p className="text-xs mt-1">NDVI: {plot.ndvi.ndvi.toFixed(2)}</p>}
        </div>
        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#F8F9FA' }}>
          <div className="text-2xl mb-1">💧</div>
          <p className="text-xs" style={{ color: '#6C757D' }}>{t('dashboard.water_today')}</p>
          <p className="font-bold" style={{ color: '#1B4F72' }}>
            {plot?.weather?.temp_c ? `${plot.weather.temp_c}°C` : '--'}
          </p>
          {plot?.weather?.humidity_pct && <p className="text-xs">Humidity: {plot.weather.humidity_pct}%</p>}
        </div>
        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#F8F9FA' }}>
          <div className="text-2xl mb-1">🌦</div>
          <p className="text-xs" style={{ color: '#6C757D' }}>{t('dashboard.weather_risk')}</p>
          <p className="font-bold" style={{ color: '#1B4F72' }}>
            {plot?.weather?.rainfall_mm ? `${plot.weather.rainfall_mm} mm` : 'Low'}
          </p>
          {plot?.weather?.description && <p className="text-xs">{plot.weather.description}</p>}
        </div>
        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#d8f3dc' }}>
          <div className="text-2xl mb-1">🐛</div>
          <p className="text-xs" style={{ color: '#6C757D' }}>{t('dashboard.disease_alert')}</p>
          <p className="font-bold" style={{ color: '#2d6a4f' }}>None</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={() => { setShowAdvisory(!showAdvisory); setShowDisease(false) }}
          className="flex-1 py-3 rounded-xl text-white font-semibold shadow-sm text-sm"
          style={{ background: '#2d6a4f' }}>🌾 {t('dashboard.get_advisory')}</button>
        <button onClick={() => { setShowDisease(!showDisease); setShowAdvisory(false) }}
          className="flex-1 py-3 rounded-xl font-semibold border shadow-sm text-sm"
          style={{ borderColor: '#2d6a4f', color: '#2d6a4f' }}>📷 {t('dashboard.diagnose_disease')}</button>
      </div>

      {showAdvisory && advisory && <div className="mb-6"><AdvisoryCard advisory={advisory} /></div>}
      {showDisease && <div className="mb-6"><DiseaseUploader /></div>}

      {plot?.soil && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-3 text-sm">Soil Data</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 rounded" style={{ background: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#6C757D' }}>Nitrogen</p>
              <p className="font-bold">{plot.soil.N ?? '--'}</p>
            </div>
            <div className="text-center p-2 rounded" style={{ background: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#6C757D' }}>Phosphorus</p>
              <p className="font-bold">{plot.soil.P ?? '--'}</p>
            </div>
            <div className="text-center p-2 rounded" style={{ background: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#6C757D' }}>Potassium</p>
              <p className="font-bold">{plot.soil.K ?? '--'}</p>
            </div>
            <div className="text-center p-2 rounded" style={{ background: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#6C757D' }}>pH</p>
              <p className="font-bold">{plot.soil.pH?.toFixed(1) ?? '--'}</p>
            </div>
            <div className="text-center p-2 rounded" style={{ background: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#6C757D' }}>Moisture</p>
              <p className="font-bold">{plot.soil.moisture_pct?.toFixed(1) ?? '--'}%</p>
            </div>
            <div className="text-center p-2 rounded" style={{ background: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#6C757D' }}>Source</p>
              <p className="font-bold text-xs">{plot.soil.source ?? '--'}</p>
            </div>
          </div>
        </div>
      )}

      {plot?.plot && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-2 text-sm">Farm Details</h3>
          <div className="text-sm space-y-1">
            <p>📍 Lat: {plot.plot.center_lat?.toFixed(4)}, Lon: {plot.plot.center_lon?.toFixed(4)}</p>
            <p>🌾 Crop: {plot.plot.current_crop || 'N/A'} | Previous: {plot.plot.last_crop || 'N/A'}</p>
            <p>🗺 {plot.plot.district || ''}, {plot.plot.state || ''}, {plot.plot.country || ''}</p>
            {plot.plot.area_ha && <p>📐 Area: {plot.plot.area_ha} hectares</p>}
          </div>
        </div>
      )}

      <ChatWidget plotId={plotId} />
    </div>
  )
}
