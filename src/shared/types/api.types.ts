/**
 * Shared API response types.
 * Used across features for common API error handling.
 */

export interface ApiErrorResponse {
  status: string
  message: string
  error?: string
}
