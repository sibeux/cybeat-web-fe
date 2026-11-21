import apiClient from '@/core/infrastructure/http/axios'
import type { LogEntry, LogLevel } from '@/core/infrastructure/logger'

export interface BackendLogsResponse {
  status: 'success' | 'error'
  total: number
  data: LogEntry[]
  message?: string
}

export interface BackendLogsFilterOptions {
  level?: LogLevel | 'ALL'
  search?: string
  limit?: number
  since_id?: number
}

function resolveCandidates(customUrl?: string): string[] {
  if (customUrl && customUrl.trim()) {
    const base = customUrl.trim().replace(/\/+$/, '')
    return base.endsWith('.php') ? [base] : [`${base}/logs.php`, `${base}/logs`]
  }

  const list: string[] = ['/logs', '/logs.php']
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    list.push('http://localhost:8000/api/logs.php')
    list.push('http://127.0.0.1:8000/api/logs.php')
  }
  return list
}

export const backendLogsApi = {
  /**
   * Fetch backend logs from server.
   */
  async getLogs(options?: BackendLogsFilterOptions, customUrl?: string): Promise<LogEntry[]> {
    const params: Record<string, string | number> = {}
    if (options?.level && options.level !== 'ALL') params.level = options.level
    if (options?.search) params.search = options.search
    if (options?.limit) params.limit = options.limit
    if (options?.since_id) params.since_id = options.since_id

    const candidates = resolveCandidates(customUrl)
    let lastError: unknown = null

    for (const url of candidates) {
      try {
        const res = await apiClient.get<BackendLogsResponse>(url, { params, timeout: 5000 })
        if (res.data && res.data.status === 'success') {
          return res.data.data || []
        }
      } catch (err) {
        lastError = err
      }
    }

    throw lastError || new Error('Tidak dapat terhubung ke endpoint backend logs')
  },

  /**
   * Clear all logs on the backend server.
   */
  async clearLogs(customUrl?: string): Promise<void> {
    const candidates = resolveCandidates(customUrl)
    for (const url of candidates) {
      try {
        await apiClient.delete(url, { timeout: 4000 })
        return
      } catch {
        try {
          await apiClient.post(url, { action: 'clear' }, { timeout: 4000 })
          return
        } catch {
          // Try next
        }
      }
    }
  },

  /**
   * Simulate a realistic backend database/runtime error to verify stack trace logging.
   */
  async simulateError(customUrl?: string): Promise<void> {
    const candidates = resolveCandidates(customUrl)
    for (const url of candidates) {
      try {
        await apiClient.get(url, {
          params: { action: 'simulate_error' },
          timeout: 4000,
        })
      } catch {
        // Expected 500 error from simulated failure
        return
      }
    }
  },
}
