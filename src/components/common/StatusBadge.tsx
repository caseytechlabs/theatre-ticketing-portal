import React from 'react'
import { BookingStatus, VoucherStatus } from '../../types'

type Status = VoucherStatus | BookingStatus | string

const config: Record<string, { label: string; className: string }> = {
  AVAILABLE:     { label: 'Available',     className: 'bg-green-100 text-green-800 border-green-200' },
  PENDING_CLAIM: { label: 'Pending Claim', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  CLAIMED:       { label: 'Claimed',       className: 'bg-blue-100 text-blue-800 border-blue-200' },
  PENDING:       { label: 'Pending',       className: 'bg-amber-100 text-amber-800 border-amber-200' },
  CONFIRMED:     { label: 'Confirmed',     className: 'bg-green-100 text-green-800 border-green-200' },
  CANCELLED:     { label: 'Cancelled',     className: 'bg-red-100 text-red-800 border-red-200' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}
    >
      {label}
    </span>
  )
}
