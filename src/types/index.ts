export type UserRole = 'ADMIN' | 'STAFF' | 'CLIENT'

export enum VoucherStatus {
  AVAILABLE     = 'AVAILABLE',
  PENDING_CLAIM = 'PENDING_CLAIM',
  CLAIMED       = 'CLAIMED',
}

export enum BookingStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface AuthUser {
  userId: string
  username: string
  email: string
  role: UserRole
  token: string
}

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  createdAt?: string
}

export interface Voucher {
  id: string
  status: VoucherStatus
  customerId: string
  pendingUserId?: string
  createdAt: string
  expiresAt: string
  claimedAt?: string
  pendingAt?: string
}

export interface Booking {
  id: string
  voucherId: string
  userId: string
  status: BookingStatus
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface CreateVoucherRequest {
  customerId: string
  expiresAt: string
}

export interface InitiateBookingRequest {
  userId?: string
  voucherId: string
}

export interface ConfirmPaymentRequest {
  bookingId: string
  paymentSuccess: boolean
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  role: UserRole
}
