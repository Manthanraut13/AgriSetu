import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './i18n'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import AddPlotPage from './pages/AddPlotPage'
import FarmerDashboard from './pages/FarmerDashboard'
import AgronomistDashboard from './pages/AgronomistDashboard'
import ChatPage from './pages/ChatPage'
import AdvisoryPage from './pages/AdvisoryPage'
import DiseasePage from './pages/DiseasePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/plot/add" element={<AddPlotPage />} />
        <Route path="/dashboard/farmer" element={<FarmerDashboard />} />
        <Route path="/dashboard/agronomist" element={<AgronomistDashboard />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/advisory" element={<AdvisoryPage />} />
        <Route path="/disease" element={<DiseasePage />} />
        <Route path="/" element={<Navigate to="/dashboard/farmer" replace />} />
        <Route path="*" element={<Navigate to="/dashboard/farmer" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App