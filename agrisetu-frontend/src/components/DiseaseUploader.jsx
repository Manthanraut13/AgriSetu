import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { predictDisease } from '../api/agrisetu'

export default function DiseaseUploader() {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', i18n.language || 'hi')

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
    <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 shadow-sm max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <span className="material-symbols-outlined">camera_alt</span>
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-primary">{t('disease.title')}</h3>
          <p className="text-xs text-on-surface-variant">Powered by Gemini 3.6 Flash Vision & Deep Learning</p>
        </div>
      </div>

      {/* Dropzone */}
      <div className="bg-surface-container-low border-2 border-dashed border-primary/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-container transition-colors relative">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
          <span className="material-symbols-outlined text-3xl">add_a_photo</span>
        </div>
        <p className="text-sm font-semibold text-primary mb-1">{t('disease.upload_hint')}</p>
        <p className="text-xs text-on-surface-variant font-mono">{t('disease.upload_sub')}</p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mb-4">
          <img src={preview} alt="Leaf" className="w-full h-48 object-cover rounded-2xl border border-outline-variant/30" />
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-bold text-primary">{t('disease.analyzing')}</p>
          <p className="text-xs text-on-surface-variant font-mono">{t('disease.analyzing_sub')}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-error-container text-on-error-container text-xs font-mono">
          <strong className="block font-bold mb-1">{t('disease.error')}</strong>
          <span>{error}</span>
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
                <h4 className="text-xl font-bold text-primary">{result.disease_name}</h4>
              </div>
              <div className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full font-mono text-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {result.confidence_pct?.toFixed(1)}%
              </div>
            </div>

            {/* Severity spectrum */}
            <div className="mt-4">
              <div className="flex justify-between text-xs font-mono text-on-surface-variant mb-1.5">
                <span>{t('dashboard.healthy')}</span>
                <span>{t('dashboard.caution')}</span>
                <span className={result.severity === 'high' ? 'text-error font-bold' : ''}>{t('disease.severity')}: {result.severity?.toUpperCase()}</span>
              </div>
              <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden flex">
                <div className={`w-1/3 h-full ${result.severity === 'low' ? 'bg-primary' : 'bg-primary-fixed'}`} />
                <div className={`w-1/3 h-full ${result.severity === 'moderate' ? 'bg-tertiary' : 'bg-tertiary-fixed'}`} />
                <div className={`w-1/3 h-full ${result.severity === 'high' ? 'bg-error' : 'bg-error-container'}`} />
              </div>
            </div>
          </div>

          {/* Remedies Tabs */}
          <div>
            <div className="flex gap-4 border-b border-outline-variant/30 mb-4">
              <button
                onClick={() => setActiveTab('organic')}
                className={`pb-2 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'organic' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant'
                }`}
              >
                <span>🌿</span> {t('disease.organic_remedy')}
              </button>
              <button
                onClick={() => setActiveTab('chemical')}
                className={`pb-2 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'chemical' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant'
                }`}
              >
                <span>🧪</span> {t('disease.treatment')}
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t('disease.organic_remedy')}</p>
              <p className="text-sm text-on-surface mt-1">{result.organic_remedy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
