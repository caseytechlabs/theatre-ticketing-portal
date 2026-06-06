import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { voucherApi } from '../../api/vouchers'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Voucher, VoucherStatus } from '../../types'

interface StatCardProps {
  title: string
  value: number
  icon: string
  accent: string
  to: string
}

function StatCard({ title, value, icon, accent, to }: StatCardProps) {
  return (
    <Link
      to={to}
      className={`bg-white rounded-2xl border-l-4 ${accent} shadow-sm p-6 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-4xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </Link>
  )
}

export function AdminDashboard() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    voucherApi.getAll()
      .then((r) => setVouchers(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const total     = vouchers.length
  const available = vouchers.filter((v) => v.status === VoucherStatus.AVAILABLE).length
  const pending   = vouchers.filter((v) => v.status === VoucherStatus.PENDING_CLAIM).length
  const claimed   = vouchers.filter((v) => v.status === VoucherStatus.CLAIMED).length
  const expired   = vouchers.filter((v) => new Date(v.expiresAt) < new Date()).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Live snapshot of the voucher pool</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Vouchers" value={total}     icon="🎟️" accent="border-slate-400"  to="/admin/vouchers" />
            <StatCard title="Available"      value={available} icon="✅" accent="border-green-500"  to="/admin/vouchers" />
            <StatCard title="Pending Claim"  value={pending}   icon="⏳" accent="border-amber-500"  to="/admin/bookings" />
            <StatCard title="Claimed"        value={claimed}   icon="🎫" accent="border-blue-500"   to="/admin/vouchers" />
          </div>

          {expired > 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <span className="text-lg">⚠️</span>
              <span>
                <strong>{expired}</strong> voucher{expired !== 1 ? 's have' : ' has'} expired and will be purged by Redis TTL.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Voucher State Machine</h2>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span className="px-3 py-1.5 bg-green-100 text-green-800 border border-green-200 rounded-full text-sm font-medium">AVAILABLE</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-sm font-medium">PENDING_CLAIM</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-sm font-medium">CLAIMED</span>
              </div>
              <p className="text-sm text-gray-500">
                Payment failure reverts <strong>PENDING_CLAIM → AVAILABLE</strong>.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="flex flex-col gap-2">
                <Link
                  to="/admin/vouchers"
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors"
                >
                  <span>🎟️</span> Manage Vouchers
                </Link>
                <Link
                  to="/admin/bookings"
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-700 transition-colors"
                >
                  <span>📋</span> Confirm Pending Payments
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
