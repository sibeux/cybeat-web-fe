import type { LogEntry } from './log.types'

/**
 * Formats a list of log entries into a structured JSON file string (pretty-printed).
 */
export function formatLogsAsJson(logs: LogEntry[]): string {
  return JSON.stringify(logs, null, 2)
}

/**
 * Formats a list of log entries into a compact Serilog-like text format.
 * Example: [2026-09-23 21:58:00.123 +00:00 INF] [HttpInterceptor] Request completed
 */
export function formatLogsAsText(logs: LogEntry[]): string {
  return logs
    .map((log) => {
      const time = log.timestamp.replace('T', ' ').replace('Z', '')
      const level = log.level.padEnd(3, ' ')
      const context = log.context ? `[${log.context}]` : ''
      let line = `[${time} ${level}] ${context} ${log.message}`

      if (log.data && Object.keys(log.data).length > 0) {
        line += `\n  Data: ${JSON.stringify(log.data)}`
      }

      if (log.error) {
        line += `\n  Exception: ${log.error.name ? log.error.name + ': ' : ''}${log.error.message}`
        if (log.error.stack) {
          line += `\n  Stack: ${log.error.stack}`
        }
      }

      return line
    })
    .join('\n\n')
}

/**
 * Triggers a browser file download for log content.
 */
export function downloadLogFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
