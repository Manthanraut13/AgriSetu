import React, { useState, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { login, farmer } = useAuth()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!phone.trim()) return
    const result = await login(phone.trim())
    if (result.success) {
      navigate('/dashboard/farmer')
    } else {
      setError(result.error)
    }
  }

  // Auto-focus and enter key
  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  if (farmer) {
    navigate('/dashboard/farmer')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans">
      <div className="bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 w-full max-w-md p-8 md:p-10">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-primary text-4xl mb-3">eco</span>
          <h2 className="font-display font-extrabold text-primary mb-2">{t('login')} AgriSetu</h2>
          <p className="text-on-surface-variant">Digital Agriculture Network</p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-error-container/40 border border-error/30 mb-4">
            <p className="font-semibold text-error text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-on-surface-variant mb-2">
              {t('phone')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-full px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-lg"
              placeholder="+91 9529883808"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity">
            {t('login')}
            <span className="material-symbols-outlined text-lg align-middle ms-2">arrow_right</span>
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-on-surface-variant">
          {t('no_account')}
          <span className="cursor-pointer underline text-primary" onClick={() => navigate('/onboarding')}>
            {t('register_now')}
          </span>
        </div>
      </div>
    </div>
  )
}