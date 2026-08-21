/**
 * Authentication feature type definitions.
 * All auth-related types live here — not in global types/.
 */

// ─── API Request Types ──────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface AuthResponse {
  status: string
  message: string
  access_token: string
  refresh_token: string
}

export interface EmailCheckResponse {
  email_exists: 'true' | 'false'
}

// ─── Application Types ──────────────────────────────────────────────────────

/**
 * Represents the authenticated user for display purposes only.
 *
 * IMPORTANT: These values may be decoded from the JWT payload for UI display
 * (e.g., showing the user's name in the nav bar). They are NOT authoritative
 * for backend authorization decisions. Backend remains the source of truth.
 */
export interface AuthUser {
  email: string
  name?: string
  role?: string
}

// ─── Form Types ─────────────────────────────────────────────────────────────

export interface LoginFormValues {
  email: string
  password: string
}

export interface RegisterFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export type FormErrors<T> = Partial<Record<keyof T, string>>
