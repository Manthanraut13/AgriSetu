import React from 'react'
import { useTranslation } from 'react-i18next'

export default function LandingPage() {
  const { t, i18n } = useTranslation()

  const switchLang = (lng) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'linear-gradient(135deg, var(--green-bg) 0%, var(--neutral-light) 100%)' }}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-3" style={{ color: 'var(--green-primary)' }}>
          {t('app_name')}
        </h1>
        <p className="text-lg font-medium" style={{ color: 'var(--neutral-mid)' }}>
          {t('tagline')}
        </p>
        <div className="w-24 h-1 mx-auto mt-4 rounded" style={{ background: 'var(--brics-gold)' }} />
      </div>

      {/* Language Selection */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <p className="text-xl font-semibold mb-6" style={{ color: 'var(--neutral-dark)' }}>
          {t('language_select')}
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[
            { code: 'hi', label: 'हिंदी' },
            { code: 'mr', label: 'मराठी' },
            { code: 'en', label: 'English' },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLang(lang.code)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                i18n.language === lang.code
                  ? 'text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={i18n.language === lang.code ? { background: 'var(--green-primary)' } : {}}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.href = '/onboarding'}
            className="w-full py-3 rounded-lg text-white font-semibold text-lg transition-transform hover:scale-105"
            style={{ background: 'var(--green-primary)' }}
          >
            {t('register_farm')}
          </button>
          <button
            onClick={() => window.location.href = '/dashboard/farmer'}
            className="w-full py-3 rounded-lg font-semibold text-lg border-2 transition-transform hover:scale-105"
            style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
          >
            {t('login')}
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-center" style={{ color: 'var(--neutral-mid)' }}>
        Aligned with BRICS AgriN & BRICS Network on Digital Agriculture | Indore Declaration 2026
      </p>
    </div>
  )
}
