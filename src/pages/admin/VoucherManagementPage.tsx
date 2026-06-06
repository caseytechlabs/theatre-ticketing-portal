import React, { useCallback, useEffect, useState } from 'react'
import { voucherApi } from '../../api/vouchers'
import { CreateVoucherModal } from '../../components/Voucher/CreateVoucherModal'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { CreateVoucherRequest, Voucher, VoucherStatus } from '../../types'

type Filter = 'ALL' | VoucherStatus

function fmt(d: string) {
  return new Date(d).toLocaleString()
}

function VoucherRow({
  voucher,
  onDelete,
}: {
  voucher: Voucher
  onDelete: (id: string) => void
}) {
  const expired = new Date(voucher.expiresAt) < new Date()
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[180px] truncate">
        {voucher.id}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={voucher.status} />
          {expired && (
            <span className="text-xs text-red-500 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded-full">
              expired
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{voucher.customerId}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{fmt(voucher.createdAt)}</td>
      <td className={`px-4 py-3 text-sm ${expired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
        {fmt(voucher.expiresAt)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {voucher.pendingUserId ?? voucher.claimedAt ? fmt(voucher.claimedAt ?? '') : '—'}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(voucher.id)}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

export function VoucherManagementPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [toast, setToast] = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    voucherApi.getAll()
      .then((r) => setVouchers(r.data ?? []))
      .catch((e) => notify(e.message, false))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (req: CreateVoucherRequest) => {
    await voucherApi.create(req)
    load()
    notify('Voucher created')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this voucher?')) return
    try {
      await voucherApi.delete(id)
      setVouchers((prev) => prev.filter((v) => v.id !== id))
      notify('Voucher deleted')
    } catch (e: any) {
      notify(e.message, false)
    }
  }

  const filters: Filter[] = ['ALL', VoucherStatus.AVAILABLE, VoucherStatus.PENDING_CLAIM, VoucherStatus.CLAIMED]
  const displayed = filter === 'ALL' ? vouchers : vouchers.filter((v) => v.status === filter)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voucher Management</h1>
          <p className="text-gray-500 mt-1">{vouchers.length} total vouchers in Redis</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
        >
          + Create Voucher
        </button>
      </div>

      {toast.msg && (
        <div
          className={`mb-4 p-3 border rounded-xl text-sm font-medium ${
            toast.ok
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => {
          const count =
            f === 'ALL' ? vouchers.length : vouchers.filter((v) => v.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-slate-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'ALL' ? 'All' : f.replace('_', ' ')} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-2">🎟️</p>
          <p>No vouchers found for this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Voucher ID</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Claimed / Pending</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((v) => (
                <VoucherRow key={v.id} voucher={v} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateVoucherModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
