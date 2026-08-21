/**
 * Centralized authentication token storage.
 *
 * All reads/writes to persisted auth tokens go through this module.
 * Components, stores, and API modules must NOT directly access localStorage
 * for authentication tokens.
 *
 * Future migration to HttpOnly cookies: change this file only.
 * The rest of the application remains untouched.
 */

const ACCESS_TOKEN_KEY = 'cybeat:access_token'
const REFRESH_TOKEN_KEY = 'cybeat:refresh_token'

export const authStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  },

  removeAccessToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  },

  removeRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  clearAll(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}
