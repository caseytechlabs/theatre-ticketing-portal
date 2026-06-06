import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingApi } from '../../api/bookings'
import { voucherApi } from '../../api/vouchers'
import { Modal } from '../../components/common/Modal'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Voucher } from '../../types'

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function ClientVouchersPage() {
  const navigate = useNavigate()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [bookTarget, setBookTarget] = useState<Voucher | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    voucherApi.getMy()
      .then((r) => setVouchers(r.data ?? []))
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
      const result = await bookingApi.initiate({ voucherId: bookTarget.id })
      const bookingId = result.data.id
      const ids: string[] = JSON.parse(localStorage.getItem('theater_client_bookings') ?? '[]')
      localStorage.setItem('theater_client_bookings', JSON.stringify([bookingId, ...ids]))
      setBookTarget(null)
      load()
      setToast(`Booking created! ID: ${bookingId}`)
      setTimeout(() => navigate('/client/booking'), 1500)
    } catch (e: any) {
      setBookingError(e.message)
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Vouchers</h1>
        <p className="text-gray-500 mt-1">Available vouchers assigned to your account</p>
      </div>

      {toast && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : vouchers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-5xl mb-3">🎟️</p>
          <p className="text-lg font-semibold text-gray-700">No vouchers available</p>
          <p className="text-sm text-gray-400 mt-1">You have no available vouchers right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {vouchers.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <StatusBadge status={v.status} />
                  <p className="text-xs text-gray-400 font-mono mt-2 break-all">{v.id}</p>
                </div>
                <span className="text-3xl select-none">🎬</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Valid until</span>
                  <span className="font-medium text-gray-700">{fmt(v.expiresAt)}</span>
                </div>
              </div>
              <button
                onClick={() => setBookTarget(v)}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!bookTarget} onClose={() => { setBookTarget(null); setBookingError('') }} title="Confirm Booking">
        <form onSubmit={handleBook} className="space-y-4">
          {bookingError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{bookingError}</p>
          )}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 space-y-1">
            <p><span className="text-indigo-400">Voucher ID</span><br />
              <span className="font-mono text-xs break-all">{bookTarget?.id}</span>
            </p>
            <p><span className="text-indigo-400">Valid until</span>{' '}
              <span className="font-medium">{bookTarget ? fmt(bookTarget.expiresAt) : ''}</span>
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Reserving this voucher holds it for 5 minutes while you complete payment.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setBookTarget(null); setBookingError('') }}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={bookingLoading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {bookingLoading ? 'Reserving…' : 'Reserve Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
