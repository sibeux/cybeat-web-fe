import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import apiClient from './axios'
import { authStorage } from '@/core/infrastructure/storage/auth-storage'
import { isTokenExpired } from '@/features/auth/utils/jwt'
import type { AuthResponse } from '@/features/auth/types/auth.types'
import { logger } from '@/core/infrastructure/logger'

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
  if (!refreshToken) {
    logger.warn('HttpAuth', 'Refresh token not found during refresh attempt')
    return null
  }

  logger.info('HttpAuth', 'Attempting to refresh access token...')

  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<AuthResponse>('/auth/refresh', null, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      })
      .then(({ data }) => {
        if (data.status !== 'success' || !data.access_token) {
          throw new Error(data.message || 'Unable to refresh session')
        }

        logger.info('HttpAuth', 'Session access token refreshed successfully')
        authStorage.setAccessToken(data.access_token)
        if (data.refresh_token) {
          authStorage.setRefreshToken(data.refresh_token)
        }
        return data.access_token
      })
      .catch((err) => {
        logger.warn('HttpAuth', 'Token refresh failed', undefined, err)
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  const accessToken = await refreshPromise
  if (!accessToken) {
    logger.warn('HttpAuth', 'Session expired. Broadcasting expiration event')
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
        logger.info('HttpInterceptor', `Token expired for ${config.method?.toUpperCase()} ${config.url}. Refreshing...`)
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
    (error: AxiosError) => {
      logger.error('HttpInterceptor', 'Request configuration error', error)
      return Promise.reject(error)
    },
  )

  // ─── Response Interceptor ───────────────────────────────────────────────────
  // Detects 401 Unauthorized responses.
  // Clears persisted tokens and notifies the app layer via a DOM event.
  // Does NOT import useAuthStore() — zero feature coupling.
  apiClient.interceptors.response.use(
    (response) => {
      return response
    },
    (error: AxiosError) => {
      const status = error.response?.status
      const requestConfig = error.config as RetriableRequestConfig | undefined
      const url = requestConfig?.url || 'unknown'
      const method = requestConfig?.method?.toUpperCase() || 'GET'

      if (status === 401 && !isRefreshRequest(requestConfig) && !requestConfig?.__cybeatRetried) {
        logger.warn('HttpInterceptor', `Received 401 for ${method} ${url}. Retrying with fresh token...`)
        return attemptTokenRefresh().then((newAccessToken) => {
          if (!newAccessToken || !requestConfig) {
            return Promise.reject(error)
          }

          requestConfig.__cybeatRetried = true
          requestConfig.headers.Authorization = `Bearer ${newAccessToken}`
          return apiClient.request(requestConfig)
        })
      }

      if (status && status >= 500) {
        logger.error('HttpInterceptor', `Server Error (${status}) on ${method} ${url}`, error, {
          status,
          responseData: error.response?.data,
        })
      } else if (status && status >= 400 && status !== 401) {
        logger.warn('HttpInterceptor', `Client Error (${status}) on ${method} ${url}`, {
          status,
          responseData: error.response?.data,
        }, error)
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        logger.error('HttpInterceptor', `Request timeout on ${method} ${url}`, error)
      } else if (!error.response) {
        logger.error('HttpInterceptor', `Network error on ${method} ${url}`, error)
      }

      return Promise.reject(error)
    },
  )
}

