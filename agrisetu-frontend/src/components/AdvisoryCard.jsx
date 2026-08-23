import React from 'react'
import { useTranslation } from 'react-i18next'

export default function AdvisoryCard({ advisory }) {
  const { t } = useTranslation()

  if (!advisory) return null

  const topCrop = advisory.recommendations?.[0]

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/40 shadow-sm max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
          <span className="material-symbols-outlined">lightbulb</span>
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-primary">AI Agronomy Advisory</h3>
          <p className="text-xs text-on-surface-variant font-mono">Generative Recommendations & Risk Alerts</p>
        </div>
      </div>

      {/* Top Crop Recommendation */}
      {topCrop && (
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold mb-2">
                Primary Crop Recommendation
              </span>
              <h4 className="text-2xl font-bold text-primary">{topCrop.crop}</h4>
            </div>
            <div className="bg-primary text-on-primary px-3.5 py-1.5 rounded-full text-sm font-mono font-bold">
              {((topCrop.confidence || 0.88) * 100).toFixed(0)}% Match
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-surface p-3 rounded-xl border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">Optimal Sowing Window</span>
              <span className="text-sm font-bold text-on-surface mt-1">{topCrop.sowing_window}</span>
            </div>
            <div className="bg-surface p-3 rounded-xl border border-outline-variant/30 flex flex-col">
              <span className="text-xs text-on-surface-variant font-mono">Irrigation Frequency</span>
              <span className="text-sm font-bold text-on-surface mt-1">Every {topCrop.irrigation_days} Days</span>
            </div>
          </div>
        </div>
      )}

      {/* Alternate Crop Recommendations */}
      {advisory.recommendations?.slice(1, 3).length > 0 && (
        <div>
          <h4 className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            Alternative Crop Options
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {advisory.recommendations.slice(1, 3).map((rec, i) => (
              <div key={i} className="bg-surface p-3 rounded-2xl border border-outline-variant/30 flex justify-between items-center text-xs">
                <span className="font-bold text-primary">{rec.crop}</span>
                <span className="font-mono text-secondary font-semibold">
                  {((rec.confidence || 0.75) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regenerative Practices */}
      {advisory.regenerative_practices?.length > 0 && (
        <div>
          <h4 className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-sm">eco</span>
            Regenerative Farming Protocol
          </h4>
          <div className="space-y-2.5">
            {advisory.regenerative_practices.map((p, i) => (
              <div
                key={i}
                className="bg-surface p-3.5 rounded-2xl border-l-4 border-primary text-xs space-y-1 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-on-surface">{p.practice}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary-fixed/40 text-on-primary-fixed-variant">
                    {p.priority || 'High'} Priority
                  </span>
                </div>
                <p className="text-on-surface-variant leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Alerts */}
      {advisory.risk_alerts?.length > 0 && (
        <div className="bg-tertiary-fixed/30 border border-tertiary-fixed-dim/50 rounded-2xl p-4">
          <h4 className="text-xs font-mono font-semibold text-on-tertiary-container uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">warning</span>
            Active Agronomic Alerts
          </h4>
          <div className="space-y-1 text-xs text-on-tertiary-container">
            {advisory.risk_alerts.map((alert, i) => (
              <p key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span>{alert}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
