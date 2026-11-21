<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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
import { backendLogsApi } from '../api/backend-logs.api'

const router = useRouter()
useTitle(() => 'Logs • CyBeat')

function goToDashboard(): void {
  void router.push({ name: 'dashboard' })
}

const activeTab = ref<'frontend' | 'backend'>('frontend')
const frontendLogs = ref<LogEntry[]>([])
const backendLogs = ref<LogEntry[]>([])
const backendLoading = ref(false)
const backendError = ref<string | null>(null)
const isSimulatingError = ref(false)

const selectedLevel = ref<LogLevel | 'ALL'>('ALL')
const searchQuery = ref('')
const expandedLogIds = ref<Set<string | number>>(new Set())
const isLiveStream = ref(true)

const customBackendUrl = ref(localStorage.getItem('cybeat_backend_logs_url') || '')

let unsubscribeLogger: (() => void) | null = null
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let backendPollTimer: ReturnType<typeof setInterval> | null = null

// ─── Frontend Logs Loading ──────────────────────────────────────────────────
async function loadFrontendLogs() {
  const data = await logStorage.getAll({
    level: selectedLevel.value,
    search: searchQuery.value.trim() || undefined,
  })
  frontendLogs.value = data
}

// ─── Backend Logs Loading ───────────────────────────────────────────────────
async function loadBackendLogs(isPolling = false) {
  if (!isPolling) {
    backendLoading.value = true
  }
  backendError.value = null

  try {
    const data = await backendLogsApi.getLogs(
      {
        level: selectedLevel.value,
        search: searchQuery.value.trim() || undefined,
        limit: 500,
      },
      customBackendUrl.value.trim() || undefined,
    )
    backendLogs.value = data
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    if (!isPolling) {
      backendError.value = `Gagal memuat log backend: ${errMsg}`
    }
  } finally {
    if (!isPolling) {
      backendLoading.value = false
    }
  }
}

// ─── Active Logs Selector ───────────────────────────────────────────────────
const activeLogs = computed<LogEntry[]>(() => {
  return activeTab.value === 'frontend' ? frontendLogs.value : backendLogs.value
})

const activeCounts = computed(() => {
  const target = activeTab.value === 'frontend' ? frontendLogs.value : backendLogs.value
  const counts = { ALL: target.length, DBG: 0, INF: 0, WRN: 0, ERR: 0, FTL: 0 }
  target.forEach((l) => {
    if (counts[l.level] !== undefined) {
      counts[l.level]++
    }
  })
  return counts
})

function reloadCurrentLogs() {
  if (activeTab.value === 'frontend') {
    void loadFrontendLogs()
  } else {
    void loadBackendLogs()
  }
}

// ─── Lifecycle & Subscriptions ──────────────────────────────────────────────
onMounted(async () => {
  await loadFrontendLogs()

  // Live streaming log subscription for frontend
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
      frontendLogs.value.unshift(newEntry as LogEntry)
      if (frontendLogs.value.length > 1000) {
        frontendLogs.value.pop()
      }
    }
  })

  // Start polling if user opens directly or switches to backend
  startBackendPolling()
})

onUnmounted(() => {
  if (unsubscribeLogger) unsubscribeLogger()
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  stopBackendPolling()
})

function startBackendPolling() {
  stopBackendPolling()
  backendPollTimer = setInterval(() => {
    if (isLiveStream.value && activeTab.value === 'backend' && !backendLoading.value) {
      void loadBackendLogs(true)
    }
  }, 3000)
}

function stopBackendPolling() {
  if (backendPollTimer) {
    clearInterval(backendPollTimer)
    backendPollTimer = null
  }
}

// Watch active tab switch
watch(activeTab, (tab) => {
  expandedLogIds.value.clear()
  if (tab === 'backend') {
    void loadBackendLogs()
  } else {
    void loadFrontendLogs()
  }
})

// Watch live stream toggle
watch(isLiveStream, (enabled) => {
  if (enabled && activeTab.value === 'backend') {
    void loadBackendLogs(true)
  }
})

// ─── Actions & Filters ──────────────────────────────────────────────────────
function setLevel(lvl: LogLevel | 'ALL') {
  selectedLevel.value = lvl
  reloadCurrentLogs()
}

function handleSearch() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    reloadCurrentLogs()
  }, 300)
}

function toggleExpand(id?: string | number) {
  if (id === undefined) return
  if (expandedLogIds.value.has(id)) {
    expandedLogIds.value.delete(id)
  } else {
    expandedLogIds.value.add(id)
  }
}

async function handleClearLogs() {
  if (activeTab.value === 'frontend') {
    if (confirm('Hapus semua log lokal Frontend dari penyimpanan browser (IndexedDB)?')) {
      await logStorage.clear()
      frontendLogs.value = []
      expandedLogIds.value.clear()
      logger.info('LogViewer', 'Local log database cleared by user')
    }
  } else {
    if (confirm('Hapus semua log Backend Serilog dari server (storage/logs/requests.jsonl)?')) {
      try {
        await backendLogsApi.clearLogs(customBackendUrl.value.trim() || undefined)
        backendLogs.value = []
        expandedLogIds.value.clear()
        void loadBackendLogs()
      } catch (err: unknown) {
        alert('Gagal menghapus log backend: ' + (err instanceof Error ? err.message : String(err)))
      }
    }
  }
}

async function handleSimulateError() {
  isSimulatingError.value = true
  try {
    await backendLogsApi.simulateError(customBackendUrl.value.trim() || undefined)
  } finally {
    isSimulatingError.value = false
    // Refresh backend logs immediately to display the newly captured error
    await loadBackendLogs()
  }
}

function saveCustomBackendUrl() {
  localStorage.setItem('cybeat_backend_logs_url', customBackendUrl.value.trim())
  void loadBackendLogs()
}

function exportAsJson() {
  const jsonContent = formatLogsAsJson(activeLogs.value)
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename =
    activeTab.value === 'frontend'
      ? `logs/cybeat-frontend-${dateStr}.json`
      : `logs/cybeat-backend-serilog-${dateStr}.json`
  downloadLogFile(jsonContent, filename, 'application/json')
}

function exportAsText() {
  const textContent = formatLogsAsText(activeLogs.value)
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename =
    activeTab.value === 'frontend'
      ? `logs/cybeat-frontend-${dateStr}.txt`
      : `logs/cybeat-backend-serilog-${dateStr}.txt`
  downloadLogFile(textContent, filename, 'text/plain')
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0')
  } catch {
    return iso
  }
}
</script>

<template>
  <AppLayout>
    <div class="logs-page">
      <!-- Top Bar -->
      <div class="logs-page__header">
        <div class="logs-page__title-area">
          <button
            class="logs-page__back-btn"
            type="button"
            title="Back to dashboard"
            aria-label="Back to dashboard"
            @click="goToDashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h1 class="logs-page__title">Logs</h1>
            <p class="logs-page__subtitle">
              {{ activeTab === 'frontend' ? 'Structured local frontend diagnostics' : 'Serilog request logger & runtime stacktraces' }}
            </p>
          </div>
        </div>

        <div class="logs-page__actions">
          <!-- Simulate Error Button (Only on Backend tab) -->
          <button
            v-if="activeTab === 'backend'"
            class="logs-page__btn logs-page__btn--warning"
            :disabled="isSimulatingError"
            title="Trigger a simulated backend error with full stack trace"
            @click="handleSimulateError"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ isSimulatingError ? 'Testing...' : 'Simulate Error' }}
          </button>

          <!-- Live Streaming Toggle -->
          <button
            class="logs-page__btn"
            :class="isLiveStream ? 'logs-page__btn--primary' : 'logs-page__btn--secondary'"
            :title="isLiveStream ? 'Live polling active' : 'Live polling paused'"
            @click="isLiveStream = !isLiveStream"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="6" />
            </svg>
            {{ isLiveStream ? 'Live: On' : 'Live: Paused' }}
          </button>

          <!-- Export JSON -->
          <button class="logs-page__btn logs-page__btn--secondary" title="Export JSON" @click="exportAsJson">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            .JSON
          </button>

          <!-- Export TXT -->
          <button class="logs-page__btn logs-page__btn--secondary" title="Export TXT (Serilog compact)" @click="exportAsText">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            .TXT
          </button>

          <!-- Clear Logs -->
          <button class="logs-page__btn logs-page__btn--danger" :title="`Clear ${activeTab} logs`" @click="handleClearLogs">
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
          <span class="logs-page__tab-badge">{{ frontendLogs.length }}</span>
        </button>

        <button
          class="logs-page__tab"
          :class="{ 'logs-page__tab--active': activeTab === 'backend' }"
          @click="activeTab = 'backend'"
        >
          Backend Logs
          <span class="logs-page__tab-badge logs-page__tab-badge--backend">{{ backendLogs.length }} • Serilog</span>
        </button>
      </div>

      <!-- Filter Controls -->
      <div class="logs-page__filters">
        <div class="logs-page__level-pills">
          <button
            class="logs-page__pill logs-page__pill--all"
            :class="{ 'logs-page__pill--active': selectedLevel === 'ALL' }"
            @click="setLevel('ALL')"
          >
            ALL ({{ activeCounts.ALL }})
          </button>
          <button
            class="logs-page__pill logs-page__pill--inf"
            :class="{ 'logs-page__pill--active': selectedLevel === 'INF' }"
            @click="setLevel('INF')"
          >
            INF ({{ activeCounts.INF }})
          </button>
          <button
            class="logs-page__pill logs-page__pill--wrn"
            :class="{ 'logs-page__pill--active': selectedLevel === 'WRN' }"
            @click="setLevel('WRN')"
          >
            WRN ({{ activeCounts.WRN }})
          </button>
          <button
            class="logs-page__pill logs-page__pill--err"
            :class="{ 'logs-page__pill--active': selectedLevel === 'ERR' }"
            @click="setLevel('ERR')"
          >
            ERR ({{ activeCounts.ERR }})
          </button>
          <button
            class="logs-page__pill logs-page__pill--ftl"
            :class="{ 'logs-page__pill--active': selectedLevel === 'FTL' }"
            @click="setLevel('FTL')"
          >
            FTL ({{ activeCounts.FTL }})
          </button>
          <button
            class="logs-page__pill logs-page__pill--dbg"
            :class="{ 'logs-page__pill--active': selectedLevel === 'DBG' }"
            @click="setLevel('DBG')"
          >
            DBG ({{ activeCounts.DBG }})
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
            :placeholder="activeTab === 'frontend' ? 'Search message, context, stack...' : 'Search request URI, method, error, stacktrace...'"
            @input="handleSearch"
          />
        </div>
      </div>

      <!-- Backend Error / Connection Warning Banner -->
      <div v-if="activeTab === 'backend' && backendError" class="logs-page__backend-error-bar">
        <div class="logs-page__backend-error-text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ backendError }}</span>
        </div>
        <div class="logs-page__backend-config">
          <input
            v-model="customBackendUrl"
            placeholder="Custom Backend Base URL (e.g. http://localhost:8000/api)"
            class="logs-page__backend-input"
          />
          <button class="logs-page__btn logs-page__btn--primary" @click="saveCustomBackendUrl">
            Hubungkan & Coba Lagi
          </button>
        </div>
      </div>

      <!-- Log Console / Table -->
      <div class="logs-page__console">
        <div class="logs-page__console-header">
          <span>
            Showing {{ activeLogs.length }} {{ activeTab === 'frontend' ? 'local frontend' : 'backend Serilog' }} log entries
          </span>
          <span>
            Target:
            <code v-if="activeTab === 'frontend'">IndexedDB (cybeat_logs_db • Retensi 30 hari)</code>
            <code v-else>storage/logs/requests.jsonl (Serilog • Retensi 30 hari)</code>
          </span>
        </div>

        <div class="logs-page__console-body">
          <!-- Loading State -->
          <div v-if="activeTab === 'backend' && backendLoading && activeLogs.length === 0" class="logs-page__empty">
            <div class="logs-page__spinner"></div>
            <span>Memuat log dari backend server...</span>
          </div>

          <!-- Empty State -->
          <div v-else-if="activeLogs.length === 0" class="logs-page__empty">
            <svg class="logs-page__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>No {{ activeTab }} logs found matching current filter.</span>
          </div>

          <!-- Log Rows -->
          <div
            v-for="(log, idx) in activeLogs"
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
              <span class="log-row__message" :title="log.message">
                <span v-if="log.level === 'INF' && log.message.includes('[SUCCESS]')" class="log-row__tag log-row__tag--success">
                  SUCCESS
                </span>
                <span v-else-if="log.level === 'ERR' || log.level === 'FTL'" class="log-row__tag log-row__tag--error">
                  ERROR
                </span>
                {{ log.message }}
              </span>
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
                <span class="log-row__detail-title">Request Payload & Context:</span>
                <pre class="log-row__code">{{ JSON.stringify(log.data, null, 2) }}</pre>
              </div>

              <div v-if="log.error" class="log-row__detail-block">
                <span class="log-row__detail-title">
                  {{ log.error.name ? `Exception [${log.error.name}]` : 'Error Reason & Stack Trace' }}:
                </span>
                <div v-if="log.error.message" class="log-row__error-message">
                  <strong>Penyebab Error:</strong> {{ log.error.message }}
                </div>
                <pre class="log-row__code log-row__code--stack">{{ log.error.stack || log.error.message }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped src="./LogsPage.css"></style>
