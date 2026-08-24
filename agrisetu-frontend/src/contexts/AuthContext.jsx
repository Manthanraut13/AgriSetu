import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getFarmerByPhone, linkUserToFarmer, getAllPlots } from '../api/agrisetu'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [farmer, setFarmer] = useState(null)
  const [plots, setPlots] = useState([])
  const [loading, setLoading] = useState(true)

  // On mount: check for existing Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) {
        loadFarmer(s.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) {
        loadFarmer(s.user)
      } else {
        setFarmer(null)
        setPlots([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadFarmer = async (user) => {
    try {
      // Try to get existing farmer linked to this user
      const res = await linkUserToFarmer(user.id, user.phone || '')
      const f = res.data.farmer
      setFarmer(f)
      localStorage.setItem('agrisetu_farmer', JSON.stringify({ ...f, is_registered: true }))
      await loadPlots(f.id)
    } catch (err) {
      console.error('Failed to load farmer profile:', err)
      // Fallback: try to find by phone
      try {
        const phone = user.phone || user.user_metadata?.phone || ''
        if (phone) {
          const res = await getFarmerByPhone(phone.replace('+', ''))
          if (res.data && res.data.length > 0) {
            const f = res.data[0]
            setFarmer(f)
            localStorage.setItem('agrisetu_farmer', JSON.stringify({ ...f, is_registered: true }))
            await loadPlots(f.id)
          }
        }
      } catch {
        // No farmer profile yet
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPlots = async (farmerId) => {
    try {
      const res = await getAllPlots()
      setPlots(res.data || [])
    } catch (e) {
      console.error('Failed to load plots:', e)
    }
  }

  // Send OTP to phone number
  const sendOtp = async (phone) => {
    const formatted = phone.startsWith('+') ? phone : `+91${phone}`
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })
    if (error) throw error
    return formatted
  }

  // Verify OTP and complete sign in
  const verifyOtp = async (phone, token) => {
    const formatted = phone.startsWith('+') ? phone : `+91${phone}`
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token,
      type: 'sms',
    })
    if (error) throw error
    setSession(data.session)
    return data
  }

  // Sign out
  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setFarmer(null)
    setPlots([])
    localStorage.removeItem('agrisetu_farmer')
    localStorage.removeItem('agrisetu_active_plot_id')
  }

  // Update farmer profile locally (after backend PATCH)
  const updateFarmer = (updates) => {
    const updated = { ...farmer, ...updates }
    setFarmer(updated)
    localStorage.setItem('agrisetu_farmer', JSON.stringify({ ...updated, is_registered: true }))
  }

  const user = session?.user || null
  const isAuthenticated = !!session

  return (
    <AuthContext.Provider value={{
      session,
      user,
      farmer,
      plots,
      loading,
      isAuthenticated,
      sendOtp,
      verifyOtp,
      logout,
      updateFarmer,
      loadFarmer,
      loadPlots,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
