import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useAuth } from '../contexts/AuthContext'
import { createPlot, getPlotSummary, updateFarmerProfile, getAllPlots } from '../api/agrisetu'
import { autoDetectAndSwitchLanguage } from '../utils/langDetect'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function LocationMarker({ onLocationSelect }) {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { farmer, user, logout, updateFarmer } = useAuth()

  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState({})
  const [showFarmForm, setShowFarmForm] = useState(false)
  const [farmLoading, setFarmLoading] = useState(false)
  const [farmerPlots, setFarmerPlots] = useState([])
  const [activePlotSummary, setActivePlotSummary] = useState(null)

  const [farmData, setFarmData] = useState({
    center_lat: 20.0, center_lon: 73.8,
    district: '', state: '', country: 'India',
    current_crop: '', last_crop: '',
  })

  useEffect(() => {
    if (farmer?.id) loadFarmerPlots()
  }, [farmer?.id])

  const loadFarmerPlots = async () => {
    try {
      const res = await getAllPlots()
      const plots = (res.data || []).filter(p => p.farmer_id === farmer.id)
      setFarmerPlots(plots)
      if (plots.length > 0) {
        const summary = await getPlotSummary(plots[0].id)
        setActivePlotSummary(summary.data)
      }
    } catch (e) {
      console.error('Failed to load plots:', e)
    }
  }

  const handleSaveProfile = async () => {
    if (!edits || Object.keys(edits).length === 0) return
    try {
      await updateFarmerProfile(farmer.id, edits)
      updateFarmer(edits)
      setEditing(false)
      setEdits({})
    } catch (e) {
      console.error('Save failed:', e)
    }
  }

  const fetchReverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data?.address) {
        const district = data.address.state_district || data.address.county || data.address.city || ''
        const state = data.address.state || ''
        setFarmData(prev => ({
          ...prev,
          center_lat: lat, center_lon: lng,
          district: district || prev.district,
          state: state || prev.state,
        }))
      } else {
        setFarmData(prev => ({ ...prev, center_lat: lat, center_lon: lng }))
      }
    } catch {
      setFarmData(prev => ({ ...prev, center_lat: lat, center_lon: lng }))
    }
  }

  const handleFarmSubmit = async (e) => {
    e.preventDefault()
    setFarmLoading(true)
    try {
      const res = await createPlot({ ...farmData, farmer_id: farmer.id })
      localStorage.setItem('agrisetu_active_plot_id', res.data.id)
      setShowFarmForm(false)
      updateFarmer({ plot_id: res.data.id, district: farmData.district, state: farmData.state, crop: farmData.current_crop })
      await loadFarmerPlots()
    } catch (err) {
      console.error('Farm registration failed:', err)
    } finally {
      setFarmLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center px-4 md:px-10 py-3.5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined text-primary text-2xl">eco</span>
            <span className="text-xl font-display font-extrabold text-primary">AgriSetu</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40">
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
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-container text-on-primary hover:bg-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">dashboard</span>
              <span>{t('farmer_hub') || 'Dashboard'}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-10 py-8 space-y-6">
        {/* Profile Card */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40 p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-primary-container text-primary flex items-center justify-center text-2xl shadow-sm">
              <span className="material-symbols-outlined text-2xl">person</span>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-display font-bold text-on-surface">{farmer.name || 'Farmer'}</h1>
              <p className="text-sm text-on-surface-variant font-mono">{farmer.phone}</p>
              {user?.id && (
                <p className="text-xs text-on-surface-variant/60 font-mono mt-1">ID: {user.id.slice(0, 12)}...</p>
              )}
            </div>
            <button onClick={() => setEditing(!editing)}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface border border-outline-variant/40 hover:bg-surface-container transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">{editing ? 'close' : 'edit'}</span>
              {editing ? (t('cancel') || 'Cancel') : (t('edit_profile') || 'Edit Profile')}
            </button>
          </div>

          {/* Edit Form */}
          {editing && (
            <div className="space-y-3 border-t border-outline-variant/30 pt-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('name') || 'Name'}</label>
                <input type="text" value={edits.name ?? farmer.name ?? ''} onChange={(e) => { setEdits({ ...edits, name: e.target.value }); autoDetectAndSwitchLanguage(e.target.value) }}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary text-sm" />
              </div>
              <div>
                <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('language_preference') || 'Language'}</label>
                <select value={edits.language_pref ?? farmer.language_pref ?? 'hi'} onChange={(e) => setEdits({ ...edits, language_pref: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-none focus:border-primary text-sm">
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="en">English</option>
                </select>
              </div>
              <button onClick={handleSaveProfile}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">save</span>
                {t('save') || 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Farm Plots Section */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">agriculture</span>
              {t('farm_plots') || 'Farm Plots'}
            </h2>
            <button onClick={() => setShowFarmForm(!showFarmForm)}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-primary text-on-primary shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">{showFarmForm ? 'close' : 'add'}</span>
              {showFarmForm ? (t('cancel') || 'Cancel') : (t('register_plot') || 'Register New Plot')}
            </button>
          </div>

          {/* Existing Plots */}
          {farmerPlots.length > 0 && !showFarmForm && (
            <div className="space-y-3">
              {farmerPlots.map((plot) => (
                <div key={plot.id} className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-on-surface">{plot.current_crop || 'Farm Plot'}</p>
                      <p className="text-xs text-on-surface-variant font-mono mt-0.5">{plot.district}, {plot.state}</p>
                      <p className="text-xs text-on-surface-variant font-mono">Lat: {plot.center_lat?.toFixed(4)}, Lon: {plot.center_lon?.toFixed(4)}</p>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container">
                      {plot.id.slice(0, 8)}
                    </span>
                  </div>
                  {activePlotSummary && plot.id === farmerPlots[0]?.id && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-outline-variant/20">
                      <div className="text-center">
                        <span className="text-xs text-on-surface-variant">NDVI</span>
                        <p className="text-sm font-bold font-mono text-primary">{activePlotSummary.ndvi?.ndvi ?? '--'}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-on-surface-variant">Moisture</span>
                        <p className="text-sm font-bold font-mono text-primary">{activePlotSummary.soil?.moisture_pct?.toFixed(1) ?? '--'}%</p>
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-on-surface-variant">Temp</span>
                        <p className="text-sm font-bold font-mono text-primary">{activePlotSummary.weather?.temp_c ?? '--'}°C</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {farmerPlots.length === 0 && !showFarmForm && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-2xl">add_location</span>
              </div>
              <p className="text-sm text-on-surface-variant mb-1">No farm plots registered yet</p>
              <p className="text-xs text-on-surface-variant/60">Register your first plot to see real-time satellite and soil telemetry</p>
            </div>
          )}

          {/* New Plot Registration Form */}
          {showFarmForm && (
            <div className="border-t border-outline-variant/30 pt-4 space-y-4">
              {/* Map */}
              <div className="h-52 rounded-2xl overflow-hidden border border-outline-variant/40">
                <MapContainer center={[farmData.center_lat, farmData.center_lon]} zoom={5} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[farmData.center_lat, farmData.center_lon]} />
                  <LocationMarker onLocationSelect={(lat, lng) => fetchReverseGeocode(lat, lng)} />
                </MapContainer>
              </div>

              <form onSubmit={handleFarmSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.district') || 'District'}</label>
                    <input type="text" required value={farmData.district} onChange={(e) => { setFarmData({ ...farmData, district: e.target.value }); autoDetectAndSwitchLanguage(e.target.value) }}
                      className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary" placeholder="e.g. Nashik" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.state') || 'State'}</label>
                    <input type="text" required value={farmData.state} onChange={(e) => { setFarmData({ ...farmData, state: e.target.value }); autoDetectAndSwitchLanguage(e.target.value) }}
                      className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary" placeholder="e.g. Maharashtra" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.current_crop') || 'Current Crop'}</label>
                  <input type="text" required value={farmData.current_crop} onChange={(e) => { setFarmData({ ...farmData, current_crop: e.target.value }); autoDetectAndSwitchLanguage(e.target.value) }}
                    className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary" placeholder="e.g. Wheat, Rice, Soybean" />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{t('onboarding.last_crop') || 'Last Crop (Optional)'}</label>
                  <input type="text" value={farmData.last_crop} onChange={(e) => setFarmData({ ...farmData, last_crop: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:outline-none focus:border-primary" placeholder="e.g. Chickpea" />
                </div>
                <button type="submit" disabled={farmLoading}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  {farmLoading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">add_location</span>
                      {t('onboarding.submit') || 'Register Plot & Fetch Telemetry'}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant/40 p-6">
          <h2 className="text-sm font-mono font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-base">settings</span>
            {t('account') || 'Account'}
          </h2>
          <button onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-error/10 text-error font-semibold text-sm hover:bg-error/20 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">logout</span>
            {t('logout') || 'Sign Out'}
          </button>
        </div>
      </main>
    </div>
  )
}
