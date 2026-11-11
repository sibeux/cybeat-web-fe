<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import type { Song } from '@/features/album/types/song.types'
  import { useAuthStore } from '@/features/auth/index'
  import { usePlayerStore } from '@/features/album/store/player.store'
  import { useHistoryStore } from '../store/history.store'
  import { useTitle } from '@/core/shared/composables/useTitle'

  const router = useRouter()
  const authStore = useAuthStore()
  const playerStore = usePlayerStore()
  const historyStore = useHistoryStore()

  const { currentSong, isPlaying } = storeToRefs(playerStore)
  const { tracks, isLoading, error } = storeToRefs(historyStore)

  const isScrollTopVisible = ref(false)
  let scrollHandler: (() => void) | null = null
  let historyAbortController: AbortController | null = null

  type SortMode = 'default' | 'alphabetical' | 'artist'
  type SortDirection = 'asc' | 'desc'

  const searchQuery = ref('')
  const sortMode = ref<SortMode>('default')
  const sortDirection = ref<SortDirection>('asc')
  const isSortDropdownOpen = ref(false)
  const sortDropdownRef = ref<HTMLElement | null>(null)

  const sortLabel = computed(() => {
    switch (sortMode.value) {
      case 'alphabetical':
        return 'Alphabetical'
      case 'artist':
        return 'Artist'
      case 'default':
      default:
        return 'Recently Played'
    }
  })

  useTitle(() => {
    if (currentSong.value) {
      return `${currentSong.value.title} • ${currentSong.value.artist}`
    }
    return 'Listening History • Cybeat'
  })

  const loadHistory = async (force = false) => {
    if (!authStore.isAuthenticated) return
    const id = authStore.user?.id ? Number(authStore.user.id) : 0
    if (!id) return

    if (historyAbortController) {
      historyAbortController.abort()
    }
    historyAbortController = new AbortController()

    await historyStore.fetchRecentMusic(id, force, historyAbortController.signal)
  }

  const allSortedSongs = computed<Song[]>(() => {
    const list = [...tracks.value]
    const isAsc = sortDirection.value === 'asc'

    if (sortMode.value === 'alphabetical') {
      list.sort((a, b) => {
        const cmp = a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
        if (cmp !== 0) {
          return isAsc ? cmp : -cmp
        }
        return isAsc ? a.id_music - b.id_music : b.id_music - a.id_music
      })
    } else if (sortMode.value === 'artist') {
      list.sort((a, b) => {
        const cmp = a.artist.localeCompare(b.artist, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
        if (cmp !== 0) {
          return isAsc ? cmp : -cmp
        }
        return isAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
      })
    } else {
      // Default: order of playback history (Recently Played)
      if (!isAsc) {
        list.reverse()
      }
    }

    return list
  })

  const sortedSongs = computed<Song[]>(() => {
    let list = allSortedSongs.value
    const query = searchQuery.value.trim().toLowerCase()
    if (query) {
      list = list.filter((song) => {
        const titleMatch = (song.title || '').toLowerCase().includes(query)
        const artistMatch = (song.artist || '').toLowerCase().includes(query)
        const albumMatch = (song.album || '').toLowerCase().includes(query)
        return titleMatch || artistMatch || albumMatch
      })
    }
    return list
  })

  const toggleSortDropdown = () => {
    isSortDropdownOpen.value = !isSortDropdownOpen.value
  }

  const selectSortMode = (mode: SortMode) => {
    if (sortMode.value === mode) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortMode.value = mode
      sortDirection.value = 'asc'
    }
  }

  const selectSortDirection = (direction: SortDirection) => {
    sortDirection.value = direction
  }

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node | null
    if (!target) return
    if (sortDropdownRef.value && !sortDropdownRef.value.contains(target)) {
      isSortDropdownOpen.value = false
    }
  }

  const clearSearch = () => {
    searchQuery.value = ''
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

  const goBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const playSong = (song: Song) => {
    if (song.codec_name?.toLowerCase() === 'alac') {
      alert('ALAC audio format cannot be played due to browser compatibility.')
      return
    }

    if (currentSong.value?.id_music === song.id_music) {
      playerStore.togglePlayback()
      return
    }

    playerStore.playSong(song, sortedSongs.value, { type: 'history', id: 0 })
  }

  onMounted(async () => {
    scrollHandler = () => {
      isScrollTopVisible.value = window.scrollY > 320
    }

    window.addEventListener('scroll', scrollHandler, { passive: true })
    window.addEventListener('click', handleClickOutside)

    if (authStore.isAuthenticated) {
      await loadHistory()
    }
  })

  onUnmounted(() => {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
    }
    window.removeEventListener('click', handleClickOutside)
    if (historyAbortController) {
      historyAbortController.abort()
      historyAbortController = null
    }
  })
</script>

<template>
  <AppLayout>
    <div class="history-page">
      <!-- Header adapted from logs/users pages -->
      <div class="history-page__header">
        <div class="history-page__title-area">
          <button
            class="history-page__back-btn"
            type="button"
            title="Back"
            aria-label="Back"
            @click="goBack"
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
            <p class="history-page__subtitle">Recently played tracks and listening activity</p>
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
      <div v-else-if="sortedSongs.length === 0 && !searchQuery" class="album-page__state">
        No listening history found.
      </div>

      <!-- Music List Section (Identical to AlbumPage) -->
      <div v-else class="album-page__song-section">
        <!-- Toolbar: Search & Sort -->
        <div class="album-page__toolbar">
          <div class="album-page__search-wrapper">
            <svg
              class="album-page__search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              class="album-page__search-input"
              placeholder="Search songs..."
              aria-label="Search songs in history"
              autocomplete="off"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="album-page__search-clear"
              aria-label="Clear search"
              @click="clearSearch"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Sort dropdown -->
          <div ref="sortDropdownRef" class="album-page__sort-wrapper">
            <button
              type="button"
              class="album-page__sort-btn"
              :class="{ 'album-page__sort-btn--active': isSortDropdownOpen }"
              aria-label="Sort songs"
              aria-haspopup="true"
              :aria-expanded="isSortDropdownOpen"
              @click.stop="toggleSortDropdown"
            >
              <svg
                v-if="sortDirection === 'asc'"
                class="album-page__sort-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m3 8 4-4 4 4" />
                <path d="M7 4v16" />
                <path d="M11 12h4" />
                <path d="M11 16h7" />
                <path d="M11 20h10" />
              </svg>
              <svg
                v-else
                class="album-page__sort-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m3 16 4 4 4-4" />
                <path d="M7 20V4" />
                <path d="M11 4h10" />
                <path d="M11 8h7" />
                <path d="M11 12h4" />
              </svg>
              <span>Sort: {{ sortLabel }}</span>
              <span class="album-page__sort-indicator">{{
                sortDirection === 'asc' ? 'Asc' : 'Desc'
              }}</span>
              <svg
                class="album-page__sort-chevron"
                :class="{ 'album-page__sort-chevron--open': isSortDropdownOpen }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div v-if="isSortDropdownOpen" class="album-page__sort-menu">
              <div class="album-page__sort-menu-header">Sort By</div>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortMode === 'default' }"
                @click="selectSortMode('default')"
              >
                <span>Recently Played</span>
                <svg
                  v-if="sortMode === 'default'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortMode === 'alphabetical' }"
                @click="selectSortMode('alphabetical')"
              >
                <span>Alphabetical</span>
                <svg
                  v-if="sortMode === 'alphabetical'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortMode === 'artist' }"
                @click="selectSortMode('artist')"
              >
                <span>Artist</span>
                <svg
                  v-if="sortMode === 'artist'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>

              <div class="album-page__sort-divider"></div>
              <div class="album-page__sort-menu-header">Order</div>

              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortDirection === 'asc' }"
                @click="selectSortDirection('asc')"
              >
                <div class="album-page__sort-option-content">
                  <svg
                    class="album-page__sort-option-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m3 8 4-4 4 4" />
                    <path d="M7 4v16" />
                  </svg>
                  <span>Ascending</span>
                </div>
                <svg
                  v-if="sortDirection === 'asc'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortDirection === 'desc' }"
                @click="selectSortDirection('desc')"
              >
                <div class="album-page__sort-option-content">
                  <svg
                    class="album-page__sort-option-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m3 16 4 4 4-4" />
                    <path d="M7 20V4" />
                  </svg>
                  <span>Descending</span>
                </div>
                <svg
                  v-if="sortDirection === 'desc'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Table of songs (Identical structure to AlbumPage song-list) -->
        <div class="album-page__content">
          <table class="song-list">
            <thead>
              <tr>
                <th
                  class="song-list__th song-list__th--index song-list__th--sortable"
                  :class="{ 'song-list__th--active': sortMode === 'default' }"
                  title="Sort by recent order"
                  @click="selectSortMode('default')"
                >
                  <span class="song-list__th-content">
                    <span>#</span>
                    <svg
                      v-if="sortMode === 'default'"
                      class="song-list__th-arrow"
                      :class="{ 'song-list__th-arrow--desc': sortDirection === 'desc' }"
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
                <th
                  class="song-list__th song-list__th--title song-list__th--sortable"
                  :class="{ 'song-list__th--active': sortMode === 'alphabetical' }"
                  title="Sort by title"
                  @click="selectSortMode('alphabetical')"
                >
                  <span class="song-list__th-content">
                    <span>Title</span>
                    <svg
                      v-if="sortMode === 'alphabetical'"
                      class="song-list__th-arrow"
                      :class="{ 'song-list__th-arrow--desc': sortDirection === 'desc' }"
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
                <th
                  class="song-list__th song-list__th--artist song-list__th--sortable"
                  :class="{ 'song-list__th--active': sortMode === 'artist' }"
                  title="Sort by artist"
                  @click="selectSortMode('artist')"
                >
                  <span class="song-list__th-content">
                    <span>Artist</span>
                    <svg
                      v-if="sortMode === 'artist'"
                      class="song-list__th-arrow"
                      :class="{ 'song-list__th-arrow--desc': sortDirection === 'desc' }"
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
              <tr v-if="sortedSongs.length === 0" class="album-page__no-results-row">
                <td colspan="3" class="album-page__no-results">
                  No songs found matching "{{ searchQuery }}"
                </td>
              </tr>
              <tr
                v-for="(song, index) in sortedSongs"
                v-else
                :key="`${song.id_music}-${index}`"
                class="song-list__tr"
                :class="{ 'song-list__tr--active': currentSong?.id_music === song.id_music }"
              >
                <td class="song-list__td song-list__td--index">{{ index + 1 }}</td>
                <td class="song-list__td song-list__td--title-cover">
                  <div
                    class="song-list__cover-wrapper"
                    :title="
                      song.codec_name?.toLowerCase() === 'alac' ? 'ALAC format is unsupported' : ''
                    "
                    :style="
                      song.codec_name?.toLowerCase() === 'alac'
                        ? 'cursor: not-allowed; opacity: 0.7;'
                        : ''
                    "
                    @click="playSong(song)"
                  >
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
                      <div
                        class="song-list__play-overlay"
                        :class="{
                          'song-list__play-overlay--active':
                            currentSong?.id_music === song.id_music && isPlaying,
                          'song-list__play-overlay--disabled':
                            song.codec_name?.toLowerCase() === 'alac',
                        }"
                      >
                        <svg
                          v-if="currentSong?.id_music === song.id_music && isPlaying"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                        <svg
                          v-else-if="song.codec_name?.toLowerCase() === 'alac'"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <img
                      v-if="resolveQualityBadge(song)"
                      v-img-cache="resolveQualityBadge(song)"
                      :alt="`${song.codec_name} quality badge`"
                      class="song-list__quality-badge"
                    />
                  </div>
                  <span
                    class="song-list__title"
                    :class="{ 'song-list__title--active': currentSong?.id_music === song.id_music }"
                    :title="song.title"
                    @click="playSong(song)"
                  >
                    {{ song.title }}
                  </span>
                </td>
                <td class="song-list__td song-list__td--artist" :title="song.artist">
                  {{ song.artist }}
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
