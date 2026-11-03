import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

// Public requests (shop, checkout, inquiries): never sends login tokens.
export const api = axios.create({ baseURL: API_URL })

// Admin requests: sends the login token and refreshes it when it expires.
export const adminApi = axios.create({ baseURL: API_URL })

const ACCESS = 'cf_access'
const REFRESH = 'cf_refresh'

export const tokens = {
  get access() { return localStorage.getItem(ACCESS) },
  get refresh() { return localStorage.getItem(REFRESH) },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS, access)
    if (refresh) localStorage.setItem(REFRESH, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
  },
}

adminApi.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`
  return config
})

let refreshing = null

adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && tokens.refresh) {
      original._retry = true
      try {
        refreshing = refreshing || axios.post(`${API_URL}/auth/token/refresh/`, { refresh: tokens.refresh })
        const { data } = await refreshing
        tokens.set({ access: data.access, refresh: data.refresh })
        return adminApi(original)
      } catch {
        tokens.clear()
        window.dispatchEvent(new Event('cf:logout'))
      } finally {
        refreshing = null
      }
    }
    return Promise.reject(error)
  },
)

/** Turns any API error into one readable sentence. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return error?.message === 'Network Error'
      ? 'Cannot reach the server. Check your internet connection and try again.'
      : fallback
  }
  const data = error.response.data
  if (error.response.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
  if (typeof data === 'string') return fallback
  if (data?.detail) return data.detail
  const first = flatten(data)[0]
  return first || fallback
}

/** Field-level errors: { field: 'message' } for showing under inputs. */
export function fieldErrors(error) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const out = {}
  for (const [key, value] of Object.entries(data)) {
    out[key] = flatten(value)[0]
  }
  return out
}

function flatten(value) {
  if (value == null) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (typeof value === 'object') return Object.values(value).flatMap(flatten)
  return [String(value)]
}
