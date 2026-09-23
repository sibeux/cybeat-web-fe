import type { LogEntry, LogLevel } from './log.types'
import { logStorage } from './log-storage'

type LogListener = (entry: LogEntry) => void

class LoggerService {
  private listeners: Set<LogListener> = new Set()

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(entry: LogEntry): void {
    this.listeners.forEach((listener) => {
      try {
        listener(entry)
      } catch {
        // Safe fail
      }
    })
  }

  private write(
    level: LogLevel,
    context: string,
    message: string,
    data?: Record<string, unknown> | null,
    error?: Error | unknown,
  ): void {
    const errorObj =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : typeof error === 'string'
          ? { message: error }
          : error && typeof error === 'object'
            ? { message: JSON.stringify(error) }
            : null

    const entry: Omit<LogEntry, 'id'> = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data: data || null,
      error: errorObj,
    }

    // Output to developer browser console with styled prefix
    this.printConsole(entry)

    // Emit to live listeners (e.g., active Log Viewer UI)
    this.emit(entry as LogEntry)

    // Persist to local IndexedDB
    logStorage.save(entry)
  }

  private printConsole(entry: Omit<LogEntry, 'id'>): void {
    const timeStr = entry.timestamp.split('T')[1]?.replace('Z', '') || entry.timestamp
    const prefix = `[${timeStr}] [${entry.level}] [${entry.context}]`

    let style = 'color: #94a3b8;'
    if (entry.level === 'INF') style = 'color: #38bdf8; font-weight: bold;'
    if (entry.level === 'WRN') style = 'color: #facc15; font-weight: bold;'
    if (entry.level === 'ERR') style = 'color: #f87171; font-weight: bold;'
    if (entry.level === 'FTL') style = 'color: #e11d48; font-weight: bold; background: #ffe4e6;'
    if (entry.level === 'DBG') style = 'color: #a3e635;'

    const args: unknown[] = [`%c${prefix}`, style, entry.message]
    if (entry.data) args.push(entry.data)
    if (entry.error) args.push(entry.error)

    if (entry.level === 'ERR' || entry.level === 'FTL') {
      console.error(...args)
    } else if (entry.level === 'WRN') {
      console.warn(...args)
    } else if (entry.level === 'DBG') {
      console.debug(...args)
    } else {
      console.log(...args)
    }
  }

  debug(context: string, message: string, data?: Record<string, unknown>): void {
    this.write('DBG', context, message, data)
  }

  info(context: string, message: string, data?: Record<string, unknown>): void {
    this.write('INF', context, message, data)
  }

  warn(context: string, message: string, data?: Record<string, unknown>, error?: unknown): void {
    this.write('WRN', context, message, data, error)
  }

  error(context: string, message: string, error?: unknown, data?: Record<string, unknown>): void {
    this.write('ERR', context, message, data, error)
  }

  fatal(context: string, message: string, error?: unknown, data?: Record<string, unknown>): void {
    this.write('FTL', context, message, data, error)
  }
}

export const logger = new LoggerService()
