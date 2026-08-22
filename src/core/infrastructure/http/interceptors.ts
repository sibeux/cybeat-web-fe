import type { AxiosError, InternalAxiosRequestConfig } from 'axios'
import apiClient from './axios'
import { authStorage } from '@/core/infrastructure/storage/auth-storage'

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

/**
 * TOKEN REFRESH — PENDING
 *
 * The backend returns a refresh_token on login/register.
 * However, the refresh endpoint contract has NOT been provided.
 *
 * DO NOT implement refresh here until the following are confirmed:
 *  - Endpoint URL
 *  - HTTP method
 *  - Request payload
 *  - Response structure
 *  - Token rotation behavior
 *
 * When the contract is available, implement refresh in this function
 * and call it from the 401 handler below before dispatching the
 * session-expired event.
 */
// async function attemptTokenRefresh(): Promise<boolean> {
//   // TODO: implement when backend refresh endpoint is confirmed
//   return false
// }

let isHandling401 = false

export function setupInterceptors(): void {
  // ─── Request Interceptor ────────────────────────────────────────────────────
  // Attaches the access token from storage to every outgoing request.
  // Does NOT import or depend on any feature store.
  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = authStorage.getAccessToken()
      if (token) {
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

      if (status === 401 && !isHandling401) {
        isHandling401 = true

        // Clear persisted tokens immediately
        authStorage.clearAll()

        // Notify the application layer (App.vue handles this)
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))

        // Reset flag after a short delay to allow the app to react
        setTimeout(() => {
          isHandling401 = false
        }, 1000)
      }

      return Promise.reject(error)
    },
  )
}
