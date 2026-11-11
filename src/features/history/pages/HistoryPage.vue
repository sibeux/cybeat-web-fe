<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import type { Song } from '@/features/album/types/song.types'
  import ArtistLinks from '@/features/artist/components/ArtistLinks.vue'
  import { useAuthStore } from '@/features/auth/index'
  import { useHistoryStore } from '../store/history.store'
  import { useUsersStore } from '@/features/users/store/users.store'
  import { useTitle } from '@/core/shared/composables/useTitle'

  const router = useRouter()
  const authStore = useAuthStore()
  const historyStore = useHistoryStore()
  const usersStore = useUsersStore()

  const { tracks, isLoading, error } = storeToRefs(historyStore)
  const { users, isLoading: isUsersLoading } = storeToRefs(usersStore)

  const isScrollTopVisible = ref(false)
  let scrollHandler: (() => void) | null = null
  let historyAbortController: AbortController | null = null

  // Admin user selection
  const currentUserId = computed(() => (authStore.user?.id ? Number(authStore.user.id) : 0))
  const isAdmin = computed(() => authStore.user?.role === 'admin')
  const selectedUserId = ref<number>(authStore.user?.id ? Number(authStore.user.id) : 0)

  const otherUsers = computed(() =>
    users.value.filter((u) => Number(u.user_id) !== currentUserId.value),
  )

  const subtitleText = computed(() => {
    if (isAdmin.value && selectedUserId.value !== currentUserId.value) {
      const target = users.value.find((u) => Number(u.user_id) === selectedUserId.value)
      const name = target ? (target.name || target.email) : `User #${selectedUserId.value}`
      return `Viewing listening history for ${name}`
    }
    return 'Recently played tracks and listening activity'
  })

  // Sort strictly by playback date
  type DateSortOrder = 'desc' | 'asc'
  const dateSortOrder = ref<DateSortOrder>('desc')

  useTitle(() => 'Listening History • Cybeat')

  const loadHistory = async (force = false) => {
    if (!authStore.isAuthenticated) return
    const targetId = isAdmin.value && selectedUserId.value > 0
      ? selectedUserId.value
      : (authStore.user?.id ? Number(authStore.user.id) : 0)

    if (!targetId) return

    if (historyAbortController) {
      historyAbortController.abort()
    }
    historyAbortController = new AbortController()

    await historyStore.fetchRecentMusic(targetId, force, historyAbortController.signal)
  }

  watch(selectedUserId, (newId) => {
    if (newId > 0) {
      loadHistory(true)
    }
  })

  const sortedSongs = computed<Song[]>(() => {
    const list = [...tracks.value]
    list.sort((a, b) => {
      const timeA = a.played_at ? new Date(a.played_at.replace(/-/g, '/')).getTime() : 0
      const timeB = b.played_at ? new Date(b.played_at.replace(/-/g, '/')).getTime() : 0
      return dateSortOrder.value === 'desc' ? timeB - timeA : timeA - timeB
    })
    return list
  })

  const toggleDateSort = () => {
    dateSortOrder.value = dateSortOrder.value === 'desc' ? 'asc' : 'desc'
  }

  const resolveCoverUrl = (cover: string | null) => {
    if (!cover) return ''
    if (cover.startsWith('http') || cover.startsWith('data:')) return cover

    if (cover.includes('cover_url=cdncloudflare/')) {
      const match = cover.match(/cover_url=cdncloudflare\/(.*)/)
      if (match && match[1]) return `https://cdn.sibeux.my.id/${match[1]}`
    }

    return `https://${cover}`
  }

  const DEFAULT_COVER = '/assets/images/placeholder_cover_music.png'

  const resolveQualityBadge = (song: Song) => {
    if (song.codec_name?.toLowerCase() === 'alac') return '/assets/images/badge-alac.png'
    const sampleRate = Number.parseFloat(song.sample_rate)
    if (sampleRate >= 96) return '/assets/images/badge-en-hires.png'
    if (sampleRate > 0 && song.music_quality?.toLowerCase() === 'lossless')
      return '/assets/images/badge-en-lossless.png'
    return undefined
  }

  const handleCoverError = (e: Event) => {
    const img = e.target as HTMLImageElement
    if (img.dataset.fallbackApplied) return
    img.dataset.fallbackApplied = 'true'
    img.src = DEFAULT_COVER
  }

  const goToDashboard = () => {
    void router.push({ name: 'dashboard' })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function formatPlayedAt(playedAt?: string): string {
    if (!playedAt) return '-'
    try {
      const date = new Date(playedAt.replace(/-/g, '/'))
      if (Number.isNaN(date.getTime())) return playedAt

      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHours = Math.floor(diffMin / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSec < 60) return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      if (diffHours < 24 && now.getDate() === date.getDate()) {
        return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
      }
      if (diffDays === 1) {
        return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
      }
      return date.toLocaleDateString([], {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    } catch {
      return playedAt
    }
  }

  onMounted(async () => {
    scrollHandler = () => {
      isScrollTopVisible.value = window.scrollY > 320
    }

    window.addEventListener('scroll', scrollHandler, { passive: true })

    if (authStore.isAuthenticated) {
      selectedUserId.value = authStore.user?.id ? Number(authStore.user.id) : 0
      if (isAdmin.value) {
        usersStore.fetchUsers().catch(() => undefined)
      }
      await loadHistory()
    }
  })

  onUnmounted(() => {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
    }
    if (historyAbortController) {
      historyAbortController.abort()
      historyAbortController = null
    }
  })
</script>

<template>
  <AppLayout>
    <div class="history-page">
      <!-- Header (matching logs / users pages) -->
      <div class="history-page__header">
        <div class="history-page__title-area">
          <button
            class="history-page__back-btn"
            type="button"
            title="Back to dashboard"
            aria-label="Back to dashboard"
            @click="goToDashboard"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 class="history-page__title">Listening History</h1>
            <p class="history-page__subtitle">{{ subtitleText }}</p>
          </div>
        </div>
        <div class="history-page__actions">
          <div class="history-page__count">
            <strong>{{ tracks.length }}</strong>
            <span>played tracks</span>
          </div>
          <button
            class="history-page__refresh"
            type="button"
            :disabled="isLoading"
            title="Refresh history"
            @click="loadHistory(true)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Admin User Selection Bar (visible only for admin) -->
      <div v-if="isAdmin" class="history-page__admin-bar">
        <div class="history-page__admin-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <polyline points="16 11 18 13 22 9"></polyline>
          </svg>
          <span>Admin History Inspector:</span>
        </div>
        <select
          v-model="selectedUserId"
          class="history-page__admin-select"
          :disabled="isLoading || isUsersLoading"
          aria-label="Select user to inspect history"
        >
          <option :value="currentUserId">
            My History ({{ authStore.user?.name || authStore.user?.email }})
          </option>
          <option
            v-for="u in otherUsers"
            :key="u.user_id"
            :value="Number(u.user_id)"
          >
            {{ u.name || 'Unnamed' }} ({{ u.email }}) — [{{ u.role }}]
          </option>
        </select>
        <span v-if="isUsersLoading" class="history-page__admin-loading">Loading users...</span>
      </div>

      <!-- State: Not Authenticated -->
      <div v-if="!authStore.isAuthenticated" class="album-page__state">
        <p style="margin-bottom: 0.75rem;">Please sign in to view your listening history.</p>
        <button
          type="button"
          style="padding: 0.5rem 1.25rem; background: var(--color-primary); color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;"
          @click="router.push('/login')"
        >
          Sign In
        </button>
      </div>

      <!-- State: Loading -->
      <div v-else-if="isLoading && tracks.length === 0" class="album-page__state">
        <svg
          class="album-page__spinner"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        Loading history...
      </div>

      <!-- State: Error -->
      <div v-else-if="error" class="album-page__state album-page__state--error">
        {{ error }}
      </div>

      <!-- State: Empty -->
      <div v-else-if="sortedSongs.length === 0" class="album-page__state">
        No listening history found for this user.
      </div>

      <!-- Music List Section (AlbumPage layout & styling, view-only) -->
      <div v-else class="album-page__song-section">
        <!-- Toolbar: Sort by date only -->
        <div class="history-page__toolbar">
          <button
            type="button"
            class="history-page__sort-btn"
            :title="dateSortOrder === 'desc' ? 'Sort by date: Newest first' : 'Sort by date: Oldest first'"
            @click="toggleDateSort"
          >
            <svg
              v-if="dateSortOrder === 'desc'"
              class="history-page__sort-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m3 16 4 4 4-4" />
              <path d="M7 20V4" />
              <path d="M11 4h10" />
              <path d="M11 8h7" />
              <path d="M11 12h4" />
            </svg>
            <svg
              v-else
              class="history-page__sort-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m3 8 4-4 4 4" />
              <path d="M7 4v16" />
              <path d="M11 12h4" />
              <path d="M11 16h7" />
              <path d="M11 20h10" />
            </svg>
            <span>Date: {{ dateSortOrder === 'desc' ? 'Newest first' : 'Oldest first' }}</span>
            <span class="history-page__sort-indicator">{{ dateSortOrder === 'desc' ? 'Desc' : 'Asc' }}</span>
          </button>
        </div>

        <!-- Table of songs (View-only) -->
        <div class="album-page__content">
          <table class="song-list">
            <thead>
              <tr>
                <th class="song-list__th song-list__th--index">#</th>
                <th class="song-list__th song-list__th--title">Title</th>
                <th class="song-list__th song-list__th--artist">Artist</th>
                <th
                  class="song-list__th song-list__th--date song-list__th--sortable song-list__th--active"
                  :title="`Sorted by date (${dateSortOrder === 'desc' ? 'Newest' : 'Oldest'})`"
                  @click="toggleDateSort"
                >
                  <span class="song-list__th-content">
                    <span>Played At</span>
                    <svg
                      class="song-list__th-arrow"
                      :class="{ 'song-list__th-arrow--desc': dateSortOrder === 'desc' }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(song, index) in sortedSongs"
                :key="`${song.id_music}-${(song as any).played_at || index}`"
                class="song-list__tr history-page__tr"
              >
                <td class="song-list__td song-list__td--index">{{ index + 1 }}</td>
                <td class="song-list__td song-list__td--title-cover">
                  <div class="song-list__cover-wrapper history-page__cover-wrapper">
                    <div class="song-list__cover-surface">
                      <img
                        v-if="resolveCoverUrl(song.cover)"
                        v-img-cache="resolveCoverUrl(song.cover)"
                        :alt="song.title"
                        class="song-list__cover"
                        loading="lazy"
                        @error="handleCoverError"
                      />
                      <div v-else class="song-list__cover-placeholder">
                        <img
                          v-img-cache="DEFAULT_COVER"
                          :alt="song.title"
                          class="song-list__cover"
                        />
                      </div>
                    </div>
                    <img
                      v-if="resolveQualityBadge(song)"
                      v-img-cache="resolveQualityBadge(song)"
                      :alt="`${song.codec_name} quality badge`"
                      class="song-list__quality-badge"
                    />
                  </div>
                  <span class="song-list__title" :title="song.title">
                    {{ song.title }}
                  </span>
                </td>
                <td class="song-list__td song-list__td--artist" :title="song.artist">
                  <ArtistLinks :artists="song.artists" :fallback="song.artist" />
                </td>
                <td
                  class="song-list__td song-list__td--date"
                  :title="(song as any).played_at"
                >
                  {{ formatPlayedAt((song as any).played_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Scroll to Top (Identical to AlbumPage) -->
    <button
      v-if="isScrollTopVisible"
      type="button"
      class="album-page__scroll-top"
      aria-label="Scroll to top"
      title="Scroll to top"
      @click="scrollToTop"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  </AppLayout>
</template>

<style scoped src="@/features/album/pages/AlbumPage.css"></style>
<style scoped src="./HistoryPage.css"></style>
