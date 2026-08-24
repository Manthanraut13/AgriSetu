import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './i18n'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import FarmerDashboard from './pages/FarmerDashboard'
import AgronomistDashboard from './pages/AgronomistDashboard'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Landing page is public — first appearance for everyone */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/farmer"
          element={
            <ProtectedRoute>
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/agronomist"
          element={
            <ProtectedRoute>
              <AgronomistDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        {/* Catch-all: unauthenticated → /login, authenticated → dashboard */}
        <Route path="*" element={<CatchRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

function CatchRedirect() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }
  return <Navigate to={isAuthenticated ? '/dashboard/farmer' : '/login'} replace />
}

export default App
