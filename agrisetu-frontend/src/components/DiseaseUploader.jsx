import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { predictDisease } from '../api/agrisetu'

export default function DiseaseUploader() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [activeTab, setActiveTab] = useState('organic')

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
        setError('Prediction failed — please try uploading a clearer image of a leaf.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 shadow-sm max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <span className="material-symbols-outlined">camera_alt</span>
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-primary">AI Disease Scanner</h3>
          <p className="text-xs text-on-surface-variant">Powered by Gemini 1.5 Flash Vision & Deep Learning</p>
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
        <p className="text-sm font-semibold text-primary mb-1">Take photo or upload leaf image</p>
        <p className="text-xs text-on-surface-variant font-mono">Supports: Tomato, Rice, Wheat, Potato, Maize, Citrus & more</p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-4 relative rounded-2xl overflow-hidden border border-outline-variant/40 h-52">
          <img src={preview} alt="Uploaded leaf" className="w-full h-full object-cover" />
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-mono">
            Preview
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-bold text-primary">Analyzing Plant Pathology...</p>
          <p className="text-xs text-on-surface-variant font-mono">Comparing visual symptoms against knowledge base</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-error-container text-on-error-container text-xs font-mono">
          <strong className="block font-bold mb-1">Analysis Notice</strong>
          <span>{error}</span>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-6 space-y-5">
          <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="inline-flex items-center gap-1 bg-primary-fixed/60 text-on-primary-fixed-variant px-3 py-0.5 rounded-full text-[11px] font-mono font-semibold mb-2">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  {result.source || 'Vision Model'}
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
                <span>Low</span>
                <span>Moderate</span>
                <span className={result.severity === 'high' ? 'text-error font-bold' : ''}>High Severity</span>
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
                <span>🌿</span> Organic & Eco-Remedy
              </button>
              <button
                onClick={() => setActiveTab('chemical')}
                className={`pb-2 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'chemical' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant'
                }`}
              >
                <span>🧪</span> Chemical Treatment
              </button>
            </div>

            <div className="bg-surface p-4 rounded-2xl border border-outline-variant/30 text-xs text-on-surface-variant leading-relaxed">
              {activeTab === 'organic' ? (
                <p>{result.organic_remedy || result.treatment}</p>
              ) : (
                <p>{result.treatment || 'Consult local agronomy officer for approved chemical application.'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
