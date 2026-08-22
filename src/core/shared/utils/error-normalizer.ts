import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '@/core/shared/types/api.types'

/**
 * Normalizes API and network errors into user-friendly Indonesian messages.
 *
 * Maps known backend messages to appropriate UI messages.
 * Falls back to a generic message for unknown errors.
 *
 * Rules:
 * - Never expose SQL errors, PHP stack traces, or Axios internals
 * - Never expose token values
 * - Never expose database details
 */

const KNOWN_MESSAGES: Record<string, string> = {
  'Email sudah terdaftar': 'Email sudah terdaftar. Gunakan email lain atau masuk ke akun Anda.',
  'Email atau password salah': 'Email atau password salah. Silakan periksa kembali.',
  'User berhasil ditambahkan': 'Akun berhasil dibuat.',
  'Login berhasil': 'Login berhasil.',
  Unauthorized: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
}

const GENERIC_ERROR = 'Terjadi kesalahan. Silakan coba lagi.'
const NETWORK_ERROR = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
const SERVER_ERROR = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'

export function normalizeError(error: unknown): string {
  // Axios error with a response from the backend
  if (isAxiosError(error)) {
    if (!error.response) {
      // Network error — no response received
      return NETWORK_ERROR
    }

    const status = error.response.status
    const data = error.response.data as ApiErrorResponse | undefined

    // 5xx — server error
    if (status >= 500) {
      return SERVER_ERROR
    }

    // Try to map the backend message
    const backendMessage = data?.message
    if (backendMessage && KNOWN_MESSAGES[backendMessage]) {
      return KNOWN_MESSAGES[backendMessage]
    }

    // 401 — session / auth issue
    if (status === 401) {
      if (data?.error === 'credentials_mismatch') {
        return 'Email atau password salah. Silakan periksa kembali.'
      }
      return 'Sesi Anda telah berakhir. Silakan masuk kembali.'
    }

    // 422 / 400 — validation error with a readable message
    if (backendMessage && typeof backendMessage === 'string' && backendMessage.length < 200) {
      return backendMessage
    }

    return GENERIC_ERROR
  }

  // Standard JS error
  if (error instanceof Error) {
    return GENERIC_ERROR
  }

  return GENERIC_ERROR
}

function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  )
}
