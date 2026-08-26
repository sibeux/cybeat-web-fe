import apiClient from '@/core/infrastructure/http/axios'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  EmailCheckResponse,
} from '@/features/auth/types/auth.types'

/**
 * Authentication API module.
 *
 * All auth-related HTTP calls are here — not in a global services/ directory.
 * Uses the shared Axios client from infrastructure.
 *
 * API contracts:
 * - login: POST /auth/login with JSON body
 * - register: POST with application/x-www-form-urlencoded (PHP $_POST)
 * - checkEmail: POST with application/x-www-form-urlencoded (PHP $_POST)
 */

export const authApi = {
  /**
   * Authenticates a user with email and password.
   * POST /auth/login — JSON body
   */
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload)
    return response.data
  },

  /**
   * Registers a new user account.
   *
   * The backend reads values via PHP $_POST, so we send
   * application/x-www-form-urlencoded with method=create_user.
   */
  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const params = new URLSearchParams({
      method: 'create_user',
      name: payload.name,
      email: payload.email,
      password: payload.password,
    })

    const response = await apiClient.post<AuthResponse>('/auth/register', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.data
  },

  /**
   * Checks whether an email address is already registered.
   *
   * Non-blocking UX enhancement only. Registration itself validates
   * duplicates on the backend — this is purely for early feedback.
   *
   * Sent as application/x-www-form-urlencoded with method=email_check.
   */
  async checkEmail(email: string): Promise<EmailCheckResponse> {
    const params = new URLSearchParams({
      method: 'email_check',
      email,
    })

    const response = await apiClient.post<EmailCheckResponse>('/auth/register', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.data
  },
}
