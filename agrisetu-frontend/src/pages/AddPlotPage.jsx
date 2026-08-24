import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createPlot } from '../api/agrisetu'

export default function AddPlotPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { farmer } = useAuth()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    district: '',
    state: 'Maharashtra',
    country: 'India',
    current_crop: '',
    last_crop: '',
    area_ha: '',
    geometry: null,
  })
  
  // Map picker state
  const [mapLat, setMapLat] = useState(21.0939597521461)
  const [mapLon, setMapLon] = useState(79.1006961464882)
  const [geometry, setGeometry] = useState(null)
  
  if (!farmer) {
    navigate('/login')
    return null
  }
  
  const crops = [
    { value: 'rice', label: 'Rice' },
    { value: 'wheat', label: 'Wheat' },
    { value: 'maize', label: 'Maize' },
    { value: 'cotton', label: 'Cotton' },
    { value: 'sugarcane', label: 'Sugarcane' },
    { value: 'soybean', label: 'Soybean' },
    { value: 'groundnut', label: 'Groundnut' },
    { value: 'chickpea', label: 'Chickpea' },
    { value: 'pigeonpeas', label: 'Pigeon Peas' },
    { value: 'mungbean', label: 'Mung Bean' },
    { value: 'blackgram', label: 'Black Gram' },
    { value: 'lentil', label: 'Lentil' },
    { value: 'paddy', label: 'Paddy' },
    { value: 'barley', label: 'Barley' },
    { value: 'sorghum', label: 'Sorghum' },
    { value: 'millet', label: 'Millet' },
  ]
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleNext = () => setStep(step + 1)
  const handleBack = () => setStep(step - 1)
  
  const handleMapClick = (lat, lon) => {
    setMapLat(lat)
    setMapLon(lon)
    setGeometry({ center: { lat, lon } })
  }
  
  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    
    try {
      const plotData = {
        farmer_id: farmer.id,
        district: formData.district,
        state: formData.state,
        country: formData.country,
        current_crop: formData.current_crop,
        last_crop: formData.last_crop,
        area_ha: formData.area_ha ? parseFloat(formData.area_ha) : undefined,
        center_lat: geometry?.center?.lat || mapLat,
        center_lon: geometry?.center?.lon || mapLon,
        geometry: formData.geometry,
      }
      
      await createPlot(plotData)
      navigate('/dashboard/farmer')
    } catch (e) {
      setError('Failed to create plot. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const isStep1Valid = !!geometry
  const isStep2Valid = !!formData.current_crop && !!formData.district
  
  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center px-4 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard/farmer')}>
            <span className="material-symbols-outlined text-primary text-3xl">eco</span>
            <span className="text-2xl font-display font-extrabold text-primary tracking-tight">{t('app_name')}</span>
          </div>
          
          <button onClick={() => navigate('/dashboard/farmer')}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-sm align-middle mr-1">arrow_back</span>
            {t('back')}
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-8">
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/30 p-6 mb-8">
          <h1 className="text-2xl font-display font-bold mb-4 text-primary">
            {t('register_plot')}
          </h1>
          
          {error && (
            <div className="p-3 rounded-2xl bg-error-container/40 border border-error/30 mb-4">
              <p className="font-semibold text-error text-sm">{error}</p>
            </div>
          )}
          
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`flex items-center gap-2 text-sm ${step >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>
                <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                <span>{t('location')}</span>
              </div>
              <div className="flex-1 h-1 bg-outline-variant/20 rounded-full"></div>
              <div className={`flex items-center gap-2 text-sm ${step >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>
                <span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-outline-variant'}`}></span>
                <span>{t('crop_selection')}</span>
              </div>
            </div>
          </div>
          
          {step === 1 && (
            <div className="space-y-6">
              <div className="w-full h-64 rounded-2xl bg-surface-container-low border border-outline-variant/30 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    const lat = 21.0939597521461 + (Math.random() - 0.5) * 0.01
                    const lon = 79.1006961464882 + (Math.random() - 0.5) * 0.01
                    handleMapClick(lat, lon)
                  }}>
                  <span className="material-symbols-outlined text-primary text-6xl">location_on</span>
                </div>
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-xs p-2 rounded">
                  {mapLat.toFixed(6)}, {mapLon.toFixed(6)}
                </div>
                {geometry && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-6xl animate-pulse">check_circle</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-on-surface-variant text-center">
                {geometry ? t('location_selected') : t('click_to_select_location')}
              </p>
              
              <div className="flex gap-3">
                <button onClick={handleBack}
                  className="px-6 py-3 rounded-full border border-outline-variant/40 text-on-surface hover:bg-surface-container transition-colors">
                  {t('back')}
                </button>
                <button onClick={handleNext} disabled={!isStep1Valid}
                  className="flex-1 py-3 rounded-full bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                  {t('next')}
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('region')}</label>
                  <select name="state" value={formData.state} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('district')}</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder={t('enter_district')}
                    className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('current_crop')}</label>
                <select
                  name="current_crop"
                  value={formData.current_crop}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">{t('select_crop')}</option>
                  {crops.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('previous_crop')}</label>
                <select name="last_crop" value={formData.last_crop} onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
                  <option value="">{t('none')}</option>
                  <option value="paddy">Paddy</option>
                  <option value="wheat">Wheat</option>
                  <option value="maize">Maize</option>
                  <option value="cotton">Cotton</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">{t('area_ha')}</label>
                <input
                  type="number"
                  name="area_ha"
                  value={formData.area_ha}
                  onChange={handleChange}
                  placeholder="e.g., 2.5"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button onClick={handleBack}
                  className="px-6 py-3 rounded-full border border-outline-variant/40 text-on-surface hover:bg-surface-container transition-colors">
                  {t('back')}
                </button>
                <button onClick={handleSubmit} disabled={loading || !isStep2Valid}
                  className="flex-1 py-3 rounded-full bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      {t('registering')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-lg align-middle mr-1">check</span>
                      {t('register_plot')}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}