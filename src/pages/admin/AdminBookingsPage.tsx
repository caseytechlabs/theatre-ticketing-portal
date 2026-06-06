import React from 'react'
import { StaffBookingsPage } from '../staff/StaffBookingsPage'

// Admin has the same booking management capabilities as staff
export function AdminBookingsPage() {
  return <StaffBookingsPage />
}
