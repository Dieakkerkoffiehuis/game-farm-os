import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Animals from './pages/Animals'
import Bookings from './pages/Bookings'
import HuntLog from './pages/HuntLog'
import Finance from './pages/Finance'
import Staff from './pages/Staff'
import Camps from './pages/Camps'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading Game Farm OS...</p></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading...</p></div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="animals" element={<Animals />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="hunts" element={<HuntLog />} />
        <Route path="finance" element={<Finance />} />
        <Route path="staff" element={<Staff />} />
        <Route path="camps" element={<Camps />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
