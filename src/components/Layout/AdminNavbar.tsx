import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/admin',          label: 'Dashboard',          exact: true },
  { to: '/admin/vouchers', label: 'Voucher Management',  exact: false },
  { to: '/admin/bookings', label: 'Booking Management',  exact: false },
]

export function AdminNavbar() {
  const { pathname } = useLocation()

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to)

  return (
    <nav className="bg-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-xl select-none">⚙️</span>
            <span className="font-bold text-white text-base">Theater Admin</span>
            <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">
              Management Panel
            </span>
          </div>
          <div className="flex items-center gap-1">
            {links.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to, exact)
                    ? 'bg-white/20 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/"
              className="ml-3 px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg transition-colors"
            >
              ← Customer View
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
