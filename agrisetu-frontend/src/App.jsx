import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './i18n'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import FarmerDashboard from './pages/FarmerDashboard'
import AgronomistDashboard from './pages/AgronomistDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard/farmer" element={<FarmerDashboard />} />
        <Route path="/dashboard/agronomist" element={<AgronomistDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
