import React, { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { bookingApi } from '../../api/bookings'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
import { Booking, BookingStatus } from '../../types'

const STORAGE_KEY = 'theater_client_booking_ids'

function storedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function BookingDetail({ booking }: { booking: Booking }) {
  const statusMsg: Record<BookingStatus, { icon: string; text: string; color: string }> = {
    [BookingStatus.PENDING]: {
      icon: '⏳',
      text: 'Your voucher is reserved. Complete your payment to confirm the booking.',
      color: 'bg-amber-50 border-amber-200 text-amber-800',
    },
    [BookingStatus.CONFIRMED]: {
      icon: '🎉',
      text: 'Payment confirmed! Your ticket is booked. Enjoy the show!',
      color: 'bg-green-50 border-green-200 text-green-800',
    },
    [BookingStatus.CANCELLED]: {
      icon: '❌',
      text: 'Your booking was cancelled. The voucher has been released back to the pool.',
      color: 'bg-red-50 border-red-200 text-red-800',
    },
  }

  const info = statusMsg[booking.status]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800">Booking Details</h2>
        <StatusBadge status={booking.status} />
      </div>

      <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${info.color}`}>
        <span className="text-xl">{info.icon}</span>
        <p>{info.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Booking ID</p>
          <p className="font-mono text-xs text-gray-700 break-all">{booking.id}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Voucher ID</p>
          <p className="font-mono text-xs text-gray-700 break-all">{booking.voucherId}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">User</p>
          <p className="font-medium text-gray-700">{booking.userId}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-0.5">Last Updated</p>
          <p className="text-gray-700">{fmt(booking.updatedAt)}</p>
        </div>
      </div>
    </div>
  )
}

export function MyBookingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupId, setLookupId] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 5000)
  }

  const fetchBooking = useCallback(async (id: string) => {
    try {
      const result = await bookingApi.getById(id)
      const booking = result.data as Booking
      setBookings((prev) => {
        const exists = prev.some((b) => b.id === booking.id)
        return exists ? prev.map((b) => (b.id === booking.id ? booking : b)) : [booking, ...prev]
      })
      const ids = Array.from(new Set([booking.id, ...storedIds()]))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch (e: any) {
      setLookupError(e.message)
    }
  }, [])

  // Auto-load from URL param and stored IDs
  useEffect(() => {
    const idFromUrl = searchParams.get('id')
    const ids = storedIds()
    const allIds = idFromUrl ? Array.from(new Set([idFromUrl, ...ids])) : ids
    if (!allIds.length) return

    setLoading(true)
    Promise.allSettled(allIds.map((id) => bookingApi.getById(id)))
      .then((results) => {
        const loaded = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map((r) => r.value.data as Booking)
        setBookings(loaded)
        // Clean up URL param after loading
        if (idFromUrl) setSearchParams({}, { replace: true })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError('')
    await fetchBooking(lookupId.trim())
    setLookupId('')
  }

  const handleConfirm = async (success: boolean) => {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      const result = await bookingApi.confirm({ bookingId: confirmTarget.id, paymentSuccess: success })
      const updated = result.data as Booking
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      setConfirmTarget(null)
      notify(success ? '🎉 Payment confirmed! Your ticket is booked.' : 'Booking cancelled. Voucher returned to pool.')
    } catch (e: any) {
      notify(e.message, false)
      setConfirmTarget(null)
    } finally {
      setConfirmLoading(false)
    }
  }

  const pendingBookings   = bookings.filter((b) => b.status === BookingStatus.PENDING)
  const settledBookings   = bookings.filter((b) => b.status !== BookingStatus.PENDING)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">My Booking</h1>
        <p className="text-gray-500">Track the status of your ticket reservation.</p>
      </div>

      {/* Lookup */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Enter your booking ID…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Track
          </button>
        </form>
        {lookupError && <p className="text-sm text-red-600 mt-2">{lookupError}</p>}
      </div>

      {toast.msg && (
        <div
          className={`mb-5 p-4 border rounded-xl text-sm font-medium ${
            toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🎟️</p>
          <p className="text-base font-medium">No bookings found</p>
          <p className="text-sm mt-1">Enter your booking ID above to track it.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending bookings — action required */}
          {pendingBookings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
                Action Required — Pending Payment
              </h2>
              <div className="space-y-4">
                {pendingBookings.map((b) => (
                  <div key={b.id}>
                    <BookingDetail booking={b} />
                    <button
                      onClick={() => setConfirmTarget(b)}
                      className="mt-3 w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Simulate Payment Confirmation
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settled bookings */}
          {settledBookings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Past Bookings
              </h2>
              <div className="space-y-4">
                {settledBookings.map((b) => (
                  <BookingDetail key={b.id} booking={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment confirm modal */}
      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Complete Payment">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Simulate the payment gateway result for your booking.
          </p>
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 space-y-1">
            <p><span className="text-indigo-400">Booking</span> <span className="font-mono text-xs">{confirmTarget?.id}</span></p>
            <p><span className="text-indigo-400">User</span> <span className="font-medium">{confirmTarget?.userId}</span></p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleConfirm(false)}
              disabled={confirmLoading}
              className="flex-1 py-3 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Cancel / Fail Payment
            </button>
            <button
              onClick={() => handleConfirm(true)}
              disabled={confirmLoading}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {confirmLoading ? 'Processing…' : '✓ Pay Now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
