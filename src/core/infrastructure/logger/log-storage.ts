import type { LogEntry, LogFilterOptions } from './log.types'

const DB_NAME = 'cybeat_logs_db'
const DB_VERSION = 1
const STORE_NAME = 'app_logs'
const MAX_LOG_RETENTION = 5000 // Keep up to 5,000 entries max

class LogStorage {
  private dbPromise: Promise<IDBDatabase> | null = null

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'))
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('level', 'level', { unique: false })
          store.createIndex('context', 'context', { unique: false })
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })

    return this.dbPromise
  }

  async save(entry: Omit<LogEntry, 'id'>): Promise<void> {
    try {
      const db = await this.getDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.add(entry)

      tx.oncomplete = () => {
        // Prune logs occasionally in background
        this.pruneOldLogs(db)
      }
    } catch {
      // Fallback: silent failure so logging never breaks app execution
    }
  }

  async getAll(options?: LogFilterOptions): Promise<LogEntry[]> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => {
          let results: LogEntry[] = request.result || []

          // Apply filters
          if (options) {
            const { level, search, context, startDate, endDate } = options

            if (level && level !== 'ALL') {
              results = results.filter((item) => item.level === level)
            }

            if (context) {
              const ctxLower = context.toLowerCase()
              results = results.filter((item) => item.context.toLowerCase().includes(ctxLower))
            }

            if (search) {
              const sLower = search.toLowerCase()
              results = results.filter(
                (item) =>
                  item.message.toLowerCase().includes(sLower) ||
                  item.context.toLowerCase().includes(sLower) ||
                  (item.error && item.error.message.toLowerCase().includes(sLower)),
              )
            }

            if (startDate) {
              const start = new Date(startDate).getTime()
              results = results.filter((item) => new Date(item.timestamp).getTime() >= start)
            }

            if (endDate) {
              const end = new Date(endDate).getTime()
              results = results.filter((item) => new Date(item.timestamp).getTime() <= end)
            }
          }

          // Sort newest first
          results.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )

          if (options?.limit && options.limit > 0) {
            results = results.slice(0, options.limit)
          }

          resolve(results)
        }

        request.onerror = () => reject(request.error)
      })
    } catch {
      return []
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Ignored
    }
  }

  private async pruneOldLogs(db: IDBDatabase): Promise<void> {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()

      countReq.onsuccess = () => {
        const count = countReq.result
        if (count > MAX_LOG_RETENTION) {
          const deleteCount = count - MAX_LOG_RETENTION + 500 // Prune in chunk
          let deleted = 0
          const cursorReq = store.openCursor()
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result
            if (cursor && deleted < deleteCount) {
              cursor.delete()
              deleted++
              cursor.continue()
            }
          }
        }
      }
    } catch {
      // Ignore pruning errors
    }
  }
}

export const logStorage = new LogStorage()
