import React, { createContext, useContext, useState, useEffect } from 'react'
import { getFarmerByPhone, createFarmer, getAllPlots } from '../api/agrisetu'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [farmer, setFarmer] = useState(null)
  const [plots, setPlots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const savedFarmer = localStorage.getItem('agrisetu_farmer')
    if (savedFarmer) {
      try {
        const parsed = JSON.parse(savedFarmer)
        setFarmer(parsed)
        loadPlots(parsed.id)
      } catch (e) {
        localStorage.removeItem('agrisetu_farmer')
      }
    }
    setLoading(false)
  }, [])

  const loadPlots = async (farmerId) => {
    try {
      const res = await getAllPlots()
      setPlots(res.data || [])
    } catch (e) {
      console.error('Failed to load plots:', e)
    }
  }

  const login = async (phone) => {
    try {
      const res = await getFarmerByPhone(phone)
      if (res.data && res.data.length > 0) {
        const f = res.data[0]
        setFarmer(f)
        localStorage.setItem('agrisetu_farmer', JSON.stringify(f))
        await loadPlots(f.id)
        return { success: true, farmer: f }
      }
      return { success: false, error: 'Farmer not found. Please register.' }
    } catch (e) {
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  const register = async (data) => {
    try {
      const res = await createFarmer(data)
      const f = res.data
      setFarmer(f)
      localStorage.setItem('agrisetu_farmer', JSON.stringify(f))
      await loadPlots(f.id)
      return { success: true, farmer: f }
    } catch (e) {
      return { success: false, error: 'Registration failed. Please try again.' }
    }
  }

  const logout = () => {
    setFarmer(null)
    setPlots([])
    localStorage.removeItem('agrisetu_farmer')
  }

  const updateFarmer = (updates) => {
    const updated = { ...farmer, ...updates }
    setFarmer(updated)
    localStorage.setItem('agrisetu_farmer', JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider value={{ farmer, plots, loading, login, register, logout, updateFarmer, loadPlots }}>
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