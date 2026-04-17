import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors hover:text-orange-400 ${
      isActive ? 'text-orange-400' : 'text-gray-200'
    }`

  return (
    <nav className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-orange-400 font-bold text-xl tracking-wide">HARDA</span>
            <span className="hidden sm:block text-gray-400 text-xs mt-0.5">Road Hazard Detection</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={linkClass}>Map</NavLink>
            <NavLink to="/submit" className={linkClass}>Submit Report</NavLink>
            {user && <NavLink to="/reports" className={linkClass}>My Reports</NavLink>}
            {isAdmin && (
              <>
                <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
                <NavLink to="/admin/reports" className={linkClass}>Report Queue</NavLink>
              </>
            )}
          </div>

          {/* Auth controls */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-gray-400 text-sm">{user.username ?? user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700 px-4 py-3 flex flex-col gap-3">
          <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>Map</NavLink>
          <NavLink to="/submit" className={linkClass} onClick={() => setMenuOpen(false)}>Submit Report</NavLink>
          {user && <NavLink to="/reports" className={linkClass} onClick={() => setMenuOpen(false)}>My Reports</NavLink>}
          {isAdmin && (
            <>
              <NavLink to="/admin" end className={linkClass} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
              <NavLink to="/admin/reports" className={linkClass} onClick={() => setMenuOpen(false)}>Report Queue</NavLink>
            </>
          )}
          <hr className="border-gray-700" />
          {user ? (
            <button onClick={handleLogout} className="text-left text-sm text-red-400 hover:text-red-300">
              Logout ({user.username ?? user.email})
            </button>
          ) : (
            <NavLink to="/login" className={linkClass} onClick={() => setMenuOpen(false)}>Login</NavLink>
          )}
        </div>
      )}
    </nav>
  )
}
