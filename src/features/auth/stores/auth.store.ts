import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/features/auth/api/auth.api'
import { authStorage } from '@/infrastructure/storage/auth-storage'
import { extractUserFromToken } from '@/features/auth/utils/jwt'
import { normalizeError } from '@/shared/utils/error-normalizer'
import type { LoginRequest, RegisterRequest, AuthUser } from '@/features/auth/types/auth.types'

/**
 * Authentication store.
 *
 * Single source of truth for authentication state.
 *
 * Key design decisions:
 * - `isAuthenticated` is a computed property derived from `accessToken`.
 *   It is NEVER independently mutable, guaranteeing consistency.
 * - Components never touch localStorage or axios directly.
 * - The store does NOT listen for DOM events — App.vue coordinates that.
 * - JWT is decoded only for display metadata (name, email in UI).
 *   Decoded claims are NOT used for authorization.
 */
export const useAuthStore = defineStore('auth', () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const isInitializing = ref(true)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ─── Derived State ────────────────────────────────────────────────────────
  /**
   * Derived from accessToken — never independently mutable.
   * accessToken === null → isAuthenticated === false, always.
   */
  const isAuthenticated = computed(() => accessToken.value !== null)

  // ─── Internal Helpers ─────────────────────────────────────────────────────
  function applySession(access: string, refresh: string): void {
    accessToken.value = access
    refreshToken.value = refresh
    authStorage.setAccessToken(access)
    authStorage.setRefreshToken(refresh)
    // Decode JWT payload for display — not for authorization
    user.value = extractUserFromToken(access)
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  /**
   * Restores the authentication session from persisted storage.
   * Called once at application startup (before mount) in main.ts.
   * Sets isInitializing = false when complete so the router guard
   * knows it is safe to make redirect decisions.
   */
  async function restoreSession(): Promise<void> {
    try {
      const storedAccess = authStorage.getAccessToken()
      const storedRefresh = authStorage.getRefreshToken()

      if (storedAccess) {
        accessToken.value = storedAccess
        refreshToken.value = storedRefresh
        user.value = extractUserFromToken(storedAccess)
      }
    } finally {
      isInitializing.value = false
    }
  }

  /**
   * Authenticates the user with email and password.
   * On success, persists tokens and updates state.
   * On failure, sets a user-friendly error message.
   */
  async function login(payload: LoginRequest): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.login(payload)
      applySession(response.access_token, response.refresh_token)
    } catch (err) {
      error.value = normalizeError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Registers a new user account.
   * On success, automatically establishes a session using the returned tokens.
   */
  async function register(payload: RegisterRequest): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.register(payload)
      applySession(response.access_token, response.refresh_token)
    } catch (err) {
      error.value = normalizeError(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clears all authentication state and persisted tokens.
   *
   * If the backend later provides a logout/revoke endpoint,
   * add the API call here before clearSession().
   */
  async function logout(): Promise<void> {
    // Future: await authApi.logout() — add when backend provides endpoint
    clearSession()
  }

  /**
   * Clears authentication state and persisted storage.
   * Called directly by logout() and by App.vue when session expires (401).
   */
  function clearSession(): void {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    error.value = null
    authStorage.clearAll()
  }

  function clearError(): void {
    error.value = null
  }

  return {
    // State
    user,
    isInitializing,
    isLoading,
    error,
    // Derived
    isAuthenticated,
    // Expose read-only token for interceptor awareness (not for components)
    accessToken: computed(() => accessToken.value),
    // Actions
    restoreSession,
    login,
    register,
    logout,
    clearSession,
    clearError,
  }
})
