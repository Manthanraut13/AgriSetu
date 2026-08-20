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
      setError(err.response?.data?.detail || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--green-primary)' }}>
        {t('dashboard.diagnose_disease')}
      </h3>

      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-8 text-center mb-4" style={{ borderColor: 'var(--green-light)' }}>
        <input
          type="file" accept="image/*" capture="environment"
          onChange={handleUpload}
          className="hidden" id="disease-upload"
        />
        <label htmlFor="disease-upload" className="cursor-pointer">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-gray-600">Tap to take a photo or upload an image</p>
        </label>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mb-4">
          <img src={preview} alt="Uploaded leaf" className="w-full h-48 object-cover rounded-lg" />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-600">Analyzing plant health...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg text-white mb-4" style={{ background: 'var(--red-danger)' }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-lg p-4 mt-4" style={{
          background: result.confidence_pct >= 80 ? 'var(--red-bg)' : result.confidence_pct >= 60 ? 'var(--yellow-bg)' : 'var(--green-bg)'
        }}>
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-lg">{result.disease_name}</h4>
            <span className="px-2 py-1 rounded text-sm font-medium" style={{
              background: result.confidence_pct >= 80 ? 'var(--red-danger)' : 'var(--yellow-alert)',
              color: 'white'
            }}>
              {result.confidence_pct.toFixed(1)}%
            </span>
          </div>
          <p className="text-sm mb-2">Severity: <strong>{result.severity}</strong></p>
          <hr className="my-2" />
          <p className="text-sm"><strong>Treatment:</strong> {result.treatment}</p>
          <p className="text-sm mt-1"><strong>Organic Remedy:</strong> {result.organic_remedy}</p>
        </div>
      )}
    </div>
  )
}
