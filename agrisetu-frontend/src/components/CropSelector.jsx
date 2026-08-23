import React from 'react'
import { useTranslation } from 'react-i18next'

export default function CropSelector({ crop, onChange, label }) {
  const { t } = useTranslation()
  
  const crops = [
    { value: 'rice', label: t('crops.rice') || 'Rice' },
    { value: 'wheat', label: t('crops.wheat') || 'Wheat' },
    { value: 'maize', label: t('crops.maize') || 'Maize' },
    { value: 'cotton', label: t('crops.cotton') || 'Cotton' },
    { value: 'sugarcane', label: t('crops.sugarcane') || 'Sugarcane' },
    { value: 'soybean', label: t('crops.soybean') || 'Soybean' },
    { value: 'groundnut', label: t('crops.groundnut') || 'Groundnut' },
    { value: 'chickpea', label: t('crops.chickpea') || 'Chickpea' },
    { value: 'pigeonpeas', label: t('crops.pigeonpeas') || 'Pigeon Peas' },
    { value: 'mungbean', label: t('crops.mungbean') || 'Mung Bean' },
    { value: 'blackgram', label: t('crops.blackgram') || 'Black Gram' },
    { value: 'lentil', label: t('crops.lentil') || 'Lentil' },
    { value: 'paddy', label: t('crops.paddy') || 'Paddy' },
    { value: 'barley', label: t('crops.barley') || 'Barley' },
    { value: 'sorghum', label: t('crops.sorghum') || 'Sorghum' },
    { value: 'millet', label: t('crops.millet') || 'Millet' },
  ]

  return (
    <div>
      <label className="block text-sm font-medium text-on-surface-variant mb-2">{label}</label>
      <select
        value={crop || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
      >
        <option value="">{t('select_crop')}</option>
        {crops.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    </div>
  )
}