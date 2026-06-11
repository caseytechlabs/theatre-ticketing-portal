import client from './client'
import { ApiResponse, CreateVoucherRequest, Voucher } from '../types'

export const voucherApi = {
  // Admin: all vouchers
  getAll: () =>
    client.get<ApiResponse<Voucher[]>>('/vouchers').then((r) => r.data),

  // Client: only their AVAILABLE vouchers
  getMy: () =>
    client.get<ApiResponse<Voucher[]>>('/vouchers/my').then((r) => r.data),

  getById: (id: string) =>
    client.get<ApiResponse<Voucher>>(`/vouchers/${id}`).then((r) => r.data),

  create: (request: CreateVoucherRequest) =>
    client.post<ApiResponse<Voucher>>('/vouchers', request).then((r) => r.data),

  delete: (id: string) => client.delete(`/vouchers/${id}`),
}
