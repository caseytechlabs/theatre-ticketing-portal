import React, { useCallback, useEffect, useState } from 'react'
import { bookingApi } from '../../api/bookings'
import { CountdownTimer } from '../../components/common/CountdownTimer'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
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

function VoucherTypeBadge({ type }: { type?: string }) {
  const style =
    type === 'Universal' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
    type === 'Assigned'  ? 'bg-purple-50 text-purple-600 border-purple-200' :
                           'bg-gray-50 text-gray-400 border-gray-200'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${style}`}>
      {type ?? '—'}
    </span>
  )
}

export function AdminBookingsPage() {
  const [bookings, setBookings]           = useState<Booking[]>([])
  const [loading, setLoading]             = useState(false)
  const [sort, setSort]                   = useState<Sort>({ col: 'createdAt', dir: 'desc' })
  const [expiredIds, setExpiredIds]       = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [confirmTarget, setConfirmTarget] = useState<Booking | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [toast, setToast]                 = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await bookingApi.getAll()
      setBookings((result.data ?? []) as Booking[])
      setSelectedIds(new Set())
    } catch (e: any) { notify(e.message, false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExpire = useCallback((id: string) => {
    setExpiredIds((prev) => new Set([...prev, id]))
    setTimeout(load, 35_000)
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

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const toggleSelectAll = (ids: string[]) =>
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })

  const handleConfirm = async (success: boolean) => {
    if (!confirmTarget) return
    setConfirmLoading(true)
    try {
      const result = await bookingApi.confirm({ bookingId: confirmTarget.id, paymentSuccess: success })
      const updated = result.data as Booking
      setBookings((prev) => prev.map((b) => b.id === updated.id ? { ...updated, voucherType: b.voucherType } : b))
      setConfirmTarget(null)
      notify(success ? 'Payment confirmed — voucher claimed.' : 'Payment declined — voucher released.')
    } catch (e: any) { notify(e.message, false); setConfirmTarget(null) }
    finally { setConfirmLoading(false) }
  }

  const handleDeleteOne = async (id: string) => {
    if (!confirm('Delete this booking?')) return
    try {
      await bookingApi.deleteOne(id)
      setBookings((prev) => prev.filter((b) => b.id !== id))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      notify('Booking deleted')
    } catch (e: any) { notify(e.message, false) }
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} booking${selectedIds.size !== 1 ? 's' : ''}?`)) return
    setDeleting(true)
    try {
      const results = await Promise.allSettled([...selectedIds].map((id) => bookingApi.deleteOne(id)))
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      load()
      notify(failed === 0 ? `Deleted ${succeeded} booking${succeeded !== 1 ? 's' : ''}` : `${succeeded} deleted, ${failed} failed`, failed === 0)
    } catch (e: any) { notify(e.message, false) }
    finally { setDeleting(false) }
  }

  const isLocallyExpired = (b: Booking) => expiredIds.has(b.id) || Date.now() >= bookingDeadline(b)

  const sorted = [...bookings].sort((a, b) => {
    const av = getValue(sort.col, a); const bv = getValue(sort.col, b)
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1)
  })

  const pending = sorted.filter((b) => b.status === BookingStatus.PENDING && !isLocallyExpired(b))
  const settled = sorted.filter((b) => b.status !== BookingStatus.PENDING || isLocallyExpired(b))

  const CheckboxTh = ({ ids }: { ids: string[] }) => {
    const allChecked = ids.length > 0 && ids.every((id) => selectedIds.has(id))
    const someChecked = ids.some((id) => selectedIds.has(id))
    return (
      <th className="px-3 py-3 w-8">
        <input type="checkbox" checked={allChecked}
          ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
          onChange={() => toggleSelectAll(ids)}
          className="rounded border-gray-300 text-slate-700 focus:ring-slate-500 cursor-pointer" />
      </th>
    )
  }

  const CheckboxTd = ({ id }: { id: string }) => (
    <td className="px-3 py-3">
      <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleSelect(id)}
        className="rounded border-gray-300 text-slate-700 focus:ring-slate-500 cursor-pointer" />
    </td>
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-500 mt-1">Confirm or decline customer payments</p>
        </div>
        <div className="flex gap-2 items-center">
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deleting}
              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {deleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
          <button onClick={load} disabled={loading}
            className="text-sm text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {toast.msg && (
        <div className={`mb-5 p-3 border rounded-xl text-sm font-medium ${toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.msg}
        </div>
      )}

      {loading ? <LoadingSpinner /> : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <p className="text-4xl mb-2">📋</p>
          <p>No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Pending Confirmation ({pending.length})</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[1200px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <CheckboxTh ids={pending.map((b) => b.id)} />
                      <Th label="Booking ID" col="id" />
                      <Th label="Voucher ID" col="voucherId" />
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <Th label="User" col="userId" />
                      <Th label="Booked" col="createdAt" />
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Expires In</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pending.map((b) => (
                      <tr key={b.id} className={`hover:bg-amber-50 ${selectedIds.has(b.id) ? 'bg-amber-50' : ''}`}>
                        <CheckboxTd id={b.id} />
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.id}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.voucherId}</td>
                        <td className="px-4 py-3"><VoucherTypeBadge type={b.voucherType} /></td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{b.userId}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(b.createdAt)}</td>
                        <td className="px-4 py-3">
                          <CountdownTimer deadline={bookingDeadline(b)} onExpire={() => handleExpire(b.id)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmTarget(b)}
                              className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                              Confirm Payment
                            </button>
                            <button onClick={() => handleDeleteOne(b.id)}
                              className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              Delete
                            </button>
                          </div>
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
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Settled ({settled.length})</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[1250px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <CheckboxTh ids={settled.map((b) => b.id)} />
                      <Th label="Booking ID" col="id" />
                      <Th label="Voucher ID" col="voucherId" />
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <Th label="Status" col="status" />
                      <Th label="User" col="userId" />
                      <Th label="Booked" col="createdAt" />
                      <Th label="Updated" col="updatedAt" />
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {settled.map((b) => (
                      <tr key={b.id} className={`hover:bg-gray-50 ${selectedIds.has(b.id) ? 'bg-slate-50' : ''}`}>
                        <CheckboxTd id={b.id} />
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.id}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all">{b.voucherId}</td>
                        <td className="px-4 py-3"><VoucherTypeBadge type={b.voucherType} /></td>
                        <td className="px-4 py-3"><StatusBadge status={isLocallyExpired(b) && b.status === BookingStatus.PENDING ? BookingStatus.CANCELLED : b.status} /></td>
                        <td className="px-4 py-3 text-sm text-gray-700">{b.userId}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(b.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(b.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteOne(b.id)}
                            className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        </td>
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
            <p><span className="text-gray-400">Type</span> <VoucherTypeBadge type={confirmTarget?.voucherType} /></p>
            <p><span className="text-gray-400">Booked</span> <span>{confirmTarget ? fmt(confirmTarget.createdAt) : ''}</span></p>
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
