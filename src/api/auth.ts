import client from './client'
import { ApiResponse, AuthUser, LoginRequest } from '../types'

export const authApi = {
  login: (request: LoginRequest) =>
    client.post<ApiResponse<AuthUser>>('/auth/login', request).then((r) => r.data),
}
