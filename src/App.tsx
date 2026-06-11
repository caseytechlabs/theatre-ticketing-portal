import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'

import { ClientLayout }  from './components/Layout/ClientLayout'
import { AdminLayout }   from './components/Layout/AdminLayout'

import { LoginPage }            from './pages/LoginPage'
import { ClientVouchersPage }   from './pages/client/ClientVouchersPage'
import { ClientBookingPage }    from './pages/client/ClientBookingPage'
import { AdminVouchersPage }    from './pages/admin/AdminVouchersPage'
import { AdminBookingsPage }    from './pages/admin/AdminBookingsPage'
import { AdminUsersPage }       from './pages/admin/AdminUsersPage'

function RoleRedirect() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'CLIENT') return <Navigate to="/client" replace />
  if (user?.role === 'ADMIN')  return <Navigate to="/admin" replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* CLIENT — My vouchers + booking only */}
      <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
        <Route element={<ClientLayout />}>
          <Route path="/client"         element={<ClientVouchersPage />} />
          <Route path="/client/booking" element={<ClientBookingPage />} />
        </Route>
      </Route>

      {/* ADMIN — Full: vouchers, bookings, users */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin"          element={<AdminVouchersPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/users"    element={<AdminUsersPage />} />
        </Route>
      </Route>

      {/* Root → role-based redirect */}
      <Route path="/"  element={<RoleRedirect />} />
      <Route path="*"  element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
