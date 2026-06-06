import React, { useCallback, useEffect, useState } from 'react'
import { bookingApi } from '../../api/bookings'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
import { Booking, BookingStatus } from '../../types'

const KEY = 'theater_staff_bookings'
const storedIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export function StaffBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupId, setLookupId] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3500)
  }

  const loadAll = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    setLoading(true)
    const results = await Promise.allSettled(ids.map((id) => bookingApi.getById(id)))
    setBookings(results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map((r) => r.value.data as Booking))
    setLoading(false)
  }, [])

  useEffect(() => { loadAll(storedIds()) }, [loadAll])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError('')
    try {
      const result = await bookingApi.getById(lookupId.trim())
      const b = result.data as Booking
      setBookings((prev) => prev.some((x) => x.id === b.id) ? prev.map((x) => x.id === b.id ? b : x) : [b, ...prev])
      const ids = Array.from(new Set([b.id, ...storedIds()]))
      localStorage.setItem(KEY, JSON.stringify(ids))
      setLookupId('')
    } catch (e: any) { setLookupError(e.message) }
  }

  const handleConfirm = async (success: boolean) => {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      const result = await bookingApi.confirm({ bookingId: confirmTarget.id, paymentSuccess: success })
      const updated = result.data as Booking
      setBookings((prev) => prev.map((b) => b.id === updated.id ? updated : b))
      setConfirmTarget(null)
      notify(success ? 'Payment confirmed — voucher claimed.' : 'Payment declined — voucher released.')
    } catch (e: any) { notify(e.message, false); setConfirmTarget(null) }
    finally { setConfirmLoading(false) }
  }

  const pending = bookings.filter((b) => b.status === BookingStatus.PENDING)
  const others  = bookings.filter((b) => b.status !== BookingStatus.PENDING)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
        <p className="text-gray-500 mt-1">Confirm or decline customer payments</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <form onSubmit={handleLookup} className="flex gap-3">
          <input type="text" value={lookupId} onChange={(e) => setLookupId(e.target.value)}
            placeholder="Enter booking ID…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          <button type="submit" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
            Look Up
          </button>
        </form>
        {lookupError && <p className="text-sm text-red-600 mt-2">{lookupError}</p>}
      </div>

      {toast.msg && (
        <div className={`mb-5 p-3 border rounded-xl text-sm font-medium ${toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.msg}
        </div>
      )}

      {loading ? <LoadingSpinner /> : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>Look up a booking ID above to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Pending Confirmation ({pending.length})</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 font-semibold">Booking ID</th>
                      <th className="px-4 py-3 font-semibold">Voucher</th>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pending.map((b) => (
                      <tr key={b.id} className="hover:bg-amber-50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[140px] truncate">{b.id}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[140px] truncate">{b.voucherId}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{b.userId}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{fmt(b.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setConfirmTarget(b)}
                            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                            Confirm Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Settled</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 font-semibold">Booking ID</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {others.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[160px] truncate">{b.id}</td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-700">{b.userId}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{fmt(b.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Payment Result">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 space-y-1 border border-gray-100">
            <p><span className="text-gray-400">Booking</span> <span className="font-mono text-xs break-all">{confirmTarget?.id}</span></p>
            <p><span className="text-gray-400">User</span> <span className="font-medium">{confirmTarget?.userId}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleConfirm(false)} disabled={confirmLoading}
              className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
              Payment Failed
            </button>
            <button onClick={() => handleConfirm(true)} disabled={confirmLoading}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {confirmLoading ? 'Processing…' : 'Payment Success'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
