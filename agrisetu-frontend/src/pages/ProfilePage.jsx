import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { farmer, updateFarmer } = useAuth()
  
  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState({})
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setEdits(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSave = async () => {
    if (!edits || Object.keys(edits).length === 0) return
    try {
      await updateFarmer(edits)
      setEditing(false)
    } catch (e) {
      console.error('Save failed:', e)
    }
  }
  
  const handleCancel = () => {
    setEditing(false)
  }
  
  if (!farmer) {
    navigate('/login')
    return null
  }
  
  // Determine if profile is complete
  const hasBasicInfo = farmer.name && farmer.phone
  const hasPlot = farmer.plot_id || false
  
  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-sm z-50">
        <div className="flex justify-between items-center px-4 md:px-10 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')} >
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
          <h1 className="text-2xl font-display font-bold mb-4 text-primary">
            {t('profile')}
          </h1>
          
          {hasBasicInfo ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-secondary-container text-on-secondary-container mr-4">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{farmer.name}</p>
                  <p className="text-xs text-on-surface-variant">{farmer.phone}</p>
                </div>
              </div>
              {hasPlot && (
                <div className="flex items-center gap-3 mt-3">
                  <span className="material-symbols-outlined text-sm text-tertiary">map</span>
                  <p className="text-xs text-on-surface-variant mb-0">
                    {t('profile.plot_registered')} — {farmer.plot_id?.slice(0, 8) + '...'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">{t('profile.incomplete')}</p>
          )}
          
          {editing ? (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-display font-bold mb-2 text-primary">{t('edit_profile')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('name')}</label>
                  <input
                    type="text"
                    name="name"
                    value={edits.name || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('phone')}</label>
                  <input
                    type="tel"
                    name="phone"
                    value={edits.phone || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="+91"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('language_preference')}</label>
                  <select
                    name="language_pref"
                    value={edits.language_pref || farmer.language_pref || 'hi'}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="en">{t('english')}</option>
                    <option value="hi">{t('hindi')}</option>
                    <option value="mr">{t('marathi')}</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave}
                  className="flex-1 py-3 rounded-full bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-lg align-middle mr-1">save</span>
                  {t('save')}
                </button>
                <button onClick={handleCancel}
                  className="flex-1 py-3 rounded-full bg-surface-container-low text-on-surface border border-outline-variant/40 flex items-center justify-center gap-2 hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-lg align-middle">cancel</span>
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-centermt-6">
              <button
                onClick={() => setEditing(true)}
                className="px-6 py-3 rounded-full bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-lg align-middle mr-1">edit</span>
                {t('edit_profile')}
              </button>
            </div>
          )}
          
          <div className="mt-8 border-t border-outline-variant/30 py-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">agriculture</span>
                <p className="text-sm text-on-surface-variant">{t('profile.not_registered')}</p>
              </div>
              <button
                onClick={() => navigate('/onboarding')}
                className="mt-2 px-6 py-3 rounded-full bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
                {t('register_now')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}