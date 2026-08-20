import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { createFarmer, createPlot } from '../api/agrisetu'

// Fix for default marker icon
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
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Form data
  const [farmerData, setFarmerData] = useState({
    name: '', phone: '', language_pref: 'hi', country_code: 'IN'
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
      const res = await createFarmer(farmerData)
      setFarmerId(res.data.id)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create farmer')
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
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create plot')
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSelect = (lat, lng) => {
    setPlotData({ ...plotData, center_lat: lat, center_lon: lng })
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--green-primary)' }}>
        {t('onboarding.title')}
      </h1>

      {/* Step Indicator */}
      <div className="flex justify-center mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s ? 'text-white' : 'bg-gray-200 text-gray-500'
              }`}
              style={step >= s ? { background: 'var(--green-primary)' } : {}}
            >
              {s}
            </div>
            {s < 3 && <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg text-white" style={{ background: 'var(--red-danger)' }}>
          {error}
        </div>
      )}

      {/* Step 1: Farmer Info */}
      {step === 1 && (
        <form onSubmit={handleFarmerSubmit} className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Farmer Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text" required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                value={farmerData.name}
                onChange={(e) => setFarmerData({ ...farmerData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel" required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                value={farmerData.phone}
                onChange={(e) => setFarmerData({ ...farmerData, phone: e.target.value })}
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold"
              style={{ background: loading ? '#ccc' : 'var(--green-primary)' }}
            >
              {loading ? 'Loading...' : 'Next →'}
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Plot Registration */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">{t('onboarding.subtitle')}</h2>

          {/* Map */}
          <div className="h-64 rounded-lg overflow-hidden mb-4 border">
            <MapContainer center={[20.0, 73.8]} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[plotData.center_lat, plotData.center_lon]} />
              <LocationMarker onLocationSelect={handleLocationSelect} />
            </MapContainer>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Lat: {plotData.center_lat.toFixed(4)}, Lon: {plotData.center_lon.toFixed(4)}
          </p>

          <form onSubmit={handlePlotSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text" placeholder="District"
                className="px-4 py-2 border rounded-lg"
                value={plotData.district}
                onChange={(e) => setPlotData({ ...plotData, district: e.target.value })}
              />
              <input
                type="text" placeholder="State"
                className="px-4 py-2 border rounded-lg"
                value={plotData.state}
                onChange={(e) => setPlotData({ ...plotData, state: e.target.value })}
              />
            </div>
            <input
              type="text" placeholder="Current crop (e.g., wheat)"
              className="w-full px-4 py-2 border rounded-lg"
              value={plotData.current_crop}
              onChange={(e) => setPlotData({ ...plotData, current_crop: e.target.value })}
            />
            <input
              type="text" placeholder="Previous crop"
              className="w-full px-4 py-2 border rounded-lg"
              value={plotData.last_crop}
              onChange={(e) => setPlotData({ ...plotData, last_crop: e.target.value })}
            />
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold"
              style={{ background: loading ? '#ccc' : 'var(--green-primary)' }}
            >
              {loading ? t('onboarding.loading') : t('onboarding.submit')}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--green-primary)' }}>
            {t('onboarding.success')}
          </h2>
          <p className="text-gray-600 mb-6">Your farm data is being fetched in the background.</p>
          <button
            onClick={() => window.location.href = '/dashboard/farmer'}
            className="px-8 py-3 rounded-lg text-white font-semibold"
            style={{ background: 'var(--green-primary)' }}
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
