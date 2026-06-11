import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingApi } from '../../api/bookings'
import { voucherApi } from '../../api/vouchers'
import { Modal } from '../../components/common/Modal'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Voucher } from '../../types'

type Sort = { col: string; dir: 'asc' | 'desc' }

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function getValue(col: string, v: Voucher): string | number {
  if (col === 'expiresAt') return new Date(v.expiresAt).getTime()
  return (v as any)[col] ?? ''
}

export function ClientVouchersPage() {
  const navigate = useNavigate()
  const [vouchers, setVouchers]     = useState<Voucher[]>([])
  const [loading, setLoading]       = useState(true)
  const [sort, setSort]             = useState<Sort>({ col: 'expiresAt', dir: 'asc' })
  const [bookTarget, setBookTarget] = useState<Voucher | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError]     = useState('')
  const [manualId, setManualId]     = useState('')
  const [manualLoading, setManualLoading]   = useState(false)
  const [manualError, setManualError]       = useState('')
  const [toast, setToast]           = useState('')

  const load = useCallback(() => {
    setLoading(true)
    voucherApi.getMy()
      .then((r) => setVouchers(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

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

  const initiateAndRedirect = async (voucherId: string) => {
    await bookingApi.initiate({ voucherId })
    setToast('Booking created! Voucher reserved — redirecting to payment…')
    setTimeout(() => navigate('/client/booking'), 1500)
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookTarget) return
    setBookingError('')
    setBookingLoading(true)
    try {
      await initiateAndRedirect(bookTarget.id)
      setBookTarget(null)
      load()
    } catch (e: any) { setBookingError(e.message) }
    finally { setBookingLoading(false) }
  }

  const handleManualBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualError('')
    setManualLoading(true)
    try {
      await initiateAndRedirect(manualId.trim())
      setManualId('')
    } catch (e: any) { setManualError(e.message) }
    finally { setManualLoading(false) }
  }

  const displayed = [...vouchers].sort((a, b) => {
    const av = getValue(sort.col, a); const bv = getValue(sort.col, b)
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1)
  })

  return (
    <div className="space-y-6">
      {/* Manual booking by voucher ID */}
      <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Book by Voucher ID</h2>
        <form onSubmit={handleManualBook} className="flex gap-3">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Enter voucher ID…"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button type="submit" disabled={manualLoading || !manualId.trim()}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap">
            {manualLoading ? 'Booking…' : 'Book Ticket'}
          </button>
        </form>
        {manualError && <p className="text-sm text-red-600 mt-2">{manualError}</p>}
      </div>

      {toast && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* My Vouchers table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Vouchers</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Available vouchers you can book</p>
          </div>
          <button onClick={load} disabled={loading}
            className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors">
            Refresh
          </button>
        </div>

        {loading ? <LoadingSpinner /> : vouchers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-5xl mb-3">🎟️</p>
            <p className="text-lg font-semibold text-gray-700">No vouchers available</p>
            <p className="text-sm text-gray-400 mt-1">You have no available vouchers right now.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <Th label="Voucher ID" col="id" />
                  <Th label="Status" col="status" />
                  <Th label="Expires" col="expiresAt" />
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((v) => (
                  <tr key={v.id} className="hover:bg-indigo-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{v.id}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(v.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setBookTarget(v)}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                        Book Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            Reserving this voucher marks it as <strong>PENDING_CLAIM</strong>. You'll confirm payment on the next screen.
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
