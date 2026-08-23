import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const MapPicker = () => {
  const [lat, setLat] = useState(21.0939597521461)
  const [lon, setLon] = useState(79.1006961464882)
  const [geometry, setGeometry] = useState(null)
  
  useEffect(() => {
    const center = { lat, lon }
    const animatePan = () => {
      // Skip animation for now
    }
    
    // Set geometry using center point
    const timeout = setTimeout(() => {
      const point = { lat, lon }
      setGeometry({ center: point })
    }, 100);
    
    return () => clearTimeout(timeout)
  }, [lat, lon])
  
  const handleSelect = (lat, lon) => {
    const point = { lat, lon }
    setGeometry({ center: point })
    setLat(lat)
    setLon(lon)
  }
  
  return (
    <div className="map-picker">
      <div 
        id="map-container" 
        className="w-full h-64 rounded-2xl bg-surface-container-low border border-outline-variant/30 map-picker-map"
        style={{ 
          borderRadius: '0.75rem',
          position: 'relative'
        }}
        onClick={() => {
          // In real app, this would open geolocation picker
          // For now, use predefined coordinates
          handleSelect(21.0939597521461, 79.1006961464882)
        }}
      >
        <div className="absolute inset-0 cursor-point"></div>
        <span className="material-symbols-outlined absolute top-3 left-3 text-primary">
          location_on
        </span>
      </div>
      
      <input
        type="hidden"
        name="geometry"
        value={geometry ? JSON.stringify(geometry) : ''}
      />
      
      <div className="mt-2 text-sm text-on-surface-variant text-center p-2 bg-surface-container-low rounded-2xl border border-outline-variant/30">
        {{lat.toFixed(6)}} , {{lon.toFixed(6)}}
      </div>
    </div>
  )
}

export default MapPicker