import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingApi } from '../../api/bookings'
import { voucherApi } from '../../api/vouchers'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
import { Voucher, VoucherStatus } from '../../types'

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function VoucherBookCard({
  voucher,
  onBook,
}: {
  voucher: Voucher
  onBook: (v: Voucher) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-2 truncate max-w-[180px]">{voucher.id}</p>
          <StatusBadge status={voucher.status} />
        </div>
        <span className="text-3xl select-none">🎬</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Valid until</span>
          <span className="font-medium text-gray-700">{fmt(voucher.expiresAt)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Issued to</span>
          <span className="font-medium text-gray-700">{voucher.customerId}</span>
        </div>
      </div>

      <button
        onClick={() => onBook(voucher)}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
      >
        Book with this Voucher
      </button>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [bookTarget, setBookTarget] = useState<Voucher | null>(null)
  const [userId, setUserId] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    voucherApi.getAll()
      .then((r) => {
        const now = new Date()
        const available = (r.data ?? []).filter(
          (v) => v.status === VoucherStatus.AVAILABLE && new Date(v.expiresAt) > now
        )
        setVouchers(available)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookTarget) return
    setBookingError('')
    setBookingLoading(true)
    try {
      const result = await bookingApi.initiate({ userId, voucherId: bookTarget.id })
      const bookingId = result.data.id
      // Persist the booking ID so My Booking page shows it
      const key = 'theater_client_booking_ids'
      const existing: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      localStorage.setItem(key, JSON.stringify([bookingId, ...existing]))
      setBookTarget(null)
      setUserId('')
      navigate(`/my-booking?id=${bookingId}`)
    } catch (e: any) {
      setBookingError(e.message)
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
          Book Your Theater Ticket
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Select an available voucher below and enter your user ID to reserve your seat instantly.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : vouchers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-6xl mb-4">😔</p>
          <p className="text-xl font-semibold">No vouchers available right now</p>
          <p className="text-sm mt-2">Check back soon or contact the box office.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {vouchers.length} voucher{vouchers.length !== 1 ? 's' : ''} available
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vouchers.map((v) => (
              <VoucherBookCard key={v.id} voucher={v} onBook={setBookTarget} />
            ))}
          </div>
        </>
      )}

      {/* Book modal */}
      <Modal
        isOpen={!!bookTarget}
        onClose={() => { setBookTarget(null); setUserId(''); setBookingError('') }}
        title="Reserve Your Ticket"
      >
        <form onSubmit={handleBook} className="space-y-4">
          {bookingError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
              {bookingError}
            </p>
          )}

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 space-y-1">
            <p><span className="text-indigo-400">Voucher</span> <span className="font-mono text-xs break-all">{bookTarget?.id}</span></p>
            <p><span className="text-indigo-400">Valid until</span> <span className="font-medium">{bookTarget ? fmt(bookTarget.expiresAt) : ''}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              placeholder="e.g. user-456"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <p className="text-xs text-gray-400">
            After booking, proceed to payment. Your voucher will be held for 5 minutes.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setBookTarget(null); setUserId(''); setBookingError('') }}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookingLoading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {bookingLoading ? 'Reserving…' : 'Reserve Now'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
