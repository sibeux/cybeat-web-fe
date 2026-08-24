import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import apiClient from './axios'
import { authStorage } from '@/core/infrastructure/storage/auth-storage'
import { isTokenExpired } from '@/features/auth/utils/jwt'
import type { AuthResponse } from '@/features/auth/types/auth.types'

/**
 * SESSION EXPIRATION EVENT
 *
 * When the API returns 401, the interceptor:
 *  1. Clears all persisted auth tokens from storage
 *  2. Dispatches this DOM custom event
 *
 * App.vue listens for this event and coordinates:
 *  - authStore.clearSession()
 *  - router.push('/login')
 *
 * This keeps the infrastructure layer free of any dependency
 * on feature stores or Vue Router.
 */
export const SESSION_EXPIRED_EVENT = 'cybeat:session-expired'

let refreshPromise: Promise<string | null> | null = null
type RetriableRequestConfig = InternalAxiosRequestConfig & {
  __cybeatRetried?: boolean
}

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = authStorage.getRefreshToken()
  if (!refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<AuthResponse>('/auth/refresh', null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      })
      .then(({ data }) => {
        if (data.status !== 'success' || !data.access_token) {
          throw new Error(data.message || 'Unable to refresh session')
        }

        authStorage.setAccessToken(data.access_token)
        if (data.refresh_token) {
          authStorage.setRefreshToken(data.refresh_token)
        }
        return data.access_token
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }

  const accessToken = await refreshPromise
  if (!accessToken) {
    authStorage.clearAll()
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }

  return accessToken
}

export function refreshAccessToken(): Promise<string | null> {
  return attemptTokenRefresh()
}

function isRefreshRequest(config?: InternalAxiosRequestConfig): boolean {
  return config?.url?.replace(/\/$/, '') === '/auth/refresh'
}

export function setupInterceptors(): void {
  // ─── Request Interceptor ────────────────────────────────────────────────────
  // Attaches the access token from storage to every outgoing request.
  // Does NOT import or depend on any feature store.
  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = authStorage.getAccessToken()
      if (token && !isRefreshRequest(config) && isTokenExpired(token)) {
        return attemptTokenRefresh().then((newAccessToken) => {
          if (!newAccessToken) {
            return Promise.reject(new axios.Cancel('Unable to refresh token'))
          }
          config.headers.Authorization = `Bearer ${newAccessToken}`
          return config
        })
      }

      if (token && !isRefreshRequest(config)) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error: AxiosError) => Promise.reject(error),
  )

  // ─── Response Interceptor ───────────────────────────────────────────────────
  // Detects 401 Unauthorized responses.
  // Clears persisted tokens and notifies the app layer via a DOM event.
  // Does NOT import useAuthStore() — zero feature coupling.
  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status
      const requestConfig = error.config as RetriableRequestConfig | undefined

      if (status === 401 && !isRefreshRequest(requestConfig) && !requestConfig?.__cybeatRetried) {
        return attemptTokenRefresh().then((newAccessToken) => {
          if (!newAccessToken || !requestConfig) {
            return Promise.reject(error)
          }

          requestConfig.__cybeatRetried = true
          requestConfig.headers.Authorization = `Bearer ${newAccessToken}`
          return apiClient.request(requestConfig)
        })
      }

      return Promise.reject(error)
    },
  )
}
