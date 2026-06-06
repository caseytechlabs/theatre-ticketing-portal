import React, { useEffect, useState } from 'react'
import { voucherApi } from '../api/vouchers'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Voucher, VoucherStatus } from '../types'

interface StatCardProps {
  title: string
  value: number
  icon: string
  accent: string
}

function StatCard({ title, value, icon, accent }: StatCardProps) {
  return (
    <div className={`bg-white rounded-2xl border-l-4 ${accent} shadow-sm p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-4xl font-bold text-gray-800">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  )
}

export function Dashboard() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    voucherApi
      .getAll()
      .then((r) => setVouchers(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const total     = vouchers.length
  const available = vouchers.filter((v) => v.status === VoucherStatus.AVAILABLE).length
  const pending   = vouchers.filter((v) => v.status === VoucherStatus.PENDING_CLAIM).length
  const claimed   = vouchers.filter((v) => v.status === VoucherStatus.CLAIMED).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time overview of your voucher pool</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Vouchers"  value={total}     icon="🎟️" accent="border-indigo-500" />
            <StatCard title="Available"       value={available} icon="✅" accent="border-green-500"  />
            <StatCard title="Pending Claim"   value={pending}   icon="⏳" accent="border-amber-500"  />
            <StatCard title="Claimed"         value={claimed}   icon="🎫" accent="border-blue-500"   />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Voucher State Machine</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1.5 bg-green-100 text-green-800 border border-green-200 rounded-full text-sm font-medium">
                  AVAILABLE
                </span>
                <span className="text-gray-400 text-lg">→</span>
                <span className="px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-sm font-medium">
                  PENDING_CLAIM
                </span>
                <span className="text-gray-400 text-lg">→</span>
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-sm font-medium">
                  CLAIMED
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Payment failure reverts PENDING_CLAIM back to AVAILABLE.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Fraud Prevention</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Atomic Redis Lua scripts prevent double-spending
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Single-use: each voucher redeems exactly one ticket
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Auto-expiry via Redis TTL removes stale vouchers
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Concurrency-safe under high load
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
