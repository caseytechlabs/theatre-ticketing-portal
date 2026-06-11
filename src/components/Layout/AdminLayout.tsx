import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/admin',          label: 'Vouchers',  exact: true },
  { to: '/admin/bookings', label: 'Bookings',  exact: false },
  { to: '/admin/users',    label: 'Users',     exact: false },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to)

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-slate-800 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="text-xl select-none">⚙️</span>
              <span className="font-bold text-white">Admin Panel</span>
            </div>
            <div className="flex items-center gap-1">
              {links.map(({ to, label, exact }) => (
                <Link key={to} to={to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to, exact) ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="ml-4 flex items-center gap-2 pl-4 border-l border-white/20">
                <span className="text-xs text-slate-300">{user?.username}</span>
                <button onClick={logout}
                  className="text-xs text-slate-300 hover:text-white border border-white/20 hover:border-white/40 px-2 py-1 rounded-lg transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
