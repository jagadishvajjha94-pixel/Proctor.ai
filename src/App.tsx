import { Routes, Route } from "react-router-dom"
import { features } from "@/lib/features"
import LandingPage from "./pages/Home"
import DashboardPage from "./pages/Dashboard"
import AdminPage from "./pages/Admin"
import AdminLoginPage from "./pages/AdminLogin"
import AssessmentPage from "./pages/Assessment"
import InterviewPage from "./pages/Interview"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/assessment/:sessionId" element={<AssessmentPage />} />
      {features.enableInterview && <Route path="/interview" element={<InterviewPage />} />}
    </Routes>
  )
}
