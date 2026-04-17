import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import HazardMap from './pages/HazardMap'
import SubmitReport from './pages/SubmitReport'
import MyReports from './pages/MyReports'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminReports from './pages/AdminReports'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<HazardMap />} />
              <Route path="/submit" element={<SubmitReport />} />
              <Route path="/login" element={<Login />} />

              {/* Authenticated user */}
              <Route path="/reports" element={
                <ProtectedRoute><MyReports /></ProtectedRoute>
              } />

              {/* Admin only */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
