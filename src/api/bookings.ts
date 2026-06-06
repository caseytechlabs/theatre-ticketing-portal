import client from './client'
import { ApiResponse, Booking, ConfirmPaymentRequest, InitiateBookingRequest } from '../types'

export const bookingApi = {
  getById: (id: string) =>
    client.get<ApiResponse<Booking>>(`/bookings/${id}`).then((r) => r.data),

  initiate: (request: InitiateBookingRequest) =>
    client.post<ApiResponse<Booking>>('/bookings/initiate', request).then((r) => r.data),

  confirm: (request: ConfirmPaymentRequest) =>
    client.post<ApiResponse<Booking>>('/bookings/confirm', request).then((r) => r.data),
}
