import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, sendOtp, verifyOtp } = useAuth()

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard/farmer', { replace: true })
  }, [isAuthenticated, navigate])

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
    return () => clearTimeout(id)
  }, [resendTimer])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      await sendOtp(phone.trim())
      setStep('otp')
      setResendTimer(30)
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim() || otp.trim().length < 4) return
    setLoading(true)
    setError('')
    try {
      await verifyOtp(phone, otp.trim())
      navigate('/dashboard/farmer', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    setError('')
    try {
      await sendOtp(phone)
      setResendTimer(30)
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans px-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 w-full max-w-md p-8 md:p-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-primary text-3xl">eco</span>
          </div>
          <h1 className="font-display font-extrabold text-primary text-2xl mb-1">AgriSetu</h1>
          <p className="text-on-surface-variant text-sm">Digital Agriculture Network</p>
        </div>

        {/* Language switcher */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40">
            {[
              { code: 'hi', label: 'हिंदी' },
              { code: 'mr', label: 'मराठी' },
              { code: 'en', label: 'EN' },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  i18n.language === lang.code
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-2xl bg-error-container/40 border border-error/30 mb-4">
            <p className="font-semibold text-error text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                {t('phone') || 'Phone Number'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm font-mono">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className="w-full pl-14 pr-4 py-3.5 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface placeholder-on-surface-variant focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-lg font-mono"
                  placeholder="9876543210"
                  required
                  autoFocus
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                {t('otp_will_be_sent') || 'An OTP will be sent to verify your number'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>{t('send_otp') || 'Send OTP'}</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                {t('enter_otp') || 'Enter OTP'}
              </label>
              <p className="text-xs text-on-surface-variant mb-3">
                {t('otp_sent_to') || 'OTP sent to'} <span className="font-mono font-semibold text-primary">+91{phone}</span>
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full px-4 py-3.5 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="------"
                required
                autoFocus
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full py-3.5 rounded-2xl bg-primary text-on-primary font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>{t('verify') || 'Verify & Login'}</span>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                </>
              )}
            </button>

            <div className="flex justify-between items-center text-sm">
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                {t('change_number') || 'Change Number'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0}
                className={`font-semibold transition-colors ${
                  resendTimer > 0
                    ? 'text-on-surface-variant/50 cursor-not-allowed'
                    : 'text-primary hover:text-primary-container'
                }`}
              >
                {resendTimer > 0
                  ? `${resendTimer}s`
                  : (t('resend_otp') || 'Resend OTP')
                }
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-on-surface-variant">
          {t('brics_aligned') || 'Aligned with BRICS AgriN & Indore Declaration 2026'}
        </div>
      </div>
    </div>
  )
}
