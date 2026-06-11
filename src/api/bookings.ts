import client from './client'
import { ApiResponse, Booking, ConfirmPaymentRequest, InitiateBookingRequest } from '../types'

export const bookingApi = {
  getAll: () =>
    client.get<ApiResponse<Booking[]>>('/bookings').then((r) => r.data),

  getMy: () =>
    client.get<ApiResponse<Booking[]>>('/bookings/my').then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Booking>>(`/bookings/${id}`).then((r) => r.data),

  initiate: (request: InitiateBookingRequest) =>
    client.post<ApiResponse<Booking>>('/bookings/initiate', request).then((r) => r.data),

  confirm: (request: ConfirmPaymentRequest) =>
    client.post<ApiResponse<Booking>>('/bookings/confirm', request).then((r) => r.data),

  deleteOne: (id: string) =>
    client.delete<ApiResponse<void>>(`/bookings/${id}`).then((r) => r.data),
}
