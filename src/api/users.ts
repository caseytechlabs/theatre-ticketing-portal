import client from './client'
import { ApiResponse, CreateUserRequest, User, UserRole } from '../types'

export const userApi = {
  getAll: () =>
    client.get<ApiResponse<User[]>>('/users').then((r) => r.data),

  getByRole: (role: UserRole) =>
    client.get<ApiResponse<User[]>>(`/users?role=${role}`).then((r) => r.data),

  create: (request: CreateUserRequest) =>
    client.post<ApiResponse<User>>('/users', request).then((r) => r.data),

  delete: (id: string) => client.delete(`/users/${id}`),
}
