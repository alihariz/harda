// UC004 – Auth (user + admin login)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('user') // 'user' | 'admin'
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const endpoint = mode === 'admin' ? '/auth/admin/login' : '/auth/login'

    try {
      const { data } = await api.post(endpoint, form)
      login(
        { ...data.data?.user, role: mode === 'admin' ? 'admin' : 'user' },
        data.data?.access_token
      )
      navigate(mode === 'admin' ? '/admin' : '/')
    } catch (err) {
      setError(err.response?.data?.message ?? 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-orange-500">HARDA</span>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {['user', 'admin'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null) }}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors capitalize ${
                mode === m ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'admin' ? 'Admin' : 'User'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500 space-y-0.5">
          <p className="font-medium text-gray-600 mb-1">Demo credentials</p>
          {mode === 'user' ? (
            <>
              <p>Email: <span className="font-mono text-gray-700">user@harda.my</span></p>
              <p>Password: <span className="font-mono text-gray-700">User123!</span></p>
            </>
          ) : (
            <>
              <p>Email: <span className="font-mono text-gray-700">admin@harda.my</span></p>
              <p>Password: <span className="font-mono text-gray-700">Admin123!</span></p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
