import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'
import { AuthUser } from '../types'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('theater_auth')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password })
    const authUser: AuthUser = response.data
    setUser(authUser)
    localStorage.setItem('theater_auth', JSON.stringify(authUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('theater_auth')
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
