<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/core/app/layouts/AppLayout.vue'
import {
  type LogEntry,
  type LogLevel,
  logStorage,
  logger,
  formatLogsAsJson,
  formatLogsAsText,
  downloadLogFile,
} from '@/core/infrastructure/logger'
import { useTitle } from '@/core/shared/composables/useTitle'

const router = useRouter()
useTitle(() => 'System Logs • CyBeat')

const activeTab = ref<'frontend' | 'backend'>('frontend')
const logs = ref<LogEntry[]>([])
const selectedLevel = ref<LogLevel | 'ALL'>('ALL')
const searchQuery = ref('')
const expandedLogIds = ref<Set<number>>(new Set())
const isLiveStream = ref(true)
let unsubscribeLogger: (() => void) | null = null

async function loadLogs() {
  const data = await logStorage.getAll({
    level: selectedLevel.value,
    search: searchQuery.value.trim() || undefined,
  })
  logs.value = data
}

onMounted(async () => {
  await loadLogs()

  // Live streaming log subscription
  unsubscribeLogger = logger.subscribe((newEntry) => {
    if (!isLiveStream.value) return
    if (activeTab.value !== 'frontend') return

    const matchesLevel =
      selectedLevel.value === 'ALL' || newEntry.level === selectedLevel.value
    const matchesSearch =
      !searchQuery.value.trim() ||
      newEntry.message.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      newEntry.context.toLowerCase().includes(searchQuery.value.toLowerCase())

    if (matchesLevel && matchesSearch) {
      logs.value.unshift(newEntry as LogEntry)
      // Cap at 1000 items in DOM for high performance
      if (logs.value.length > 1000) {
        logs.value.pop()
      }
    }
  })
})

onUnmounted(() => {
  if (unsubscribeLogger) {
    unsubscribeLogger()
  }
})

function setLevel(lvl: LogLevel | 'ALL') {
  selectedLevel.value = lvl
  loadLogs()
}

function handleSearch() {
  loadLogs()
}

function toggleExpand(id?: number) {
  if (id === undefined) return
  if (expandedLogIds.value.has(id)) {
    expandedLogIds.value.delete(id)
  } else {
    expandedLogIds.value.add(id)
  }
}

async function handleClearLogs() {
  if (confirm('Hapus semua log lokal dari penyimpanan browser?')) {
    await logStorage.clear()
    logs.value = []
    expandedLogIds.value.clear()
    logger.info('LogViewer', 'Local log database cleared by user')
  }
}

function exportAsJson() {
  const jsonContent = formatLogsAsJson(logs.value)
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadLogFile(
    jsonContent,
    `logs/cybeat-frontend-${dateStr}.json`,
    'application/json',
  )
}

function exportAsText() {
  const textContent = formatLogsAsText(logs.value)
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadLogFile(
    textContent,
    `logs/cybeat-frontend-${dateStr}.txt`,
    'text/plain',
  )
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0')
  } catch {
    return iso
  }
}

const logCounts = computed(() => {
  const counts = { ALL: logs.value.length, DBG: 0, INF: 0, WRN: 0, ERR: 0, FTL: 0 }
  logs.value.forEach((l) => {
    if (counts[l.level] !== undefined) {
      counts[l.level]++
    }
  })
  return counts
})
</script>

<template>
  <AppLayout>
    <div class="logs-page">
      <!-- Top Bar -->
      <div class="logs-page__header">
        <div class="logs-page__title-area">
          <button class="logs-page__back-btn" title="Back" @click="router.back()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h1 class="logs-page__title">System Logs</h1>
            <p class="logs-page__subtitle">Structured local diagnostics & runtime log inspector</p>
          </div>
        </div>

        <div class="logs-page__actions">
          <button
            class="logs-page__btn"
            :class="isLiveStream ? 'logs-page__btn--primary' : 'logs-page__btn--secondary'"
            @click="isLiveStream = !isLiveStream"
            :title="isLiveStream ? 'Live stream active' : 'Live stream paused'"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="6" />
            </svg>
            {{ isLiveStream ? 'Live: On' : 'Live: Paused' }}
          </button>

          <button class="logs-page__btn logs-page__btn--secondary" title="Export JSON" @click="exportAsJson">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            .JSON
          </button>

          <button class="logs-page__btn logs-page__btn--secondary" title="Export TXT (Serilog compact)" @click="exportAsText">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            .TXT
          </button>

          <button class="logs-page__btn logs-page__btn--danger" title="Clear all logs" @click="handleClearLogs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Clear
          </button>
        </div>
      </div>

      <!-- Tab Switcher (Frontend / Backend) -->
      <div class="logs-page__tabs">
        <button
          class="logs-page__tab"
          :class="{ 'logs-page__tab--active': activeTab === 'frontend' }"
          @click="activeTab = 'frontend'"
        >
          Frontend Logs
          <span class="logs-page__tab-badge">{{ logCounts.ALL }}</span>
        </button>

        <button
          class="logs-page__tab"
          :class="{ 'logs-page__tab--active': activeTab === 'backend' }"
          @click="activeTab = 'backend'"
        >
          Backend Logs
          <span class="logs-page__tab-badge">API</span>
        </button>
      </div>

      <!-- Frontend Logs View -->
      <template v-if="activeTab === 'frontend'">
        <!-- Filter Controls -->
        <div class="logs-page__filters">
          <div class="logs-page__level-pills">
            <button
              class="logs-page__pill logs-page__pill--all"
              :class="{ 'logs-page__pill--active': selectedLevel === 'ALL' }"
              @click="setLevel('ALL')"
            >
              ALL
            </button>
            <button
              class="logs-page__pill logs-page__pill--dbg"
              :class="{ 'logs-page__pill--active': selectedLevel === 'DBG' }"
              @click="setLevel('DBG')"
            >
              DBG
            </button>
            <button
              class="logs-page__pill logs-page__pill--inf"
              :class="{ 'logs-page__pill--active': selectedLevel === 'INF' }"
              @click="setLevel('INF')"
            >
              INF
            </button>
            <button
              class="logs-page__pill logs-page__pill--wrn"
              :class="{ 'logs-page__pill--active': selectedLevel === 'WRN' }"
              @click="setLevel('WRN')"
            >
              WRN
            </button>
            <button
              class="logs-page__pill logs-page__pill--err"
              :class="{ 'logs-page__pill--active': selectedLevel === 'ERR' }"
              @click="setLevel('ERR')"
            >
              ERR
            </button>
            <button
              class="logs-page__pill logs-page__pill--ftl"
              :class="{ 'logs-page__pill--active': selectedLevel === 'FTL' }"
              @click="setLevel('FTL')"
            >
              FTL
            </button>
          </div>

          <div class="logs-page__search-wrapper">
            <svg class="logs-page__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              v-model="searchQuery"
              class="logs-page__search-input"
              placeholder="Search message, context, stack..."
              @input="handleSearch"
            />
          </div>
        </div>

        <!-- Log Console / Table -->
        <div class="logs-page__console">
          <div class="logs-page__console-header">
            <span>Showing {{ logs.length }} local log entries</span>
            <span>Target storage: IndexedDB (folder: <code>logs/</code>)</span>
          </div>

          <div class="logs-page__console-body">
            <div v-if="logs.length === 0" class="logs-page__empty">
              <svg class="logs-page__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>No logs found matching the current filter.</span>
            </div>

            <div
              v-for="(log, idx) in logs"
              :key="log.id || `idx-${idx}`"
              class="log-row"
              :class="`log-row--${log.level.toLowerCase()}`"
            >
              <div class="log-row__summary" @click="toggleExpand(log.id || idx)">
                <span class="log-row__time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-row__badge" :class="`log-row__badge--${log.level.toLowerCase()}`">
                  {{ log.level }}
                </span>
                <span class="log-row__context" :title="log.context">[{{ log.context }}]</span>
                <span class="log-row__message" :title="log.message">{{ log.message }}</span>
                <svg
                  class="log-row__chevron"
                  :class="{ 'log-row__chevron--expanded': expandedLogIds.has(log.id || idx) }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              <!-- Expanded Details -->
              <div v-if="expandedLogIds.has(log.id || idx)" class="log-row__details">
                <div class="log-row__detail-block">
                  <span class="log-row__detail-title">Full Timestamp:</span>
                  <code class="log-row__code">{{ log.timestamp }}</code>
                </div>

                <div v-if="log.data" class="log-row__detail-block">
                  <span class="log-row__detail-title">Payload / Context Data:</span>
                  <pre class="log-row__code">{{ JSON.stringify(log.data, null, 2) }}</pre>
                </div>

                <div v-if="log.error" class="log-row__detail-block">
                  <span class="log-row__detail-title">Exception Stack Trace:</span>
                  <pre class="log-row__code log-row__code--stack">{{ log.error.stack || log.error.message }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Backend Logs Tab (Placeholder for Future Connect) -->
      <template v-else>
        <div class="logs-page__backend-placeholder">
          <div class="logs-page__backend-icon">☁️</div>
          <h2 class="logs-page__backend-title">Backend Server Logs</h2>
          <p class="logs-page__backend-desc">
            Backend log integration is being prepared. Once remote logging endpoints become available, live server logs (Serilog / API access logs) will stream here.
          </p>
          <button class="logs-page__btn logs-page__btn--primary" @click="activeTab = 'frontend'">
            Switch to Frontend Logs
          </button>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped src="./LogsPage.css"></style>
