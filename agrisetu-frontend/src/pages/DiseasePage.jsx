import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { predictDisease } from '../api/agrisetu'

export default function DiseasePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { farmer } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  
  if (!farmer) {
    navigate('/login')
    return null
  }
  
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setError(null)
    setResult(null)
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await predictDisease(formData)
      setResult(res.data)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (detail) {
        setError(typeof detail === 'object' ? JSON.stringify(detail) : String(detail))
      } else {
        setError('Prediction failed — please try a clearer photo of a leaf.')
      }
    } finally {
      setLoading(false)
    }
  }
  
  const severityColor = (severity) => {
    switch (severity) {
      case 'high': return { bg: 'bg-error-container/40', text: 'text-error', border: 'border-error/30' }
      case 'moderate': return { bg: 'bg-tertiary-fixed/30', text: 'text-tertiary', border: 'border-tertiary/30' }
      default: return { bg: 'bg-primary-fixed-dim/30', text: 'text-primary', border: 'border-primary/30' }
    }
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
          <h1 className="text-2xl font-display font-bold mb-4 text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">bug_report</span>
            {t('disease.title')}
          </h1>
          
          <div className="border-2 border-dashed border-outline-variant rounded-3xl p-10 text-center mb-4 bg-surface-container-low">
            <input type="file" accept="image/*" capture="environment" onChange={handleUpload}
              className="hidden" id="disease-upload" />
            <label htmlFor="disease-upload" className="cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl text-on-secondary-container">add_a_photo</span>
              </div>
              <p className="text-on-surface font-semibold">{t('disease.upload_hint')}</p>
              <p className="text-xs text-on-surface-variant mt-1">{t('disease.upload_sub')}</p>
            </label>
          </div>
          
          {preview && (
            <div className="mb-4">
              <img src={preview} alt="Leaf" className="w-full h-48 object-cover rounded-2xl border border-outline-variant/30" />
            </div>
          )}
          
          {loading && (
            <div className="text-center py-6">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-on-surface font-semibold text-sm">{t('disease.analyzing')}</p>
              <p className="text-on-surface-variant text-xs mt-1">{t('disease.analyzing_sub')}</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 rounded-2xl bg-error-container/40 border border-error/30 mb-4">
              <p className="font-semibold text-error text-sm">{t('disease.error')}</p>
              <p className="text-sm text-on-surface mt-1">{error}</p>
            </div>
          )}
          
          {result && (
            <div className="rounded-2xl p-5 mt-4 border border-outline-variant/30 bg-surface-container-lowest">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-display font-bold text-lg text-on-surface">{result.disease_name}</h4>
                <div className="flex items-center gap-2">
                  {result.source && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-on-primary">
                      {result.source}
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-tertiary-container text-on-tertiary-container">
                    {result.confidence_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-sm mb-1 text-on-surface">
                {t('disease.severity')}: <strong className={
                  result.severity === 'high' ? 'text-error' :
                  result.severity === 'moderate' ? 'text-tertiary' : 'text-primary'
                }>{result.severity?.toUpperCase()}</strong>
              </p>
              {result.description && <p className="text-sm text-on-surface-variant mb-2 italic">{result.description}</p>}
              <hr className="my-3 border-outline-variant/30" />
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('disease.treatment')}</p>
                  <p className="text-sm text-on-surface mt-1">{result.treatment}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('disease.organic_remedy')}</p>
                  <p className="text-sm text-on-surface mt-1">{result.organic_remedy}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}