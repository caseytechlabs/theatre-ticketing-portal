import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/staff',          label: 'Vouchers',  exact: true },
  { to: '/staff/bookings', label: 'Bookings',  exact: false },
]

export function StaffLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-emerald-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="text-xl select-none">🎬</span>
              <span className="font-bold text-white">Staff Panel</span>
            </div>
            <div className="flex items-center gap-1">
              {links.map(({ to, label, exact }) => (
                <Link key={to} to={to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to, exact) ? 'bg-white/20 text-white' : 'text-emerald-100 hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="ml-4 flex items-center gap-2 pl-4 border-l border-white/20">
                <span className="text-xs text-emerald-200">{user?.username}</span>
                <span className="text-xs bg-emerald-400 text-white px-1.5 py-0.5 rounded-full">STAFF</span>
                <button onClick={logout}
                  className="text-xs text-emerald-200 hover:text-white border border-white/20 hover:border-white/40 px-2 py-1 rounded-lg transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
