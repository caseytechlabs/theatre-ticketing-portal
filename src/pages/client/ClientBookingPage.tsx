import React, { useCallback, useEffect, useState } from 'react'
import { bookingApi } from '../../api/bookings'
import { Modal } from '../../components/common/Modal'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Booking, BookingStatus } from '../../types'

const KEY = 'theater_client_bookings'
const storedIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const statusInfo: Record<BookingStatus, { icon: string; text: string; color: string }> = {
  [BookingStatus.PENDING]: {
    icon: '⏳', color: 'bg-amber-50 border-amber-200 text-amber-800',
    text: 'Your seat is reserved. Complete payment to confirm.',
  },
  [BookingStatus.CONFIRMED]: {
    icon: '🎉', color: 'bg-green-50 border-green-200 text-green-800',
    text: 'Payment confirmed! Your ticket is booked. Enjoy the show!',
  },
  [BookingStatus.CANCELLED]: {
    icon: '❌', color: 'bg-red-50 border-red-200 text-red-800',
    text: 'Booking cancelled. The voucher was released back.',
  },
}

export function ClientBookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupId, setLookupId] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [payTarget, setPayTarget] = useState<Booking | null>(null)
  const [payLoading, setPayLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 4000)
  }

  const loadAll = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    setLoading(true)
    const results = await Promise.allSettled(ids.map((id) => bookingApi.getById(id)))
    setBookings(results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value.data as Booking))
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

  const pending  = bookings.filter((b) => b.status === BookingStatus.PENDING)
  const settled  = bookings.filter((b) => b.status !== BookingStatus.PENDING)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Booking</h1>
        <p className="text-gray-500 mt-1">Track and complete your reservations</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <form onSubmit={handleLookup} className="flex gap-3">
          <input type="text" value={lookupId} onChange={(e) => setLookupId(e.target.value)}
            placeholder="Enter booking ID to track…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Track
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
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Book a voucher from the "My Vouchers" tab.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Awaiting Payment</h2>
              <div className="space-y-4">
                {pending.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <StatusBadge status={b.status} />
                      <span className="text-xs text-gray-400 font-mono">{b.id}</span>
                    </div>
                    <div className={`flex gap-2 items-start p-3 rounded-xl border text-sm ${statusInfo[b.status].color}`}>
                      <span>{statusInfo[b.status].icon}</span>
                      <p>{statusInfo[b.status].text}</p>
                    </div>
                    <button onClick={() => setPayTarget(b)}
                      className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                      Simulate Payment
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settled.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">History</h2>
              <div className="space-y-3">
                {settled.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <StatusBadge status={b.status} />
                      <span className="text-xs text-gray-400 font-mono">{b.id}</span>
                    </div>
                    <div className={`flex gap-2 items-start p-3 rounded-xl border text-sm ${statusInfo[b.status].color}`}>
                      <span>{statusInfo[b.status].icon}</span>
                      <p>{statusInfo[b.status].text}</p>
                    </div>
                    <p className="text-xs text-gray-400">Updated {fmt(b.updatedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!payTarget} onClose={() => setPayTarget(null)} title="Complete Payment">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Simulate the payment gateway result.</p>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 space-y-1">
            <p className="font-mono text-xs break-all">{payTarget?.id}</p>
            <p>Voucher: <span className="font-mono text-xs">{payTarget?.voucherId}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handlePay(false)} disabled={payLoading}
              className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
              Cancel / Fail
            </button>
            <button onClick={() => handlePay(true)} disabled={payLoading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {payLoading ? 'Processing…' : '✓ Pay Now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
