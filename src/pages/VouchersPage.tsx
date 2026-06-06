import React, { useCallback, useEffect, useState } from 'react'
import { bookingApi } from '../api/bookings'
import { voucherApi } from '../api/vouchers'
import { CreateVoucherModal } from '../components/Voucher/CreateVoucherModal'
import { VoucherCard } from '../components/Voucher/VoucherCard'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Modal } from '../components/common/Modal'
import { CreateVoucherRequest, Voucher } from '../types'

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  if (!msg) return null
  const cls =
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-700'
      : 'bg-red-50 border-red-200 text-red-700'
  return (
    <div className={`mb-5 p-3 border rounded-xl text-sm font-medium ${cls}`}>{msg}</div>
  )
}

export function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [bookTarget, setBookTarget] = useState<Voucher | null>(null)
  const [userId, setUserId] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' as 'success' | 'error' })

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500)
  }

  const load = useCallback(() => {
    setLoading(true)
    voucherApi
      .getAll()
      .then((r) => setVouchers(r.data ?? []))
      .catch((e) => notify(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (req: CreateVoucherRequest) => {
    await voucherApi.create(req)
    load()
    notify('Voucher created successfully')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this voucher?')) return
    try {
      await voucherApi.delete(id)
      setVouchers((prev) => prev.filter((v) => v.id !== id))
      notify('Voucher deleted')
    } catch (e: any) {
      notify(e.message, 'error')
    }
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookTarget) return
    setBookingLoading(true)
    try {
      await bookingApi.initiate({ userId, voucherId: bookTarget.id })
      setBookTarget(null)
      setUserId('')
      load()
      notify('Booking initiated! Go to Bookings tab to confirm payment.')
    } catch (e: any) {
      notify(e.message, 'error')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
          <p className="text-gray-500 mt-1">{vouchers.length} voucher{vouchers.length !== 1 ? 's' : ''} in pool</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          + Create Voucher
        </button>
      </div>

      <Toast msg={toast.msg} type={toast.type} />

      {loading ? (
        <LoadingSpinner />
      ) : vouchers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">🎟️</p>
          <p className="text-lg font-medium">No vouchers yet</p>
          <p className="text-sm mt-1">Click "Create Voucher" to add one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vouchers.map((v) => (
            <VoucherCard key={v.id} voucher={v} onDelete={handleDelete} onBook={setBookTarget} />
          ))}
        </div>
      )}

      <CreateVoucherModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <Modal
        isOpen={!!bookTarget}
        onClose={() => { setBookTarget(null); setUserId('') }}
        title="Initiate Booking"
      >
        <form onSubmit={handleBook} className="space-y-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700 border border-indigo-100">
            <span className="font-medium">Voucher: </span>
            <span className="font-mono text-xs break-all">{bookTarget?.id}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              placeholder="e.g. user-456"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setBookTarget(null); setUserId('') }}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookingLoading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {bookingLoading ? 'Booking…' : 'Initiate Booking'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
