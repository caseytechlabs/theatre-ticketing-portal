import React, { useCallback, useEffect, useState } from 'react'
import { bookingApi } from '../../api/bookings'
import { CountdownTimer } from '../../components/common/CountdownTimer'
import { Modal } from '../../components/common/Modal'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Booking, BookingStatus } from '../../types'

type Sort = { col: string; dir: 'asc' | 'desc' }

function bookingDeadline(b: { pendingExpiresAt?: string; voucherExpiresAt?: string }): number {
  const pending = b.pendingExpiresAt ? new Date(b.pendingExpiresAt).getTime() : Infinity
  const voucher = b.voucherExpiresAt ? new Date(b.voucherExpiresAt).getTime() : Infinity
  return Math.min(pending, voucher)
}

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function getValue(col: string, b: Booking): string | number {
  if (col === 'createdAt' || col === 'updatedAt') return new Date(b[col]).getTime()
  return (b as any)[col] ?? ''
}

export function ClientBookingPage() {
  const [bookings, setBookings]     = useState<Booking[]>([])
  const [loading, setLoading]       = useState(false)
  const [sort, setSort]             = useState<Sort>({ col: 'createdAt', dir: 'desc' })
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set())
  const [payTarget, setPayTarget]   = useState<Booking | null>(null)
  const [payLoading, setPayLoading] = useState(false)
  const [toast, setToast]           = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await bookingApi.getMy()
      const all = (result.data ?? []) as Booking[]
      setBookings(all)
    } catch (e: any) { notify(e.message, false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExpire = useCallback((id: string) => {
    setExpiredIds((prev) => new Set([...prev, id]))
    load()
  }, [load])

  const onSort = (col: string) =>
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })

  const Th = ({ label, col }: { label: string; col: string }) => (
    <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
      onClick={() => onSort(col)}>
      {label} <span className={sort.col === col ? 'text-gray-700' : 'text-gray-300'}>
        {sort.col === col ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )

  const handlePay = async (success: boolean) => {
    if (!payTarget) return
    setPayLoading(true)
    try {
      const result = await bookingApi.confirm({ bookingId: payTarget.id, paymentSuccess: success })
      const updated = result.data as Booking
      setBookings((prev) => prev.map((b) => b.id === updated.id ? updated : b))
      setPayTarget(null)
      notify(success ? '🎉 Payment confirmed! Your ticket is booked.' : 'Booking cancelled. Voucher released.')
    } catch (e: any) { notify(e.message, false); setPayTarget(null) }
    finally { setPayLoading(false) }
  }

  const isLocallyExpired = (b: Booking) => expiredIds.has(b.id) || Date.now() >= bookingDeadline(b)

  const sorted = [...bookings].sort((a, b) => {
    const av = getValue(sort.col, a); const bv = getValue(sort.col, b)
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1)
  })

  const pending = sorted.filter((b) => b.status === BookingStatus.PENDING && !isLocallyExpired(b))
  const settled = sorted.filter((b) => b.status !== BookingStatus.PENDING || isLocallyExpired(b))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Booking</h1>
          <p className="text-gray-500 mt-1">Track and complete your reservations</p>
        </div>
        <button onClick={load} disabled={loading}
          className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors">
          Refresh
        </button>
      </div>

      {toast.msg && (
        <div className={`mb-5 p-3 border rounded-xl text-sm font-medium ${toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.msg}
        </div>
      )}

      {loading ? <LoadingSpinner /> : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Book a voucher from the "My Vouchers" tab.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Awaiting Payment ({pending.length})</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <Th label="Booking ID" col="id" />
                      <Th label="Voucher ID" col="voucherId" />
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <Th label="Booked" col="createdAt" />
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Time Remaining</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pending.map((b) => (
                      <tr key={b.id} className="hover:bg-amber-50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.id}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.voucherId}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${b.voucherType === 'Universal' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : b.voucherType === 'Assigned' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            {b.voucherType ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(b.createdAt)}</td>
                        <td className="px-4 py-3">
                          <CountdownTimer deadline={bookingDeadline(b)} onExpire={() => handleExpire(b.id)} />
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const expired = expiredIds.has(b.id) || Date.now() >= bookingDeadline(b)
                            return (
                              <button onClick={() => setPayTarget(b)} disabled={expired}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                                Simulate Payment
                              </button>
                            )
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {settled.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">History ({settled.length})</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <Th label="Booking ID" col="id" />
                      <Th label="Voucher ID" col="voucherId" />
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <Th label="Status" col="status" />
                      <Th label="Booked" col="createdAt" />
                      <Th label="Updated" col="updatedAt" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {settled.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.id}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.voucherId}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${b.voucherType === 'Universal' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : b.voucherType === 'Assigned' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            {b.voucherType ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={isLocallyExpired(b) && b.status === BookingStatus.PENDING ? BookingStatus.CANCELLED : b.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(b.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(b.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!payTarget} onClose={() => setPayTarget(null)} title="Simulate Payment">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Simulate the payment service confirming this transaction.</p>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 space-y-1">
            <p className="font-mono text-xs break-all">{payTarget?.id}</p>
            <p>Voucher: <span className="font-mono text-xs">{payTarget?.voucherId}</span></p>
            <p>Booked: <span>{payTarget ? fmt(payTarget.createdAt) : ''}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handlePay(false)} disabled={payLoading}
              className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
              Payment Failed
            </button>
            <button onClick={() => handlePay(true)} disabled={payLoading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {payLoading ? 'Processing…' : 'Payment Success'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
