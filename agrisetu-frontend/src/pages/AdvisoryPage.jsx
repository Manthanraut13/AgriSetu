import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAdvisory, refreshPlotData, regenerateAdvisory } from '../api/agrisetu'

export default function AdvisoryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { farmer, plots } = useAuth()
  
  const [selectedPlot, setSelectedPlot] = useState(plots[0]?.id || null)
  const [advisory, setAdvisory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const fetchAdvisory = async (plotId) => {
    if (!plotId) return
    setLoading(true)
    try {
      const res = await getAdvisory(plotId)
      setAdvisory(res.data)
    } catch (e) {
      console.error('Error fetching advisory:', e)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRefresh = async () => {
    if (!selectedPlot) return
    setRefreshing(true)
    try {
      await refreshPlotData(selectedPlot)
      await regenerateAdvisory(selectedPlot)
      await fetchAdvisory(selectedPlot)
    } finally {
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    if (selectedPlot) {
      fetchAdvisory(selectedPlot)
    }
  }, [selectedPlot])
  
  if (!farmer) {
    navigate('/login')
    return null
  }
  
  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center px-4 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard/farmer')}>
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
            <button onClick={() => navigate('/dashboard/farmer')}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-sm align-middle mr-1">dashboard</span>
              {t('farmer_hub')}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-8">
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/30 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-bold text-primary">
              <span className="material-symbols-outlined text-3xl align-middle mr-2 text-primary">agriculture</span>
              {t('advisory')}
            </h1>
            
            <div className="flex items-center gap-2">
              <select
                value={selectedPlot || ''}
                onChange={(e) => setSelectedPlot(e.target.value)}
                className="px-3 py-2 rounded-full text-sm font-semibold bg-surface-container-low border border-outline-variant/40 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">{t('select_plot')}</option>
                {plots.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.district || p.id.slice(0, 8)} — {p.current_crop || ''}
                  </option>
                ))}
              </select>
              <button onClick={handleRefresh} disabled={refreshing || !selectedPlot}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-primary text-on-primary shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {refreshing ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span> {t('refreshing')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm align-middle">refresh</span>
                    {t('refresh_data')}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {loading && (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl animate-spin mb-3">progress</span>
              <p>{t('loading')}</p>
            </div>
          )}
          
          {!loading && advisory && (
            <div className="space-y-6">
              {/* Soil Data */}
              {advisory.soil && (
                <div className="bg-surface-container-low rounded-2xl p-4">
                  <h3 className="font-display font-bold text-primary mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">grass</span>
                    {t('soil_analysis')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: 'N', value: advisory.soil.N, unit: 'mg/kg' },
                      { label: 'P', value: advisory.soil.P, unit: 'mg/kg' },
                      { label: 'K', value: advisory.soil.K, unit: 'mg/kg' },
                      { label: 'pH', value: advisory.soil.pH, unit: '' },
                      { label: 'Moisture', value: advisory.soil.moisture_pct, unit: '%' },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-3 bg-surface-container/50 rounded-xl">
                        <p className="text-xs text-on-surface-variant">{item.label}</p>
                        <p className="text-lg font-bold text-primary">{item.value}{item.unit ? ' ' + item.unit : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Weather Data */}
              {advisory.weather && (
                <div className="bg-surface-container-low rounded-2xl p-4">
                  <h3 className="font-display font-bold text-primary mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">partly_cloudy_day</span>
                    {t('weather')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-surface-container/50 rounded-xl">
                      <p className="text-xs text-on-surface-variant">{t('temperature')}</p>
                      <p className="text-lg font-bold text-primary">{advisory.weather.temp_c}°C</p>
                    </div>
                    <div className="text-center p-3 bg-surface-container/50 rounded-xl">
                      <p className="text-xs text-on-surface-variant">{t('humidity')}</p>
                      <p className="text-lg font-bold text-primary">{advisory.weather.humidity_pct}%</p>
                    </div>
                    <div className="text-center p-3 bg-surface-container/50 rounded-xl">
                      <p className="text-xs text-on-surface-variant">{t('rainfall')}</p>
                      <p className="text-lg font-bold text-primary">{advisory.weather.rainfall_mm}mm</p>
                    </div>
                    <div className="text-center p-3 bg-surface-container/50 rounded-xl">
                      <p className="text-xs text-on-surface-variant">{t('wind')}</p>
                      <p className="text-lg font-bold text-primary">{advisory.weather.wind_speed_ms}m/s</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* NDVI Data */}
              {advisory.ndvi && (
                <div className="bg-surface-container-low rounded-2xl p-4">
                  <h3 className="font-display font-bold text-primary mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">satellite_alt</span>
                    {t('satellite_data')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-surface-container/50 rounded-xl">
                      <p className="text-xs text-on-surface-variant">NDVI</p>
                      <p className="text-lg font-bold text-primary">{advisory.ndvi.ndvi}</p>
                    </div>
                    <div className="text-center p-3 bg-surface-container/50 rounded-xl">
                      <p className="text-xs text-on-surface-variant">NDMI</p>
                      <p className="text-lg font-bold text-primary">{advisory.ndvi.ndmi}</p>
                    </div>
                    <div className="text-center p-3 bg-surface-container/50 rounded-xl">
                      <p className="text-xs text-on-surface-variant">{t('image_date')}</p>
                      <p className="text-sm font-bold text-primary">{advisory.ndvi.image_date || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Crop Recommendations */}
              {advisory.recommendations && (
                <div className="space-y-4">
                  <h3 className="font-display font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">recommend</span>
                    {t('crop_recommendations')}
                  </h3>
                  {advisory.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-surface-container-low rounded-2xl p-4 border-l-4 border-secondary">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-lg text-primary">{rec.crop}</h4>
                          <p className="text-sm text-on-surface-variant">{t('confidence')}: {Math.round(rec.confidence * 100)}%</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm"><span className="font-semibold text-on-surface-variant">{t('sowing_window')}:</span> {rec.sowing_window}</p>
                        <p className="text-sm"><span className="font-semibold text-on-surface-variant">{t('irrigation')}:</span> {t('every_x_days', { days: rec.irrigation_days })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Regenerative Practices */}
              {advisory.regenerative_practices && (
                <div className="bg-surface-container-low rounded-2xl p-4">
                  <h3 className="font-display font-bold text-primary mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">eco</span>
                    {t('regenerative_practices')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {advisory.regenerative_practices.map((p, idx) => (
                      <div key={idx} className="p-3 bg-surface-container/50 rounded-xl">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                          <div>
                            <p className="font-semibold text-primary">{p.practice || p.title}</p>
                            <p className="text-xs text-on-surface-variant mt-1">{p.description || p.details}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Risk Alerts */}
              {advisory.risk_alerts && advisory.risk_alerts.length > 0 && (
                <div className="bg-error-container/20 rounded-2xl p-4 border border-error/30">
                  <h3 className="font-display font-bold text-error mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">warning</span>
                    {t('risk_alerts')}
                  </h3>
                  <ul className="space-y-2">
                    {advisory.risk_alerts.map((alert, idx) => (
                      <li key={idx} className="text-sm text-error flex items-start gap-2">
                        <span className="material-symbols-outlined text-sm">•</span>
                        <span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {!loading && !selectedPlot && (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-3">agriculture</span>
              <p>{t('select_plot')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}