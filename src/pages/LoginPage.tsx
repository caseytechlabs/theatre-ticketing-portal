import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in — redirect to role home
  if (isAuthenticated && user) {
    if (user.role === 'CLIENT') return <Navigate to="/client" replace />
    if (user.role === 'ADMIN')  return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      // Redirect after state update — read role from storage since state may not re-render yet
      const raw = localStorage.getItem('theater_auth')
      if (raw) {
        const { role } = JSON.parse(raw)
        if (role === 'CLIENT') navigate('/client', { replace: true })
        else navigate('/admin', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-6xl">🎭</span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-3">CineTicket</h1>
          <p className="text-gray-500 text-sm mt-1">Theater Ticketing System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
                {error}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="e.g. admin"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 bg-white/70 backdrop-blur rounded-2xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1.5">
          <p className="font-semibold text-gray-600 mb-2">Demo accounts</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <p><span className="font-medium text-gray-700">admin</span> / admin123</p>
            <p className="text-indigo-600 text-xs">Full access</p>
            <p><span className="font-medium text-gray-700">client1</span> / client123</p>
            <p className="text-purple-600 text-xs">Book tickets</p>
            <p><span className="font-medium text-gray-700">client2</span> / client123</p>
            <p className="text-purple-600 text-xs">Book tickets</p>
          </div>
        </div>
      </div>
    </div>
  )
}
