import React, { useCallback, useEffect, useState } from 'react'
import { bookingApi } from '../../api/bookings'
import { BookingCard } from '../../components/Booking/BookingCard'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
import { Booking } from '../../types'

const STORAGE_KEY = 'theater_admin_booking_ids'

function storedIds(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

export function BookingManagementPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [lookupId, setLookupId] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 4000)
  }

  const loadAll = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    setLoading(true)
    const results = await Promise.allSettled(ids.map((id) => bookingApi.getById(id)))
    const loaded = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value.data as Booking)
    setBookings(loaded)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll(storedIds()) }, [loadAll])

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError('')
    try {
      const result = await bookingApi.getById(lookupId.trim())
      const booking = result.data as Booking
      setBookings((prev) => {
        const exists = prev.some((b) => b.id === booking.id)
        return exists ? prev.map((b) => (b.id === booking.id ? booking : b)) : [booking, ...prev]
      })
      const ids = Array.from(new Set([booking.id, ...storedIds()]))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
      setLookupId('')
    } catch (e: any) {
      setLookupError(e.message)
    }
  }

  const handleConfirm = async (success: boolean) => {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      const result = await bookingApi.confirm({ bookingId: confirmTarget.id, paymentSuccess: success })
      const updated = result.data as Booking
      setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      setConfirmTarget(null)
      notify(success ? 'Payment confirmed — voucher claimed.' : 'Payment declined — voucher released.')
    } catch (e: any) {
      notify(e.message, false)
      setConfirmTarget(null)
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
        <p className="text-gray-500 mt-1">Confirm payments and track booking states</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Look up a booking by ID</p>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Paste booking ID…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Look Up
          </button>
        </form>
        {lookupError && <p className="text-sm text-red-600 mt-2">{lookupError}</p>}
      </div>

      {toast.msg && (
        <div
          className={`mb-5 p-3 border rounded-xl text-sm font-medium ${
            toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-2">📋</p>
          <p>No bookings tracked yet. Look one up above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} onConfirm={setConfirmTarget} />
          ))}
        </div>
      )}

      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Payment Result">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-600 space-y-1 border border-gray-100">
            <p><span className="text-gray-400">Booking</span> <span className="font-mono text-xs break-all">{confirmTarget?.id}</span></p>
            <p><span className="text-gray-400">Voucher</span> <span className="font-mono text-xs break-all">{confirmTarget?.voucherId}</span></p>
            <p><span className="text-gray-400">User</span> <span className="font-medium">{confirmTarget?.userId}</span></p>
          </div>
          <p className="text-sm font-medium text-gray-700">Did the payment succeed?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleConfirm(false)}
              disabled={confirmLoading}
              className="flex-1 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Payment Failed
            </button>
            <button
              onClick={() => handleConfirm(true)}
              disabled={confirmLoading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {confirmLoading ? 'Processing…' : 'Payment Success'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
