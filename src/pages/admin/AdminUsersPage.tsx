import React, { useCallback, useEffect, useState } from 'react'
import { userApi } from '../../api/users'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Modal } from '../../components/common/Modal'
import { CreateUserRequest, User, UserRole } from '../../types'

type Sort = { col: string; dir: 'asc' | 'desc' }

const roleColors: Record<UserRole, string> = {
  ADMIN:  'bg-red-100 text-red-700 border-red-200',
  CLIENT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function getValue(col: string, u: User): string | number {
  if (col === 'createdAt') return new Date(u.createdAt ?? 0).getTime()
  return (u as any)[col] ?? ''
}

export function AdminUsersPage() {
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [sort, setSort]             = useState<Sort>({ col: 'createdAt', dir: 'desc' })
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState<CreateUserRequest>({ username: '', email: '', password: '', role: 'CLIENT' })
  const [creating, setCreating]     = useState(false)
  const [createError, setCreateError] = useState('')
  const [toast, setToast]           = useState({ msg: '', ok: true })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    userApi.getAll()
      .then((r) => setUsers(r.data ?? []))
      .catch((e) => notify(e.message, false))
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      await userApi.create(form)
      setShowCreate(false)
      setForm({ username: '', email: '', password: '', role: 'CLIENT' })
      load()
      notify('User created')
    } catch (e: any) { setCreateError(e.message) }
    finally { setCreating(false) }
  }

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await userApi.delete(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      notify('User deleted')
    } catch (e: any) { notify(e.message, false) }
  }

  const displayed = [...users].sort((a, b) => {
    const av = getValue(sort.col, a); const bv = getValue(sort.col, b)
    return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1)
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users.length} users registered</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="text-sm text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            className="bg-slate-700 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
            {'+ Add User'}
          </button>
        </div>
      </div>

      {toast.msg && (
        <div className={`mb-4 p-3 border rounded-xl text-sm font-medium ${toast.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.msg}
        </div>
      )}

      {loading ? <LoadingSpinner /> : users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <p className="text-4xl mb-2">👤</p><p>No users found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                <Th label="Username" col="username" />
                <Th label="Email" col="email" />
                <Th label="Role" col="role" />
                <Th label="Created" col="createdAt" />
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(u.id, u.username)}
                      className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreateError('') }} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">{createError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white">
                <option value="CLIENT">CLIENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowCreate(false); setCreateError('') }}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
