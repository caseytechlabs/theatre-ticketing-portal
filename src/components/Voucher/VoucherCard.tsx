import React from 'react'
import { Voucher, VoucherStatus } from '../../types'
import { StatusBadge } from '../common/StatusBadge'

interface Props {
  voucher: Voucher
  onDelete: (id: string) => void
  onBook: (voucher: Voucher) => void
}

function fmt(d: string) {
  return new Date(d).toLocaleString()
}

export function VoucherCard({ voucher, onDelete, onBook }: Props) {
  const expired = new Date(voucher.expiresAt) < new Date()

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={voucher.status} />
          <p className="text-xs text-gray-400 font-mono break-all">{voucher.id}</p>
        </div>
        {expired && (
          <span className="text-xs font-medium bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">
            Expired
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span className="text-gray-400">Customer</span>
          <span className="font-medium text-gray-700">{voucher.customerId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Expires</span>
          <span className={expired ? 'text-red-500 font-medium' : 'text-gray-700'}>
            {fmt(voucher.expiresAt)}
          </span>
        </div>
        {voucher.pendingUserId && (
          <div className="flex justify-between">
            <span className="text-gray-400">Reserved by</span>
            <span className="font-medium text-amber-700">{voucher.pendingUserId}</span>
          </div>
        )}
        {voucher.claimedAt && (
          <div className="flex justify-between">
            <span className="text-gray-400">Claimed</span>
            <span className="font-medium text-blue-700">{fmt(voucher.claimedAt)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {voucher.status === VoucherStatus.AVAILABLE && !expired && (
          <button
            onClick={() => onBook(voucher)}
            className="flex-1 text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            Book Now
          </button>
        )}
        <button
          onClick={() => onDelete(voucher.id)}
          className="flex-1 text-sm bg-white text-red-500 py-2 rounded-lg border border-red-200 hover:bg-red-50 font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
