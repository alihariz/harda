import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import LanguageToggle from './LanguageToggle'
import Button from './ui/Button'

function initials(user) {
  const base = user?.username || user?.email || 'A'
  return base.slice(0, 2).toUpperCase()
}

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
    `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-orange-500 text-white shadow-[0_5px_14px_-3px_rgba(249,115,22,0.55)]'
        : 'text-slate-200 hover:bg-white/10 hover:text-white'
    }`

  const links = (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.map')}</NavLink>
      {isAdmin && (
        <>
          <NavLink to="/admin" end className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.dashboard')}</NavLink>
          <NavLink to="/admin/reports" className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.reportQueue')}</NavLink>
          <NavLink to="/admin/archive" className={linkClass} onClick={() => setMenuOpen(false)}>{t('nav.archive')}</NavLink>
        </>
      )}
    </>
  )

  return (
    <nav className="sticky top-0 z-50 bg-slate-950 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 border-b border-white/5 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand */}
          <Link to="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-extrabold text-xl tracking-wide text-white">HAR<span className="text-orange-400">DA</span></span>
            <span className="hidden sm:block text-slate-400 text-xs font-medium">{t('common.brandTagline')}</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1.5">{links}</div>

          {/* Auth controls */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <div className="flex items-center gap-2.5">
                <span className="text-slate-300 text-sm font-medium">{user.username ?? user.email}</span>
                <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold text-white bg-gradient-to-br from-orange-500 to-blue-600" aria-hidden="true">{initials(user)}</div>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold bg-white/10 hover:bg-white/20 text-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <Button as={Link} to="/login" size="sm">{t('nav.login')}</Button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-200 hover:text-white p-1"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t('nav.toggleMenu')}
            aria-expanded={menuOpen}
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
        <div className="md:hidden bg-slate-900 border-t border-white/5 px-4 py-3 flex flex-col gap-1.5">
          {links}
          <hr className="border-white/10 my-1" />
          <div className="flex items-center justify-between">
            <LanguageToggle />
            {user ? (
              <button onClick={handleLogout} className="text-sm font-semibold text-red-400 hover:text-red-300 cursor-pointer">
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
