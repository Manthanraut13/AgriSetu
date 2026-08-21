import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { predictDisease } from '../api/agrisetu'

export default function DiseaseUploader() {
  const { t } = useTranslation()
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
      case 'high': return 'var(--red-danger)'
      case 'moderate': return 'var(--yellow-alert)'
      case 'low': return 'var(--green-primary)'
      default: return '#6c757d'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--green-primary)' }}>
        {t('dashboard.diagnose_disease')}
      </h3>

      <div className="border-2 border-dashed rounded-lg p-8 text-center mb-4" style={{ borderColor: 'var(--green-light)' }}>
        <input
          type="file" accept="image/*" capture="environment"
          onChange={handleUpload}
          className="hidden" id="disease-upload"
        />
        <label htmlFor="disease-upload" className="cursor-pointer">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-gray-600">Take a photo or upload a leaf image</p>
          <p className="text-xs text-gray-400 mt-1">Supports any crop — tomato, wheat, rice, mango, etc.</p>
        </label>
      </div>

      {preview && (
        <div className="mb-4">
          <img src={preview} alt="Uploaded leaf" className="w-full h-48 object-cover rounded-lg" />
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-600 text-sm">Analyzing plant health...</p>
          <p className="text-gray-400 text-xs">Using AI vision model for accurate identification</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg text-white mb-4" style={{ background: 'var(--red-danger)' }}>
          <p className="font-medium">Analysis Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded-lg p-4 mt-4" style={{
          background: result.confidence_pct >= 70 ? 'var(--red-bg)' :
                      result.confidence_pct >= 50 ? 'var(--yellow-bg)' : 'var(--green-bg)'
        }}>
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-lg">{result.disease_name}</h4>
            <div className="flex items-center gap-2">
              {result.source && (
                <span className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: result.source === 'Gemini Vision' ? '#7c3aed' : 'var(--blue-data)', color: 'white' }}>
                  {result.source}
                </span>
              )}
              <span className="px-2 py-1 rounded text-sm font-medium" style={{
                background: severityColor(result.severity), color: 'white'
              }}>
                {result.confidence_pct.toFixed(1)}%
              </span>
            </div>
          </div>

          <p className="text-sm mb-1">
            Severity: <strong style={{ color: severityColor(result.severity) }}>{result.severity?.toUpperCase()}</strong>
          </p>

          {result.description && (
            <p className="text-sm text-gray-600 mb-2 italic">{result.description}</p>
          )}

          <hr className="my-3" />

          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Treatment</p>
              <p className="text-sm">{result.treatment}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Organic Remedy</p>
              <p className="text-sm">{result.organic_remedy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
