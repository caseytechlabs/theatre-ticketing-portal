import React, { useCallback, useEffect, useState } from 'react'
import { voucherApi } from '../../api/vouchers'
import { userApi } from '../../api/users'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
import { CreateVoucherRequest, User, Voucher, VoucherStatus } from '../../types'

type Filter = 'ALL' | VoucherStatus
const filters: Filter[] = ['ALL', VoucherStatus.AVAILABLE, VoucherStatus.PENDING_CLAIM, VoucherStatus.CLAIMED]

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export function AdminVouchersPage() {
  const [vouchers, setVouchers]   = useState<Voucher[]>([])
  const [clients, setClients]     = useState<User[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<Filter>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]           = useState({ customerId: '', expiresAt: '' })
  const [creating, setCreating]   = useState(false)
  const [createError, setCreateError] = useState('')
  const [toast, setToast]         = useState({ msg: '', ok: true })

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

  useEffect(() => {
    if (showCreate) {
      userApi.getByRole('CLIENT')
        .then((r) => setClients(r.data ?? []))
        .catch(console.error)
    }
  }, [showCreate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      await voucherApi.create({ customerId: form.customerId, expiresAt: new Date(form.expiresAt).toISOString() })
      setShowCreate(false)
      setForm({ customerId: '', expiresAt: '' })
      load()
      notify('Voucher created')
    } catch (e: any) { setCreateError(e.message) }
    finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this voucher?')) return
    try {
      await voucherApi.delete(id)
      setVouchers((prev) => prev.filter((v) => v.id !== id))
      notify('Voucher deleted')
    } catch (e: any) { notify(e.message, false) }
  }

  const displayed = filter === 'ALL' ? vouchers : vouchers.filter((v) => v.status === filter)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voucher Management</h1>
          <p className="text-gray-500 mt-1">{vouchers.length} vouchers in system</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
          + Create Voucher
        </button>
      </div>

      {toast.msg && (
        <div className={`mb-4 p-3 border rounded-xl text-sm font-medium ${toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {filters.map((f) => {
          const count = f === 'ALL' ? vouchers.length : vouchers.filter((v) => v.status === f).length
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f ? 'bg-slate-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {f === 'ALL' ? 'All' : f.replace('_', ' ')} ({count})
            </button>
          )
        })}
      </div>

      {loading ? <LoadingSpinner /> : displayed.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <p className="text-4xl mb-2">🎟️</p><p>No vouchers for this filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Voucher ID</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold">Reserved by</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((v) => {
                const expired = new Date(v.expiresAt) < new Date()
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 max-w-[160px] truncate">{v.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={v.status} />
                        {expired && <span className="text-xs text-red-500 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded-full">expired</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.customerId}</td>
                    <td className={`px-4 py-3 text-sm ${expired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>{fmt(v.expiresAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{v.pendingUserId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(v.id)}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreateError('') }} title="Create Voucher">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{createError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Customer</label>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white">
              <option value="">Select a client user…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.username}>{c.username} ({c.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date & Time</label>
            <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowCreate(false); setCreateError('') }}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create Voucher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
