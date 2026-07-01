import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import LanguageToggle from './LanguageToggle'

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const { t } = useI18n()
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
            <span className="hidden sm:block text-gray-400 text-xs mt-0.5">{t('common.brandTagline')}</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={linkClass}>{t('nav.map')}</NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin" end className={linkClass}>{t('nav.dashboard')}</NavLink>
                <NavLink to="/admin/reports" className={linkClass}>{t('nav.reportQueue')}</NavLink>
                <NavLink to="/admin/archive" className={linkClass}>{t('nav.archive')}</NavLink>
              </>
            )}
          </div>

          {/* Auth controls */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <>
                <span className="text-gray-400 text-sm">{user.username ?? user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-md transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-sm bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t('nav.toggleMenu')}
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
          <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.map')}</NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin" end className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.dashboard')}</NavLink>
              <NavLink to="/admin/reports" className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.reportQueue')}</NavLink>
              <NavLink to="/admin/archive" className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.archive')}</NavLink>
            </>
          )}
          <hr className="border-gray-700" />
          <div className="flex items-center justify-between">
            <LanguageToggle />
            {user ? (
              <button onClick={handleLogout} className="text-left text-sm text-red-400 hover:text-red-300">
                {t('nav.logout')} ({user.username ?? user.email})
              </button>
            ) : (
              <NavLink to="/login" className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.login')}</NavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
