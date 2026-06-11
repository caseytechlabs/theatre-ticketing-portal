import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the JWT Bearer token from localStorage to every outgoing request
client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('theater_auth')
  if (raw) {
    try {
      const { token } = JSON.parse(raw)
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // ignore malformed storage
    }
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    // 401 means the token is missing or expired — clear session and force re-login
    if (error.response?.status === 401) {
      localStorage.removeItem('theater_auth')
      window.location.href = '/login'
    }
    // Prefer the API's own error message; fall back to Axios's generic string
    const message = error.response?.data?.message || error.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

export default client
