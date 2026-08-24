import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const switchLang = (lng) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div className="bg-background text-on-background font-sans min-h-screen flex flex-col selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Top Bar Navigation */}
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center w-full px-4 md:px-10 py-4 max-w-7xl mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined text-primary text-3xl font-bold">eco</span>
            <span className="text-2xl font-display font-extrabold text-primary tracking-tight">
              AgriSetu
            </span>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
            <button onClick={() => navigate('/onboarding')} className="hover:text-primary transition-colors">
              {t('register_farm')}
            </button>
            <button onClick={() => navigate('/dashboard/farmer')} className="hover:text-primary transition-colors">
              {t('farmer_hub')}
            </button>
            <button onClick={() => navigate('/dashboard/agronomist')} className="hover:text-primary transition-colors">
              {t('agronomist_hub')}
            </button>

            {/* Language Selection Pills */}
            <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40">
              {[
                { code: 'hi', label: 'हिंदी' },
                { code: 'mr', label: 'मराठी' },
                { code: 'en', label: 'EN' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => switchLang(lang.code)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    i18n.language === lang.code
                      ? 'bg-primary text-on-primary shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Language Selection on Mobile */}
            <div className="flex md:hidden items-center gap-1 bg-surface-container p-0.5 rounded-full border border-outline-variant/40">
              {[
                { code: 'hi', label: 'हिं' },
                { code: 'mr', label: 'मरा' },
                { code: 'en', label: 'EN' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => switchLang(lang.code)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                    i18n.language === lang.code
                      ? 'bg-primary text-on-primary shadow-sm font-bold'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              className="bg-primary text-on-primary text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full hover:bg-primary-container transition-all active:scale-95 shadow-sm"
            >
              {t('landing.get_started')}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-10 py-8">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-8 md:py-16">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container/50 border border-secondary-container text-secondary text-xs font-semibold w-fit">
              <span className="material-symbols-outlined text-sm">hub</span>
              {t('landing.network_badge')}
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-primary tracking-tight leading-tight">
              {t('landing.hero_title')}
            </h1>
            
            <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed">
              {t('landing.hero_subtitle')}
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => navigate('/onboarding')}
                className="bg-primary text-on-primary text-base font-semibold px-6 py-3.5 rounded-xl hover:bg-primary-container transition-all shadow-sm flex items-center gap-2 group"
              >
                <span>{t('landing.register_farm')}</span>
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
              <button
                onClick={() => navigate('/dashboard/farmer')}
                className="bg-surface-container border border-outline-variant text-primary text-base font-semibold px-6 py-3.5 rounded-xl hover:bg-surface-container-high transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">dashboard</span>
                <span>{t('landing.open_dashboard')}</span>
              </button>
            </div>
          </div>

          {/* Hero Mockup Card */}
          <div className="relative w-full flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-secondary-container/30 to-tertiary-fixed/20 rounded-full blur-3xl opacity-60"></div>
            
            <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 ambient-shadow hover:scale-[1.01] transition-transform">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-primary">Rampur Plot A</h3>
                  <p className="text-xs text-on-surface-variant font-mono">Nashik, Maharashtra — 2.4 Ha</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined">eco</span>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-secondary text-xs font-semibold">
                    <span className="material-symbols-outlined text-sm">nature</span>
                    <span>NDVI Index</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-primary">0.74</span>
                  <span className="text-[11px] text-secondary font-medium">Optimal Health</span>
                </div>

                <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-tertiary text-xs font-semibold">
                    <span className="material-symbols-outlined text-sm">water_drop</span>
                    <span>Soil Moisture</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-primary">24.2%</span>
                  <span className="text-[11px] text-tertiary font-medium">Balanced</span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-primary">Real-time Telemetry Active</p>
                  <p className="text-[11px] text-on-surface-variant">Sentinel-2 Satellite + ISRIC SoilGrids Integration</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Science Badges */}
        <section className="py-8 border-y border-outline-variant/30 my-8">
          <p className="text-center text-xs font-mono font-semibold text-outline uppercase tracking-widest mb-6">
            Powered by Global Earth Observation & Agronomy Networks
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            <div className="bg-surface-container-high/60 px-5 py-2.5 rounded-full border border-outline-variant/40 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">satellite_alt</span>
              <span className="text-sm font-semibold text-on-surface-variant">Sentinel-2 Satellite</span>
            </div>
            <div className="bg-surface-container-high/60 px-5 py-2.5 rounded-full border border-outline-variant/40 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">public</span>
              <span className="text-sm font-semibold text-on-surface-variant">NASA POWER Weather</span>
            </div>
            <div className="bg-surface-container-high/60 px-5 py-2.5 rounded-full border border-outline-variant/40 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">layers</span>
              <span className="text-sm font-semibold text-on-surface-variant">ISRIC SoilGrids</span>
            </div>
            <div className="bg-tertiary-fixed/40 px-5 py-2.5 rounded-full border border-tertiary-fixed-dim/60 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-tertiary"></div>
              <span className="text-sm font-bold text-on-tertiary-container">Indore Declaration 2026 Aligned</span>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-display font-bold text-primary mb-3">{t('landing.suite_title')}</h2>
            <p className="text-on-surface-variant">{t('landing.suite_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/dashboard/farmer')}>
              <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container mb-5">
                <span className="material-symbols-outlined text-2xl">agriculture</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{t('landing.hub_title')}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                {t('landing.hub_desc')}
              </p>
              <span className="text-sm font-semibold text-primary inline-flex items-center gap-1 group">
                {t('landing.launch_hub')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/dashboard/farmer')}>
              <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-5">
                <span className="material-symbols-outlined text-2xl">camera_alt</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{t('landing.disease_title')}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                {t('landing.disease_desc')}
              </p>
              <span className="text-sm font-semibold text-primary inline-flex items-center gap-1">
                {t('landing.scan_crop')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-sm hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/dashboard/agronomist')}>
              <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed mb-5">
                <span className="material-symbols-outlined text-2xl">map</span>
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{t('landing.agronomist_title')}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                {t('landing.agronomist_desc')}
              </p>
              <span className="text-sm font-semibold text-primary inline-flex items-center gap-1">
                {t('landing.open_command')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-high py-8 border-t border-outline-variant/30 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">eco</span>
            <span className="font-display font-bold text-primary">AgriSetu</span>
          </div>
          <p className="text-xs text-on-surface-variant font-mono">
            Aligned with BRICS AgriN & BRICS Network on Digital Agriculture | Indore Declaration 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
