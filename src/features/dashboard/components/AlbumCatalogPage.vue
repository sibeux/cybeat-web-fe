<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppLayout from '@/core/app/layouts/AppLayout.vue'
import { usePlayerStore } from '@/features/album/store/player.store'
import { useDashboardStore as useLibraryStore } from '../store/dashboard.store'
import type { Album } from '../types/album.types'

const libraryStore = useLibraryStore()
const router = useRouter()
const playerStore = usePlayerStore()
const props = defineProps<{
  albums: Album[]
  isLoading: boolean
  error: string | null
  title: string
  badge: string
  subtitle: string
  embedded?: boolean
  loadedCount?: boolean
  initialSearch?: string
  serverSort?: boolean
  initialSortMode?: 'default' | 'alphabetical' | 'created'
  initialSortDirection?: 'asc' | 'desc'
}>()
const emit = defineEmits<{
  (event: 'update:albums', value: Album[]): void
  (event: 'refresh'): void
  (event: 'search', query: string): void
  (event: 'sort', value: { mode: 'default' | 'alphabetical' | 'created'; direction: 'asc' | 'desc' }): void
}>()

const albums = computed({ get: () => props.albums, set: (value) => emit('update:albums', value) })
const { currentAlbum } = storeToRefs(playerStore)


const localSearch = ref(props.initialSearch || '')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(localSearch, (query) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', query.trim()), 300)
})
const albumContextMenu = ref<{ item: Album; x: number; y: number } | null>(null)
const albumContextMenuRef = ref<HTMLElement | null>(null)
const showScrollTop = ref(false)

const DEFAULT_COVER = '/assets/images/placeholder_cover_music.png'

const resolveCoverUrl = (cover: unknown) => {
  if (typeof cover !== 'string' || !cover) return ''
  if (cover.startsWith('http') || cover.startsWith('data:')) return cover

  if (cover.includes('cover_url=cdncloudflare/')) {
    const match = cover.match(/cover_url=cdncloudflare\/(.*)/)
    if (match && match[1]) return `https://cdn.sibeux.my.id/${match[1]}`
  }

  return `https://${cover}`
}

const getCoverUrls = (item: Album): string[] => {
  const cover = item.cover
  if (!cover || typeof cover !== 'object') {
    const url = resolveCoverUrl(cover)
    return url ? [url] : []
  }
  return []
}

const handleCoverError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img.dataset.fallbackApplied) return
  img.dataset.fallbackApplied = 'true'
  img.src = DEFAULT_COVER
}

const isPlayingAlbum = (item: Album) => {
  return (
    String(currentAlbum.value?.type) === String(item.type) &&
    Number(currentAlbum.value?.id) === Number(item.id)
  )
}

const goToAlbum = (item: Album) => {
  router.push({
    name: 'album',
    params: { type: 'album', id: item.id },
    state: {
      albumName: item.title,
      artistName: item.author || '',
      isPinned: Boolean(item.pin_at),
    },
  })
}

const goToDashboard = () => {
  router.push('/')
}

type SortMode = 'default' | 'alphabetical' | 'created'
const sortMode = ref<SortMode>(props.initialSortMode || 'default')
const sortDirection = ref<'asc' | 'desc'>(props.initialSortDirection || 'desc')
watch([sortMode, sortDirection], () => emit('sort', { mode: sortMode.value, direction: sortDirection.value }))
const isSortDropdownOpen = ref(false)
const sortDropdownRef = ref<HTMLElement | null>(null)
const sortLabel = computed(() => ({ default: 'Default (ID)', alphabetical: 'Alphabetical', created: 'Created at' })[sortMode.value])
const toggleSortDropdown = () => { isSortDropdownOpen.value = !isSortDropdownOpen.value }
const selectSortMode = (mode: SortMode) => {
  if (sortMode.value === mode) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { sortMode.value = mode; sortDirection.value = 'asc' }
}
const selectSortDirection = (direction: 'asc' | 'desc') => { sortDirection.value = direction }
const albumNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const filteredAlbums = computed(() => props.serverSort ? albums.value : [...albums.value].sort((a, b) => {
  let difference = a.id - b.id
  if (sortMode.value === 'alphabetical') difference = albumNameCollator.compare(a.title, b.title) || difference
  if (sortMode.value === 'created') difference = ((Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0)) || difference
  return sortDirection.value === 'asc' ? difference : -difference
}))

const handleRefresh = () => emit('refresh')

const openAlbumMenu = (event: MouseEvent, item: Album) => {
  event.preventDefault()
  const menuWidth = 180
  const menuHeight = 52
  albumContextMenu.value = {
    item,
    x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
  }
}

const toggleAlbumLibraryFromMenu = async () => {
    const item = albumContextMenu.value?.item
    albumContextMenu.value = null
    if (item) await libraryStore.toggleLibraryAlbum(item)
  }

const handleOutsideClick = (event: MouseEvent) => {
  if (!sortDropdownRef.value?.contains(event.target as Node)) isSortDropdownOpen.value = false
  if (albumContextMenuRef.value?.contains(event.target as Node)) return
  albumContextMenu.value = null
}

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  if (!props.embedded) void libraryStore.fetchSidebarData()
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  clearTimeout(searchTimer)
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <component :is="embedded ? 'div' : AppLayout">
    <div class="all-albums-page" :class="{ 'all-albums-page--embedded': embedded }">
      <!-- Header -->
      <header class="all-albums-page__header">
        <div class="all-albums-page__title-area">
          <button
            class="all-albums-page__back-btn"
            type="button"
            title="Back to dashboard"
            aria-label="Back to dashboard"
            @click="goToDashboard"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="all-albums-page__heading">
            <div class="all-albums-page__badge-row">
              <span class="all-albums-page__badge">{{ badge }}</span>
              <span class="all-albums-page__count" v-if="filteredAlbums.length">
                {{ filteredAlbums.length }} albums{{ loadedCount ? ' loaded' : '' }}
              </span>
            </div>
            <h1 class="all-albums-page__title">{{ title }}</h1>
            <p class="all-albums-page__subtitle">{{ subtitle }}</p>
          </div>
        </div>

        <!-- Catalog toolbar -->
        <div class="all-albums-page__actions">
          <div class="all-albums-page__search">
            <label for="dashboard-search" class="all-albums-page__search-label">Search Album</label>
            <div class="all-albums-page__search-input-wrapper">
              <svg
                class="all-albums-page__search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                id="dashboard-search"
                v-model="localSearch"
                type="search"
                class="all-albums-page__search-input"
                placeholder="Search by title or artist..."
                autocomplete="off"
              />
              <button
                v-if="localSearch"
                type="button"
                class="all-albums-page__search-clear"
                aria-label="Clear search"
                @click="localSearch = ''"
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
          </div>

<div ref="sortDropdownRef" class="catalog-sort__wrapper" @keydown.esc="isSortDropdownOpen = false">
            <button
              type="button"
              class="catalog-sort__btn"
              :class="{ 'catalog-sort__btn--active': isSortDropdownOpen }"
              aria-label="Sort albums"
              aria-haspopup="true"
              :aria-expanded="isSortDropdownOpen"
              @click.stop="toggleSortDropdown"
            >
              <!-- Ascending icon -->
              <svg
                v-if="sortDirection === 'asc'"
                class="catalog-sort__icon"
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
              <!-- Descending icon -->
              <svg
                v-else
                class="catalog-sort__icon"
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
              <span class="catalog-sort__indicator">{{
                sortDirection === 'asc' ? 'Asc' : 'Desc'
              }}</span>
              <svg
                class="catalog-sort__chevron"
                :class="{ 'catalog-sort__chevron--open': isSortDropdownOpen }"
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

            <div v-if="isSortDropdownOpen" class="catalog-sort__menu">
              <div class="catalog-sort__menu-header">Sort By</div>
              <button
                type="button"
                class="catalog-sort__option"
                :class="{ 'catalog-sort__option--active': sortMode === 'default' }"
                @click="selectSortMode('default')"
              >
                <span>Default (ID)</span>
                <svg
                  v-if="sortMode === 'default'"
                  class="catalog-sort__check"
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
                class="catalog-sort__option"
                :class="{ 'catalog-sort__option--active': sortMode === 'alphabetical' }"
                @click="selectSortMode('alphabetical')"
              >
                <span>Alphabetical</span>
                <svg
                  v-if="sortMode === 'alphabetical'"
                  class="catalog-sort__check"
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
                class="catalog-sort__option"
                :class="{ 'catalog-sort__option--active': sortMode === 'created' }"
                @click="selectSortMode('created')"
              >
                <span>Created at</span>
                <svg
                  v-if="sortMode === 'created'"
                  class="catalog-sort__check"
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

              <div class="catalog-sort__divider"></div>
              <div class="catalog-sort__menu-header">Order</div>

              <button
                type="button"
                class="catalog-sort__option"
                :class="{ 'catalog-sort__option--active': sortDirection === 'asc' }"
                @click="selectSortDirection('asc')"
              >
                <div class="catalog-sort__option-content">
                  <svg
                    class="catalog-sort__option-icon"
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
                  class="catalog-sort__check"
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
                class="catalog-sort__option"
                :class="{ 'catalog-sort__option--active': sortDirection === 'desc' }"
                @click="selectSortDirection('desc')"
              >
                <div class="catalog-sort__option-content">
                  <svg
                    class="catalog-sort__option-icon"
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
                  class="catalog-sort__check"
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


          <button
            type="button"
            class="all-albums-page__refresh-btn"
            :class="{ 'all-albums-page__refresh-btn--loading': isLoading }"
            :disabled="isLoading"
            title="Refresh albums"
            aria-label="Refresh albums"
            @click="handleRefresh"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </header>
      <p v-if="libraryStore.libraryError" role="alert">{{ libraryStore.libraryError }}</p>

      <!-- Loading State -->
      <div v-if="isLoading && albums.length === 0" class="all-albums-page__loading">
        <div class="all-albums-grid">
          <div v-for="i in 12" :key="`skel-album-${i}`" class="all-albums-skeleton">
            <div class="all-albums-skeleton-cover"></div>
            <div class="all-album-info">
              <h3 class="all-album-title all-albums-skeleton-text">&nbsp;</h3>
              <p class="all-album-artist all-albums-skeleton-text short">&nbsp;</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error && albums.length === 0" class="all-albums-page__error">
        <p>{{ error }}</p>
        <button type="button" class="all-albums-page__retry-btn" @click="handleRefresh">Try Again</button>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Album Grid -->
        <div v-if="filteredAlbums.length > 0" class="all-albums-grid">
          <div
            v-for="item in filteredAlbums"
            :key="item.id"
            class="all-album-card"
            :class="{ 'all-album-card--playing': isPlayingAlbum(item) }"
            @click="goToAlbum(item)"
            @contextmenu.prevent.stop="openAlbumMenu($event, item)"
          >
            <div
              class="all-album-cover"
              :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }"
            >
              <img
                v-if="getCoverUrls(item).length"
                v-img-cache="getCoverUrls(item)[0]"
                :alt="item.title"
                loading="lazy"
                @error="handleCoverError"
              />
              <img v-else v-img-cache="DEFAULT_COVER" :alt="item.title" />

              <!-- Disc badge -->
              <span v-if="item.have_disc" class="all-album-disc-badge" title="Have Disc">
                <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Disc
              </span>

              <div
                v-if="isPlayingAlbum(item)"
                class="all-album-playing-indicator"
                aria-label="Playing now"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>

            <div class="all-album-info">
              <div class="all-album-title-row">
                <svg
                  v-if="item.pin_at"
                  class="all-album-pin-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  title="Pinned"
                  aria-label="Pinned"
                >
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" />
                </svg>
                <h3
                  class="all-album-title"
                  :class="{ 'all-album-title--playing': isPlayingAlbum(item) }"
                  :title="item.title"
                >
                  {{ item.title }}
                </h3>
              </div>
              <p
                class="all-album-artist"
                :class="{ 'all-album-artist--playing': isPlayingAlbum(item) }"
                :title="item.author"
              >
                {{ item.author }}
              </p>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="all-albums-page__empty">
          <p v-if="localSearch">No albums match “{{ localSearch }}”.</p>
          <p v-else>There are no albums to display.</p>
          <button v-if="localSearch" type="button" class="all-albums-page__retry-btn" @click="localSearch = ''">
            Clear Search
          </button>
        </div>
      </div>
      <slot />
    </div>

    <!-- Album Context Menu (Pin/Unpin) -->
    <Teleport to="body">
      <div
        v-if="albumContextMenu"
        ref="albumContextMenuRef"
        class="all-albums-context-menu"
        :style="{ top: `${albumContextMenu.y}px`, left: `${albumContextMenu.x}px` }"
        role="menu"
      >
        <button
          type="button"
          class="all-albums-context-menu-item"
          role="menuitem"
          :disabled="libraryStore.libraryBusyId !== null || libraryStore.isSidebarLoading"
          @click="toggleAlbumLibraryFromMenu"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M4 3h3v18H4V3zm5 0h3v18H9V3zm5 2 3-1 6 16-3 1-6-16z" />
          </svg>
          <span>{{ libraryStore.isInLibrary(albumContextMenu.item.id) ? 'Remove from library' : 'Add to library' }}</span>
        </button>
      </div>
    </Teleport>

    <!-- Scroll to top button -->
    <Transition name="fade">
      <button
        v-if="showScrollTop && !embedded"
        class="all-albums-scroll-top"
        type="button"
        aria-label="Scroll to top"
        @click="scrollToTop"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </Transition>
  </component>
</template>

<style scoped>
.all-albums-page {
  padding: 2rem 2.5rem 4rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .all-albums-page {
    padding: 1.25rem 1rem 3rem;
  }
}

.all-albums-page__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  padding-bottom: 1.5rem;
}

.all-albums-page__title-area {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  min-width: 0;
}

.all-albums-page__heading {
  min-width: 0;
}

.all-albums-page__back-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
  background: var(--color-surface-raised, rgba(255, 255, 255, 0.05));
  color: var(--color-text, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.all-albums-page__back-btn:hover {
  background: var(--color-primary, #6366f1);
  border-color: var(--color-primary, #6366f1);
  transform: translateX(-2px);
}

.all-albums-page__badge-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.all-albums-page__badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm, 6px);
  background: var(--color-primary-subtle, rgba(99, 102, 241, 0.15));
  color: var(--color-primary, #6366f1);
}

.all-albums-page__count {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #a1a1aa);
}

.all-albums-page__title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text, #ffffff);
  margin: 0 0 0.35rem 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.all-albums-page__subtitle {
  font-size: 0.9375rem;
  color: var(--color-text-muted, #a1a1aa);
  margin: 0;
  line-height: 1.5;
}

.all-albums-page__actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 2.5rem;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.all-albums-page__search {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.all-albums-page__search-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.all-albums-page__search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  box-sizing: border-box;
  height: 2.5rem;
  padding: 0 0.875rem;
  background: var(--color-surface, #17191f);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 0.5rem);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.all-albums-page__search-input-wrapper:focus-within {
  border-color: var(--color-primary, #6366f1);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent);
}

.all-albums-page__search-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: var(--color-text-muted, #71717a);
}

.all-albums-page__search-input {
  width: 100%;
  min-width: 0;
  padding: 0.65rem 0;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--color-text, #ffffff);
  font: inherit;
  font-size: 0.875rem;
}

.all-albums-page__search-input::placeholder {
  color: var(--color-text-muted, #71717a);
}

.all-albums-page__search-input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.all-albums-page__search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 50%;
  color: var(--color-text-muted, #71717a);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.all-albums-page__search-clear:hover {
  color: var(--color-text, #ffffff);
  background: var(--color-surface-raised, rgba(255, 255, 255, 0.1));
}

.all-albums-page__search-clear svg {
  width: 0.875rem;
  height: 0.875rem;
}

.all-albums-page__refresh-btn {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: var(--radius-md, 0.5rem);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
  background: var(--color-surface-raised, rgba(255, 255, 255, 0.05));
  color: var(--color-text-muted, #a1a1aa);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.all-albums-page__refresh-btn:hover:not(:disabled) {
  color: var(--color-text, #ffffff);
  background: var(--color-primary, #6366f1);
  border-color: var(--color-primary, #6366f1);
}

.all-albums-page__refresh-btn--loading svg {
  animation: spin 0.8s linear infinite;
}

@media (max-width: 900px) {
  .all-albums-page__header {
    grid-template-columns: minmax(0, 1fr);
  }

  .all-albums-page__actions {
    margin-left: 0;
  }
}

@media (max-width: 600px) {
  .all-albums-page__header {
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
  }

  .all-albums-page__title-area {
    gap: 0.75rem;
  }

  .all-albums-page__actions {
    grid-template-columns: minmax(0, 1fr) 2.5rem;
    margin-left: 0;
    gap: 0.875rem 0.5rem;
  }

  .all-albums-page__search {
    grid-column: 1 / -1;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Grid & Cards */
.all-albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.375rem;
}

@media (max-width: 768px) {
  .all-albums-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.375rem;
  }
}

.all-album-card,
.all-albums-skeleton {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  min-width: 0;
}

.all-album-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: calc(var(--radius-md, 8px) + 0.25rem);
  border: 1px solid color-mix(in srgb, var(--color-text, #fff) 8%, transparent);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--color-text, #fff) 7%, var(--color-surface-raised, #18181b)),
    var(--color-surface-raised, #18181b) 65%
  );
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-text, #fff) 4%, transparent);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s ease-out;
}

.all-album-card:hover {
  background: transparent;
  transform: none;
}

.all-album-card:hover::before {
  opacity: 1;
  transition-duration: 0.06s;
}

.all-album-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: var(--color-surface-raised, #18181b);
}

.all-album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;

}

.all-album-card:hover .all-album-cover img {
  transform: none;
}

.all-album-card--playing .all-album-cover {
  box-shadow: 0 0 0 2px var(--color-primary, #6366f1), 0 8px 20px rgba(99, 102, 241, 0.25);
}

.all-album-disc-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0, 0, 0, 0.75);
  color: #1fd660;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.all-album-playing-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.48);
  color: #fff;
}

.all-album-playing-indicator svg {
  width: 2.5rem;
  height: 2.5rem;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}

.all-album-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.all-album-title-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.all-album-pin-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: var(--color-primary, #6366f1);
}

.all-album-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text, #ffffff);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.all-album-title--playing {
  color: var(--color-primary, #6366f1);
}

.all-album-artist {
  font-size: 0.875rem;
  color: var(--color-text-muted, #a1a1aa);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.all-album-artist--playing {
  color: var(--color-primary, #6366f1);
}

.all-albums-page__empty,
.all-albums-page__error {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-muted, #a1a1aa);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.all-albums-page__retry-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-primary, #6366f1);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm, 6px);
  font-weight: 600;
  cursor: pointer;
}

/* Skeletons */
.all-albums-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: default;
}

.all-albums-skeleton-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md, 8px);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: allAlbumsShimmer 1.5s infinite;
}

.all-albums-skeleton-text {
  border-radius: 4px;
  width: 80%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: allAlbumsShimmer 1.5s infinite;
}

.all-albums-skeleton-text.short {
  width: 50%;
}

@keyframes allAlbumsShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Context Menu */
.all-albums-context-menu {
  position: fixed;
  z-index: 9999;
  background: var(--color-surface, #1e1e24);
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-md, 8px);
  padding: 0.35rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  min-width: 160px;
}

.all-albums-context-menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  color: var(--color-text, #ffffff);
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.all-albums-context-menu-item:hover {
  background: var(--color-surface-hover, rgba(255, 255, 255, 0.1));
  color: var(--color-primary, #6366f1);
}

/* Scroll top button */
.all-albums-scroll-top {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--color-primary, #6366f1);
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
  z-index: 100;
}

.all-albums-scroll-top:hover {
  transform: translateY(-2px);
}
.all-albums-page.all-albums-page--embedded {
  padding: 0;
  max-width: none;
  margin: 0;
}
.catalog-sort__wrapper {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.catalog-sort__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.catalog-sort__btn:hover {
  background-color: var(--color-surface-raised);
  border-color: rgba(255, 255, 255, 0.2);
}

.catalog-sort__btn--active {
  background-color: var(--color-surface-raised);
  border-color: var(--color-primary, #10b981);
  color: var(--color-text);
}

.catalog-sort__indicator {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.1rem 0.35rem;
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary, #10b981);
}

.catalog-sort__icon {
  width: 1rem;
  height: 1rem;
  color: var(--color-text-muted);
}

.catalog-sort__chevron {
  width: 0.875rem;
  height: 0.875rem;
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
}

.catalog-sort__chevron--open {
  transform: rotate(180deg);
}

.catalog-sort__menu {
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0;
  z-index: 50;
  min-width: 180px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  animation: catalogSortDropdownFade 0.15s ease;
}

@keyframes catalogSortDropdownFade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.catalog-sort__menu-header {
  padding: 0.35rem 0.75rem 0.2rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.catalog-sort__divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.35rem 0;
}

.catalog-sort__option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.catalog-sort__option:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.catalog-sort__option--active {
  color: var(--color-primary, #10b981);
  font-weight: 600;
}

.catalog-sort__option-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.catalog-sort__option-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: var(--color-text-muted);
}

.catalog-sort__option--active .catalog-sort__option-icon {
  color: var(--color-primary, #10b981);
}

.catalog-sort__check {
  width: 0.875rem;
  height: 0.875rem;
  color: var(--color-primary, #10b981);
  flex-shrink: 0;
}


.catalog-sort__btn { font-family: inherit; }
.catalog-sort__btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
@media (max-width: 600px) { .catalog-sort__wrapper { justify-self: start; } .catalog-sort__menu { left: 0; right: auto; } }
</style>
