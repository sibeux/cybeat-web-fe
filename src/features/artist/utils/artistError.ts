import type { AxiosError } from 'axios'

export function artistError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
    const requestError = error as AxiosError<{ message?: unknown }>
    if (!requestError.response) return 'Unable to reach the server. Check your connection and try again.'

    const status = requestError.response.status
    if (status === 401) return 'Your session has expired. Sign in again.'
    if (status === 403) return 'Admin access is required.'
    if (status >= 500) return 'A server error occurred. Please try again later.'

    const message = requestError.response.data?.message
    if (typeof message === 'string' && message.length < 200) return message
  }
  return 'Something went wrong. Please try again.'
}
