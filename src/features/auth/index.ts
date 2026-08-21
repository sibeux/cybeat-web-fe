/**
 * Auth feature public API.
 *
 * Only exposes what other parts of the application actually need.
 * Internal implementation details (api, validation, components, utils)
 * are NOT re-exported here.
 *
 * Route definitions live in app/router/index.ts — not here.
 */

export { useAuthStore } from './stores/auth.store'
export type { AuthUser, AuthResponse } from './types/auth.types'
