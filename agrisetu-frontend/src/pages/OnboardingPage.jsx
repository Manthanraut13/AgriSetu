import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { createFarmer, createPlot } from '../api/agrisetu'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function LocationMarker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [farmerData, setFarmerData] = useState({
    name: '', phone: '', language_pref: i18n.language, country_code: 'IN'
  })
  const [plotData, setPlotData] = useState({
    center_lat: 20.0, center_lon: 73.8,
    district: '', state: '', country: 'India',
    current_crop: '', last_crop: ''
  })
  const [farmerId, setFarmerId] = useState(null)

  const handleFarmerSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = { ...farmerData, language_pref: i18n.language }
      const res = await createFarmer(payload)
      setFarmerId(res.data.id)
      const existing = JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}')
      localStorage.setItem('agrisetu_farmer', JSON.stringify({
        ...existing,
        ...res.data,
        name: farmerData.name,
        phone: farmerData.phone,
        is_registered: true
      }))
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create farmer profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePlotSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await createPlot({ ...plotData, farmer_id: farmerId })
      localStorage.setItem('agrisetu_active_plot_id', res.data.id)
      const existing = JSON.parse(localStorage.getItem('agrisetu_farmer') || '{}')
      localStorage.setItem('agrisetu_farmer', JSON.stringify({
        ...existing,
        district: plotData.district,
        state: plotData.state,
        crop: plotData.current_crop,
        plot_id: res.data.id,
        is_registered: true
      }))
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create plot')
    } finally {
      setLoading(false)
    }
  }

  const fetchReverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.address) {
        const district = data.address.state_district || data.address.county || data.address.city || data.address.town || ''
        const state = data.address.state || ''
        const country = data.address.country || 'India'
        setPlotData(prev => ({
          ...prev,
          center_lat: lat,
          center_lon: lng,
          district: district || prev.district,
          state: state || prev.state,
          country: country || prev.country
        }))
      } else {
        setPlotData(prev => ({ ...prev, center_lat: lat, center_lon: lng }))
      }
    } catch {
      setPlotData(prev => ({ ...prev, center_lat: lat, center_lon: lng }))
    }
  }

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchReverseGeocode(pos.coords.latitude, pos.coords.longitude)
          setLoading(false)
        },
        (err) => {
          console.warn('Geolocation error:', err)
          setLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }

  const handleLocationSelect = (lat, lng) => {
    fetchReverseGeocode(lat, lng)
  }

  return (
    <div className="bg-background text-on-background min-h-screen pb-16 font-sans">
      {/* Header with language switcher */}
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 z-40 mb-6">
        <div className="flex justify-between items-center px-4 md:px-10 py-3.5 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined text-primary text-2xl">eco</span>
            <span className="text-xl font-display font-extrabold text-primary">AgriSetu</span>
          </div>

          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40">
            {[
              { code: 'hi', label: 'हिंदी' },
              { code: 'mr', label: 'मराठी' },
              { code: 'en', label: 'EN' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
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
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4">
        {/* Prominent Language Switcher Tab Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-surface-container-lowest border border-outline-variant/40 rounded-2xl px-4 py-3 mb-6 shadow-sm gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-base">translate</span>
            <span>
              {i18n.language === 'mr' ? 'भाषा निवडा / Language:' : i18n.language === 'hi' ? 'भाषा चुनें / Language:' : 'Select Language:'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
            {[
              { code: 'hi', label: '🇮🇳 हिंदी', name: 'Hindi' },
              { code: 'mr', label: '🚩 मराठी', name: 'Marathi' },
              { code: 'en', label: '🌐 English', name: 'English' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  i18n.language === lang.code
                    ? 'bg-primary text-on-primary shadow-sm font-bold scale-[1.02]'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-display font-bold mb-2 text-primary text-center">
          {t('onboarding.title')}
        </h1>
        <p className="text-sm text-on-surface-variant text-center mb-6">
          {t('onboarding.subtitle')}
        </p>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  step >= s ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 transition-colors ${step > s ? 'bg-primary' : 'bg-surface-variant'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 mb-4 rounded-xl text-white bg-error text-sm font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Farmer Info */}
        {step === 1 && (
          <form onSubmit={handleFarmerSubmit} className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-on-surface">{t('onboarding.name_label')} & {t('onboarding.phone_label')}</h2>
            <div>
              <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                {t('onboarding.name_label')} *
              </label>
              <input
                type="text" required
                placeholder={t('onboarding.name_placeholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary text-sm"
                value={farmerData.name}
                onChange={(e) => setFarmerData({ ...farmerData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                {t('onboarding.phone_label')} *
              </label>
              <input
                type="tel" required
                placeholder={t('onboarding.phone_placeholder')}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary text-sm"
                value={farmerData.phone}
                onChange={(e) => setFarmerData({ ...farmerData, phone: e.target.value })}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {loading ? t('onboarding.loading') : `${t('next')} →`}
            </button>
          </form>
        )}

        {/* Step 2: Plot Registration */}
        {step === 2 && (
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 shadow-sm space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-on-surface">{t('onboarding.subtitle')}</h2>
              <button
                type="button"
                onClick={useCurrentLocation}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-container text-on-primary hover:bg-primary transition-colors flex items-center gap-1"
              >
                <span>📍</span>
                <span>{t('onboarding.use_location')}</span>
              </button>
            </div>

            {/* Map */}
            <div className="h-56 rounded-2xl overflow-hidden border border-outline-variant/40 relative">
              <MapContainer center={[20.0, 73.8]} zoom={5} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[plotData.center_lat, plotData.center_lon]} />
                <LocationMarker onLocationSelect={handleLocationSelect} />
              </MapContainer>
            </div>

            <form onSubmit={handlePlotSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.district')}</label>
                  <input
                    type="text" required
                    placeholder={t('onboarding.district_placeholder')}
                    className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary"
                    value={plotData.district}
                    onChange={(e) => setPlotData({ ...plotData, district: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.state')}</label>
                  <input
                    type="text" required
                    placeholder={t('onboarding.state_placeholder')}
                    className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary"
                    value={plotData.state}
                    onChange={(e) => setPlotData({ ...plotData, state: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.current_crop')}</label>
                <input
                  type="text" required
                  placeholder={t('onboarding.current_crop_placeholder')}
                  className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary"
                  value={plotData.current_crop}
                  onChange={(e) => setPlotData({ ...plotData, current_crop: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.last_crop')}</label>
                <input
                  type="text"
                  placeholder={t('onboarding.last_crop_placeholder')}
                  className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary"
                  value={plotData.last_crop}
                  onChange={(e) => setPlotData({ ...plotData, last_crop: e.target.value })}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
              >
                {loading ? t('onboarding.loading') : t('onboarding.submit')}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/40 shadow-sm text-center">
            <div className="w-16 h-16 bg-secondary-container text-primary rounded-full flex items-center justify-center mx-auto text-3xl mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-2 text-on-surface">
              {t('onboarding.success')}
            </h2>
            <p className="text-sm text-on-surface-variant mb-6">
              {t('onboarding.success_sub')}
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/farmer'}
              className="px-8 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {t('onboarding.go_to_dashboard')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}