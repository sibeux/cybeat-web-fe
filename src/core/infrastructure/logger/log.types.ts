export type LogLevel = 'DBG' | 'INF' | 'WRN' | 'ERR' | 'FTL'

export interface LogEntry {
  id?: number
  timestamp: string // ISO 8601
  level: LogLevel
  context: string
  message: string
  data?: Record<string, unknown> | null
  error?: {
    name?: string
    message: string
    stack?: string
  } | null
}

export interface LogFilterOptions {
  level?: LogLevel | 'ALL'
  search?: string
  context?: string
  startDate?: string
  endDate?: string
  limit?: number
}
