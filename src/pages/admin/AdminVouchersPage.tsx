import React, { useCallback, useEffect, useState } from 'react'
import { voucherApi } from '../../api/vouchers'
import { userApi } from '../../api/users'
import { StatusBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
import { CreateVoucherRequest, User, Voucher, VoucherStatus } from '../../types'

type Filter = 'ALL' | VoucherStatus
type SortDir = 'asc' | 'desc'
type Sort = { col: string; dir: SortDir }

const filters: Filter[] = ['ALL', VoucherStatus.AVAILABLE, VoucherStatus.PENDING_CLAIM, VoucherStatus.CLAIMED]

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function getValue(col: string, v: Voucher): string | number {
  if (col === 'expiresAt' || col === 'createdAt') return new Date((v as any)[col]).getTime()
  return ((v as any)[col] ?? '') as string
}

function applySorted(data: Voucher[], s: Sort): Voucher[] {
  return [...data].sort((a, b) => {
    const av = getValue(s.col, a); const bv = getValue(s.col, b)
    return (av < bv ? -1 : av > bv ? 1 : 0) * (s.dir === 'asc' ? 1 : -1)
  })
}

export function AdminVouchersPage() {
  const [vouchers, setVouchers]   = useState<Voucher[]>([])
  const [clients, setClients]     = useState<User[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<Filter>('ALL')
  const [sort, setSort]           = useState<Sort>({ col: 'expiresAt', dir: 'desc' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]           = useState<CreateVoucherRequest & { quantity: number }>({ expiresAt: '', quantity: 1 })
  const [creating, setCreating]   = useState(false)
  const [createError, setCreateError] = useState('')
  const [bulkCreating, setBulkCreating] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [toast, setToast]         = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    voucherApi.getAll()
      .then((r) => { setVouchers(r.data ?? []); setSelectedIds(new Set()) })
      .catch((e) => notify(e.message, false))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (showCreate) {
      userApi.getByRole('CLIENT').then((r) => setClients(r.data ?? [])).catch(console.error)
    }
  }, [showCreate])

  const onSort = (col: string) =>
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })

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

  const handleDeleteOne = async (id: string) => {
    if (!confirm('Delete this voucher?')) return
    try {
      await voucherApi.delete(id)
      setVouchers((prev) => prev.filter((v) => v.id !== id))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      notify('Voucher deleted')
    } catch (e: any) { notify(e.message, false) }
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.size} voucher${selectedIds.size !== 1 ? 's' : ''}?`)) return
    setDeleting(true)
    try {
      const results = await Promise.allSettled([...selectedIds].map((id) => voucherApi.delete(id)))
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      load()
      notify(failed === 0 ? `Deleted ${succeeded} voucher${succeeded !== 1 ? 's' : ''}` : `${succeeded} deleted, ${failed} failed`, failed === 0)
    } catch (e: any) { notify(e.message, false) }
    finally { setDeleting(false) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (new Date(form.expiresAt) <= new Date()) {
      setCreateError('Expiry date must be in the future.')
      return
    }
    setCreating(true)
    try {
      const qty = Math.max(1, form.quantity)
      const expiresAt = new Date(form.expiresAt).toISOString()
      const results = await Promise.allSettled(
        Array.from({ length: qty }, () => voucherApi.create({ expiresAt }))
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      setShowCreate(false)
      setForm({ expiresAt: '', quantity: 1 })
      load()
      notify(failed === 0
        ? `Created ${succeeded} universal voucher${succeeded !== 1 ? 's' : ''}`
        : `${succeeded} created, ${failed} failed`, failed === 0)
    } catch (e: any) { setCreateError(e.message) }
    finally { setCreating(false) }
  }

  const handleBulkCreate = async () => {
    if (!confirm('Assign one 24-hour voucher to every client user?')) return
    setBulkCreating(true)
    try {
      const usersResult = await userApi.getByRole('CLIENT')
      const allClients: User[] = usersResult.data ?? []
      if (allClients.length === 0) { notify('No client users found.', false); return }
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const results = await Promise.allSettled(
        allClients.map((c) => voucherApi.create({ customerId: c.username, expiresAt }))
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      load()
      notify(failed === 0
        ? `Created ${succeeded} voucher${succeeded !== 1 ? 's' : ''} (24h)`
        : `${succeeded} created, ${failed} failed`, failed === 0)
    } catch (e: any) { notify(e.message, false) }
    finally { setBulkCreating(false) }
  }

  const isUniversal = (v: Voucher) => !v.customerId || v.customerId.trim() === ''
  const filtered = filter === 'ALL' ? vouchers : vouchers.filter((v) => v.status === filter)
  const userVouchers      = applySorted(filtered.filter((v) => !isUniversal(v)), sort)
  const universalVouchers = applySorted(filtered.filter(isUniversal), sort)

  const Th = ({ label, col }: { label: string; col: string }) => (
    <th className="px-4 py-3 font-semibold cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
      onClick={() => onSort(col)}>
      {label} <span className={sort.col === col ? 'text-gray-700' : 'text-gray-300'}>
        {sort.col === col ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </th>
  )

  const VoucherTable = ({ rows, showCustomer }: { rows: Voucher[]; showCustomer: boolean }) => {
    const rowIds = rows.map((v) => v.id)
    const allChecked = rowIds.length > 0 && rowIds.every((id) => selectedIds.has(id))
    const someChecked = rowIds.some((id) => selectedIds.has(id))
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-3 w-8">
                <input type="checkbox" checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                  onChange={() => toggleSelectAll(rowIds)}
                  className="rounded border-gray-300 text-slate-700 focus:ring-slate-500 cursor-pointer" />
              </th>
              <Th label="Voucher ID" col="id" />
              <Th label="Status" col="status" />
              {showCustomer && <Th label="Customer" col="customerId" />}
              <Th label="Expires" col="expiresAt" />
              <Th label="Reserved By" col="pendingUserId" />
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((v) => {
              const expired = v.status !== VoucherStatus.CLAIMED && new Date(v.expiresAt) < new Date()
              return (
                <tr key={v.id} className={`hover:bg-gray-50 ${selectedIds.has(v.id) ? 'bg-slate-50' : ''}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedIds.has(v.id)} onChange={() => toggleSelect(v.id)}
                      className="rounded border-gray-300 text-slate-700 focus:ring-slate-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500 break-all max-w-[220px]">{v.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={v.status} />
                      {expired && <span className="text-xs text-red-500 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded-full">expired</span>}
                    </div>
                  </td>
                  {showCustomer && <td className="px-4 py-3 text-sm text-gray-700">{v.customerId}</td>}
                  <td className={`px-4 py-3 text-sm whitespace-nowrap ${expired ? 'text-red-500 font-medium' : 'text-gray-500'}`}>{fmt(v.expiresAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{v.pendingUserId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDeleteOne(v.id)}
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
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voucher Management</h1>
          <p className="text-gray-500 mt-1">{vouchers.length} vouchers in system</p>
        </div>
        <div className="flex gap-2 items-center">
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deleting}
              className="text-sm bg-red-600 text-white px-3 py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
              {deleting ? 'Deleting…' : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
          <button onClick={load} disabled={loading}
            className="text-sm text-indigo-600 border border-indigo-200 px-3 py-2 rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors">
            Refresh
          </button>
          <button onClick={handleBulkCreate} disabled={bulkCreating}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
            {bulkCreating ? 'Creating…' : 'Assign Voucher to Each Client'}
          </button>
          <button onClick={() => setShowCreate(true)}
            className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
            Create Universal Voucher
          </button>
        </div>
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

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-8">
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              User Vouchers ({userVouchers.length})
            </h2>
            {userVouchers.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                No user vouchers for this filter.
              </div>
            ) : (
              <VoucherTable rows={userVouchers} showCustomer={true} />
            )}
          </div>

          <div>
            <h2 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-3">
              Universal Vouchers ({universalVouchers.length})
            </h2>
            {universalVouchers.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                No universal vouchers for this filter.
              </div>
            ) : (
              <VoucherTable rows={universalVouchers} showCustomer={false} />
            )}
          </div>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreateError('') }} title="Create Universal Voucher">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{createError}</p>}
          <p className="text-sm text-gray-500">Creates universal voucher(s) — any client can claim them.</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date &amp; Time</label>
              <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} required
                min={(() => { const n = new Date(); return new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })()}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" min={1} max={100} value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent" />
            </div>
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
