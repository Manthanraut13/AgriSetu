import axios from 'axios'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// ── Health ──────────────────────────────────────────────────
export const checkHealth = () => api.get('/api/v1/health')

// ── Onboarding ──────────────────────────────────────────────
export const createFarmer = (data) => api.post('/api/v1/onboarding/farmer', data)
export const createPlot = (data) => api.post('/api/v1/onboarding/plot', data)
export const getPlotSummary = (plotId) => api.get(`/api/v1/onboarding/plot/${plotId}`)

// ── Disease ─────────────────────────────────────────────────
export const predictDisease = (formData) =>
  api.post('/api/v1/disease/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ── Advisory ────────────────────────────────────────────────
export const getAdvisory = (plotId) => api.get(`/api/v1/advisory/${plotId}`)

// ── Chat & Voice ────────────────────────────────────────────
export const sendChatMessage = (data) => api.post('/api/v1/chat/ask', data)
export const sendVoiceQuestion = (formData) =>
  api.post('/api/v1/voice/ask', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })


// ── Dashboard ───────────────────────────────────────────────
export const getFarmerPlots = (farmerId) => api.get(`/api/v1/dashboard/plots/${farmerId}`)
export const getAllPlots = () => api.get('/api/v1/dashboard/plots')

// ── Auth ───────────────────────────────────────────────────
export const getFarmerByPhone = (phone) => api.get(`/api/v1/onboarding/farmer/by-phone/${phone}`)
export const linkUserToFarmer = (userId, phone) =>
  api.post('/api/v1/auth/link', { user_id: userId, phone })
export const getMeByUserId = (userId) =>
  api.get('/api/v1/auth/me', { headers: { 'X-User-Id': userId } })
export const updateFarmerProfile = (farmerId, updates) =>
  api.patch(`/api/v1/onboarding/farmer/${farmerId}`, updates)

// ── BRICS API ───────────────────────────────────────────────
export const getBRICSAdvisory = (plotId) => api.get(`/api/v1/brics/advisory/${plotId}`)
export const getBRICSAggregate = (country) => api.get(`/api/v1/brics/aggregate`, { params: { country } })

export default api