import React from 'react'
import { Booking, BookingStatus } from '../../types'
import { StatusBadge } from '../common/StatusBadge'

interface Props {
  booking: Booking
  onConfirm: (booking: Booking) => void
}

function fmt(d: string) {
  return new Date(d).toLocaleString()
}

export function BookingCard({ booking, onConfirm }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <StatusBadge status={booking.status} />
        <p className="text-xs text-gray-400 font-mono break-all max-w-[160px] text-right">
          {booking.id}
        </p>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span className="text-gray-400">Voucher</span>
          <span className="font-mono text-xs text-gray-600 truncate max-w-[160px]">
            {booking.voucherId}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">User</span>
          <span className="font-medium text-gray-700">{booking.userId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Created</span>
          <span className="text-gray-700">{fmt(booking.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Updated</span>
          <span className="text-gray-700">{fmt(booking.updatedAt)}</span>
        </div>
      </div>

      {booking.status === BookingStatus.PENDING && (
        <button
          onClick={() => onConfirm(booking)}
          className="w-full text-sm bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors mt-1"
        >
          Confirm Payment
        </button>
      )}
    </div>
  )
}
