import type { AuthUser } from '@/features/auth/types/auth.types'

/**
 * Minimal JWT payload decoder for display purposes only.
 *
 * IMPORTANT: Decoded JWT claims are NOT authoritative authorization data.
 * Use this only to populate UI display (name, email in nav bar, etc.).
 * Backend authorization decisions must always be validated server-side.
 *
 * Never log the token or its decoded payload.
 * This function is intentionally local to the auth feature.
 */

interface JwtPayload {
  email?: string
  name?: string
  role?: string
  exp?: number
  iat?: number
  sub?: string
}

function decodeBase64Url(str: string): string {
  // Pad base64 if needed
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  return atob(padded)
}

/**
 * Decodes the payload portion of a JWT token.
 * Returns null if decoding fails for any reason.
 *
 * @param token - The raw JWT string
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payloadPart = parts[1]
    if (!payloadPart) return null

    const decoded = decodeBase64Url(payloadPart)
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function extractUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null

  const email = payload.email ?? payload.sub
  if (!email) return null

  return {
    email,
    name: payload.name,
    role: payload.role,
  }
}

/**
 * Checks if a JWT token is expired based on its `exp` claim.
 * Returns true if expired or if decoding fails.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return true
  
  // exp is in seconds, Date.now() is in milliseconds
  const now = Math.floor(Date.now() / 1000)
  
  // Add a small buffer (e.g., 5 seconds) to prevent edge cases
  return payload.exp <= now + 5
}
