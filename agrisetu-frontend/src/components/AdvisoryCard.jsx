import React from 'react'
import { useTranslation } from 'react-i18next'

export default function AdvisoryCard({ advisory }) {
  const { t } = useTranslation()

  if (!advisory) return null

  const topCrop = advisory.recommendations?.[0]

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--green-primary)' }}>
        {t('dashboard.get_advisory')}
      </h3>

      {/* Top Recommendation */}
      {topCrop && (
        <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--green-bg)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xl font-bold">🌾 {topCrop.crop}</span>
            <span className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ background: 'var(--green-primary)' }}>
              {(topCrop.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm">📅 Sowing: {topCrop.sowing_window}</p>
          <p className="text-sm">💧 Irrigation: Every {topCrop.irrigation_days} days</p>
        </div>
      )}

      {/* Other Recommendations */}
      {advisory.recommendations?.slice(1, 3).map((rec, i) => (
        <div key={i} className="rounded-lg p-3 mb-2 border">
          <span className="font-medium">🌾 {rec.crop}</span>
          <span className="ml-2 text-sm text-gray-600">({(rec.confidence * 100).toFixed(0)}%)</span>
        </div>
      ))}

      {/* Regenerative Practices */}
      {advisory.regenerative_practices?.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">🌿 Regenerative Practices</h4>
          {advisory.regenerative_practices.map((p, i) => (
            <div key={i} className="rounded-lg p-3 mb-2 border-l-4" style={{
              borderLeftColor: p.priority === 'high' ? 'var(--red-danger)' : 'var(--green-light)',
              background: 'var(--neutral-light)'
            }}>
              <p className="font-medium text-sm">{p.practice}</p>
              <p className="text-xs text-gray-600 mt-1">{p.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risk Alerts */}
      {advisory.risk_alerts?.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">⚠️ Risk Alerts</h4>
          {advisory.risk_alerts.map((alert, i) => (
            <div key={i} className="p-2 rounded text-sm mb-1" style={{ background: 'var(--yellow-bg)' }}>
              {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
