import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/',           label: 'Browse Vouchers', exact: true },
  { to: '/my-booking', label: 'My Booking',      exact: false },
]

export function ClientNavbar() {
  const { pathname } = useLocation()

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to)

  return (
    <nav className="bg-indigo-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🎭</span>
            <span className="font-bold text-white text-lg tracking-tight">CineTicket</span>
          </div>
          <div className="flex items-center gap-1">
            {links.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to, exact)
                    ? 'bg-white/20 text-white'
                    : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/admin"
              className="ml-3 px-3 py-1.5 text-xs text-indigo-300 hover:text-white border border-indigo-500 hover:border-indigo-300 rounded-lg transition-colors"
            >
              Admin →
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
