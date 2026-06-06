import React, { useCallback, useEffect, useState } from 'react'
import { voucherApi } from '../../api/vouchers'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Voucher, VoucherStatus } from '../../types'

type Filter = 'ALL' | VoucherStatus

const filters: Filter[] = ['ALL', VoucherStatus.AVAILABLE, VoucherStatus.PENDING_CLAIM, VoucherStatus.CLAIMED]

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export function StaffVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    voucherApi.getAll()
      .then((r) => setVouchers(r.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const displayed = filter === 'ALL' ? vouchers : vouchers.filter((v) => v.status === filter)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
        <p className="text-gray-500 mt-1">{vouchers.length} vouchers in system</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="flex gap-2 mb-5">
        {filters.map((f) => {
          const count = f === 'ALL' ? vouchers.length : vouchers.filter((v) => v.status === f).length
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {f === 'ALL' ? 'All' : f.replace('_', ' ')} ({count})
            </button>
          )
        })}
      </div>

      {loading ? <LoadingSpinner /> : displayed.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <p className="text-4xl mb-2">🎟️</p><p>No vouchers for this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Voucher ID</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Reserved by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((v) => {
                const expired = new Date(v.expiresAt) < new Date()
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[160px] truncate">{v.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={v.status} />
                        {expired && <span className="text-xs text-red-500 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded-full">expired</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.customerId}</td>
                    <td className={`px-4 py-3 text-sm ${expired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>{fmt(v.expiresAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{v.pendingUserId ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
