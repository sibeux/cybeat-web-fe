<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppLayout from '@/core/app/layouts/AppLayout.vue'
import { usePlayerStore } from '@/features/album/store/player.store'
import { pinApi, type PinnableType } from '@/features/album/api/pin.api'
import type { Album } from '../types/album.types'

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
}>()
const emit = defineEmits<{
  (event: 'update:albums', value: Album[]): void
  (event: 'refresh'): void
  (event: 'search', query: string): void
}>()

const albums = computed({ get: () => props.albums, set: (value) => emit('update:albums', value) })
const { currentAlbum } = storeToRefs(playerStore)


const localSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(localSearch, (query) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', query.trim()), 300)
})
const pinningAlbumId = ref<number | null>(null)
const albumOriginalIndexes = new Map<number, number>()
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

const sortOrder = ref('default')
const albumNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const filteredAlbums = computed(() => {
  const items = [...albums.value]
  if (sortOrder.value === 'default') return items
  const createdAt = (album: Album) => {
    const timestamp = Date.parse(album.created_at)
    return Number.isFinite(timestamp) ? timestamp : 0
  }
  return items.sort((a, b) => {
    if (sortOrder.value === 'name-asc') return albumNameCollator.compare(a.title, b.title) || a.id - b.id
    if (sortOrder.value === 'name-desc') return albumNameCollator.compare(b.title, a.title) || b.id - a.id
    const difference = createdAt(a) - createdAt(b) || a.id - b.id
    return sortOrder.value === 'oldest' ? difference : -difference
  })
})

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

const toggleAlbumPinFromMenu = () => {
  const item = albumContextMenu.value?.item
  if (!item || pinningAlbumId.value !== null) return
  const type = (String(item.type || 'album').toLowerCase()) as PinnableType
  const wasPinned = Boolean(item.pin_at)
  const currentIndex = albums.value.findIndex((album) => album.id === item.id)
  const previousIndex = wasPinned
    ? (albumOriginalIndexes.get(Number(item.id)) ?? currentIndex)
    : currentIndex
  item.pin_at = wasPinned ? null : new Date().toISOString()
  if (!wasPinned) {
    albumOriginalIndexes.set(Number(item.id), previousIndex)
    albums.value = [item, ...albums.value.filter((album) => album.id !== item.id)]
  } else if (currentIndex >= 0 && previousIndex >= 0 && currentIndex !== previousIndex) {
    const restored = [...albums.value]
    const [movedItem] = restored.splice(currentIndex, 1)
    restored.splice(Math.min(previousIndex, restored.length), 0, movedItem)
    albums.value = restored
    albumOriginalIndexes.delete(Number(item.id))
  }
  albumContextMenu.value = null
  pinningAlbumId.value = Number(item.id)

  void (async () => {
    try {
      if (wasPinned) await pinApi.unpin(type, Number(item.id))
      else await pinApi.pin(type, Number(item.id))
    } catch {
      item.pin_at = wasPinned ? new Date().toISOString() : null
      const rollbackIndex = albums.value.findIndex((album) => album.id === item.id)
      if (rollbackIndex >= 0 && previousIndex >= 0 && rollbackIndex !== previousIndex) {
        const restored = [...albums.value]
        const [movedItem] = restored.splice(rollbackIndex, 1)
        restored.splice(previousIndex, 0, movedItem)
        albums.value = restored
      }
      if (wasPinned) albumOriginalIndexes.set(Number(item.id), previousIndex)
      else albumOriginalIndexes.delete(Number(item.id))
    } finally {
      pinningAlbumId.value = null
    }
  })()
}

const handleOutsideClick = (event: MouseEvent) => {
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

          <div class="all-albums-page__sort">
            <label for="album-sort" class="all-albums-page__search-label">{{ loadedCount ? 'Sort loaded albums' : 'Sort albums' }}</label>
            <select id="album-sort" v-model="sortOrder" class="all-albums-page__sort-select">
              <option value="default">Default order</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name-asc">Name: A–Z</option>
              <option value="name-desc">Name: Z–A</option>
            </select>
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
          @click="toggleAlbumPinFromMenu"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" />
          </svg>
          <span>{{ albumContextMenu.item.pin_at ? 'Unpin from Top' : 'Pin to Top' }}</span>
        </button>
      </div>
    </Teleport>

    <!-- Scroll to top button -->
    <Transition name="fade">
      <button
        v-if="showScrollTop"
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
  grid-template-columns: minmax(0, 1fr) minmax(11rem, 14rem) 2.75rem;
  align-items: end;
  gap: 0.75rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 0.75rem);
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
}

.all-albums-page__sort {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}

.all-albums-page__sort-select {
  width: 100%;
  height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 0.5rem);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.all-albums-page__sort-select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.all-albums-page__search {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.all-albums-page__search-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted, #a1a1aa);
}

.all-albums-page__search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  box-sizing: border-box;
  height: 2.75rem;
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
  width: 2.75rem;
  height: 2.75rem;
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
    grid-template-columns: minmax(0, 1fr) 2.75rem;
    margin-left: 0;
    gap: 0.875rem 0.5rem;
    padding: 0.75rem;
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
</style>
