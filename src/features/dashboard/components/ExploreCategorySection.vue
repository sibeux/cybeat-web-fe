<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { dashboardApi } from '../api/dashboard.api'
import { useDashboardStore } from '../store/dashboard.store'
import type { Album } from '../types/album.types'

const props = withDefaults(
  defineProps<{
    categoryId: number
    categoryName: string
    badgeLabel?: string
    isPlayingAlbum?: (item: Album) => boolean
  }>(),
  {
    badgeLabel: '',
    isPlayingAlbum: () => false,
  },
)

const emit = defineEmits<{
  (e: 'albumClick', item: Album): void
  (e: 'albumContextMenu', payload: { event: MouseEvent; item: Album }): void
}>()

const dashboardStore = useDashboardStore()
const cachedAlbums = dashboardStore.exploreCategories[props.categoryId]

const albums = ref<Album[]>(cachedAlbums ? [...cachedAlbums] : [])
const isLoading = ref(false)
const isInitialLoaded = ref(Boolean(cachedAlbums && cachedAlbums.length > 0))
const error = ref<string | null>(null)
const sectionRef = ref<HTMLElement | null>(null)
const scrollRowRef = ref<HTMLElement | null>(null)
const canScrollPrevious = ref(false)
const canScrollNext = ref(false)

let observer: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null

const DEFAULT_COVER = '/assets/images/placeholder_cover_music.png'

const resolveCoverUrl = (cover: unknown) => {
  if (typeof cover !== 'string' || !cover) return DEFAULT_COVER
  if (cover.startsWith('http') || cover.startsWith('data:')) return cover

  if (cover.includes('cover_url=cdncloudflare/')) {
    const match = cover.match(/cover_url=cdncloudflare\/(.*)/)
    if (match && match[1]) return `https://cdn.sibeux.my.id/${match[1]}`
  }

  return `https://${cover}`
}

const handleCoverError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img.dataset.fallbackApplied) return
  img.dataset.fallbackApplied = 'true'
  img.src = DEFAULT_COVER
}

const updateScrollState = () => {
  const row = scrollRowRef.value
  canScrollPrevious.value = !!row && row.scrollLeft > 1
  canScrollNext.value = !!row && row.scrollWidth - row.clientWidth - row.scrollLeft > 1
}

const scrollRow = (direction: number) => {
  const row = scrollRowRef.value
  if (!row) return
  row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: 'smooth' })
}

watch([scrollRowRef, () => albums.value.length], () => {
  resizeObserver?.disconnect()
  updateScrollState()
  const row = scrollRowRef.value
  if (!row || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(updateScrollState)
  resizeObserver.observe(row)
  if (row.firstElementChild) resizeObserver.observe(row.firstElementChild)
}, { flush: 'post' })

const loadAlbums = async (isInitial = false) => {
  if (isInitial && isInitialLoaded.value && albums.value.length > 0) return
  if (isLoading.value) return
  isLoading.value = true
  error.value = null

  try {
    // Muat 10 album untuk carousel horizontal
    const response = await dashboardApi.getExploreAlbums(props.categoryId, 10, null)
    const result = response.data.data
    const loaded = result.albums || []

    albums.value = loaded
    dashboardStore.setExploreCategoryAlbums(props.categoryId, loaded)
    isInitialLoaded.value = true
  } catch (err: any) {
    if (isInitial) {
      error.value = err?.response?.data?.message || err?.message || 'Gagal memuat album'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', updateScrollState)

  // Jika sudah ada album dari cache, tidak perlu fetch ulang lagi
  if (isInitialLoaded.value && albums.value.length > 0) {
    return
  }

  if (!('IntersectionObserver' in window)) {
    loadAlbums(true)
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isInitialLoaded.value) {
          loadAlbums(true)
          if (sectionRef.value && observer) {
            observer.unobserve(sectionRef.value)
          }
        }
      })
    },
    {
      root: null,
      rootMargin: '180px 0px',
      threshold: 0.05,
    },
  )

  if (sectionRef.value) {
    observer.observe(sectionRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollState)
  resizeObserver?.disconnect()
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<template>
  <div ref="sectionRef" class="explore-section">
    <div class="explore-section__header">
      <div class="explore-section__title-group">
        <h2 class="explore-section__title">
          Explore {{ categoryName }} New Albums
        </h2>
        <span v-if="badgeLabel" class="explore-section__badge">{{ badgeLabel }}</span>
      </div>

      <!-- Show More in new tab -->
      <div class="explore-section__actions">
        <router-link
          :to="`/explore/${categoryId}`"
          target="_blank"
          class="explore-section__show-more-link"
          title="Open in new tab"
        >
          <span>Show More</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </router-link>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !isInitialLoaded" class="explore-section__error">
      <span>{{ error }}</span>
      <button type="button" class="explore-section__retry-btn" @click="loadAlbums(true)">
        Try Again
      </button>
    </div>

    <!-- Skeletons while Initial Loading -->
    <div v-else-if="!isInitialLoaded && isLoading" class="explore-section__scroll-row">
      <div v-for="i in 6" :key="`skel-${i}`" class="explore-skeleton-card explore-section__scroll-item">
        <div class="explore-skeleton-cover"></div>
        <div class="dashboard__album-info">
          <h3 class="dashboard__album-title explore-skeleton-title">&nbsp;</h3>
          <p class="dashboard__album-artist explore-skeleton-subtitle">&nbsp;</p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="isInitialLoaded && albums.length === 0" class="explore-section__empty">
      There are no albums in this category yet.
    </div>

    <!-- Right Scrollable Row -->
    <div
      v-else
      class="explore-section__scroll-container"
      :class="{
        'explore-section__scroll-container--fade-left': canScrollPrevious,
        'explore-section__scroll-container--fade-right': canScrollNext,
      }"
    >
      <button
        v-show="canScrollPrevious"
        type="button"
        class="explore-section__nav-btn explore-section__nav-btn--previous"
        :disabled="!canScrollPrevious"
        :aria-label="`Previous ${categoryName} albums`"
        title="Previous albums"
        @click="scrollRow(-1)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        v-show="canScrollNext"
        type="button"
        class="explore-section__nav-btn explore-section__nav-btn--next"
        :disabled="!canScrollNext"
        :aria-label="`Next ${categoryName} albums`"
        title="Next albums"
        @click="scrollRow(1)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div ref="scrollRowRef" class="explore-section__scroll-row" @scroll.passive="updateScrollState">
        <div
          v-for="item in albums"
          :key="item.id"
          class="dashboard__album-card explore-section__scroll-item"
          :class="{ 'dashboard__album-card--playing': isPlayingAlbum(item) }"
          @click="emit('albumClick', item)"
          @contextmenu.prevent.stop="emit('albumContextMenu', { event: $event, item })"
        >
          <div
            class="dashboard__album-cover"
            :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }"
          >
            <img
              v-img-cache="resolveCoverUrl(item.cover)"
              :alt="item.title"
              loading="lazy"
              @error="handleCoverError"
            />

            <!-- Disc badge -->
            <span v-if="item.have_disc" class="explore-section__disc-badge" title="Have Disc">
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Disc
            </span>

            <div
              v-if="isPlayingAlbum(item)"
              class="dashboard__album-playing-indicator"
              aria-label="Playing now"
            >
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>

          <div class="dashboard__album-info">
            <div class="dashboard__album-title-row">
              <svg
                v-if="item.pin_at"
                class="dashboard__album-pin-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
                title="Pinned"
                aria-label="Pinned"
              >
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" />
              </svg>
              <h3
                class="dashboard__album-title"
                :class="{ 'dashboard__album-title--playing': isPlayingAlbum(item) }"
                :title="item.title"
              >
                {{ item.title }}
              </h3>
            </div>
            <p
              class="dashboard__album-artist"
              :class="{ 'dashboard__album-artist--playing': isPlayingAlbum(item) }"
              :title="item.author"
            >
              {{ item.author }}
            </p>
          </div>
        </div>

        <!-- See All card at the end of scrollable row -->
        <router-link
          :to="`/explore/${categoryId}`"
          target="_blank"
          class="explore-section__see-all-card"
          title="See all in new tab"
        >
          <div class="explore-section__see-all-circle">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <span class="explore-section__see-all-text">See All</span>
          <span class="explore-section__see-all-sub">{{ categoryName }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explore-section {
  --explore-cover-size: 170px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.explore-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.explore-section__title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.explore-section__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text, #ffffff);
  margin: 0;
  letter-spacing: -0.01em;
}

.explore-section__badge {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm, 6px);
  background: var(--color-primary-subtle, rgba(99, 102, 241, 0.15));
  color: var(--color-primary, #6366f1);
}

.explore-section__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.explore-section__nav-btn {
  position: absolute;
  top: calc(0.25rem + 0.625rem + var(--explore-cover-size) / 2);
  transform: translateY(-50%);
  z-index: 3;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
  background: #282828;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.explore-section__nav-btn--previous {
  left: 0.25rem;
}

.explore-section__nav-btn--next {
  right: 0.25rem;
}

.explore-section__scroll-container:hover .explore-section__nav-btn,
.explore-section__scroll-container:focus-within .explore-section__nav-btn {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.explore-section__nav-btn:hover {
  background: #383838;
  transform: translateY(-50%) scale(1.06);
  border-color: rgba(255, 255, 255, 0.25);
}

.explore-section__nav-btn:focus-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  outline: 2px solid var(--color-primary, #6366f1);
  outline-offset: 3px;
}

@media (hover: none) {
  .explore-section__nav-btn {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}

.explore-section__show-more-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary, #6366f1);
  text-decoration: none;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: var(--color-primary-subtle, rgba(99, 102, 241, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease;
}

.explore-section__show-more-link:hover {
  background: var(--color-primary, #6366f1);
  color: #ffffff;
  transform: translateY(-1px);
}

/* Scroll Container */
.explore-section__scroll-container {
  width: 100%;
  min-width: 0;
  position: relative;
}

.explore-section__scroll-container::before,
.explore-section__scroll-container::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0.85rem;
  width: clamp(2.5rem, 6vw, 4.5rem);
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.explore-section__scroll-container::before {
  left: 0;
  background: linear-gradient(to right, var(--color-bg, #121212), transparent);
}

.explore-section__scroll-container::after {
  right: 0;
  background: linear-gradient(to left, var(--color-bg, #121212), transparent);
}

.explore-section__scroll-container--fade-left::before,
.explore-section__scroll-container--fade-right::after {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .explore-section__scroll-container::before,
  .explore-section__scroll-container::after {
    transition: none;
  }
}

.explore-section__scroll-row {
  display: flex;
  gap: 0.375rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  padding: 0.25rem 0.25rem 0.85rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
  -webkit-overflow-scrolling: touch;
}

.explore-section__scroll-row::-webkit-scrollbar {
  height: 6px;
}

.explore-section__scroll-row::-webkit-scrollbar-track {
  background: transparent;
}

.explore-section__scroll-row::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 9999px;
}

.explore-section__scroll-row::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.35);
}

.explore-section__scroll-item {
  flex: 0 0 var(--explore-cover-size);
  width: var(--explore-cover-size);
  min-width: var(--explore-cover-size);
}

@media (max-width: 768px) {
  .explore-section {
    --explore-cover-size: 140px;
  }
}

/* See All Card at end of carousel */
.explore-section__see-all-card {
  flex: 0 0 170px;
  width: 170px;
  min-width: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface-raised, rgba(255, 255, 255, 0.04));
  border: 1px dashed var(--color-border, rgba(255, 255, 255, 0.15));
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  aspect-ratio: 1;
  align-self: flex-start;
}

@media (max-width: 768px) {
  .explore-section__see-all-card {
    flex: 0 0 140px;
    width: 140px;
    min-width: 140px;
  }
}

.explore-section__see-all-card:hover {
  background: var(--color-surface-hover, rgba(255, 255, 255, 0.08));
  border-color: var(--color-primary, #6366f1);
  border-style: solid;
}

.explore-section__see-all-circle {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--color-primary-subtle, rgba(99, 102, 241, 0.15));
  color: var(--color-primary, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.6rem;
  transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease;
}

.explore-section__see-all-card:hover .explore-section__see-all-circle {
  background: var(--color-primary, #6366f1);
  color: #ffffff;
}

.explore-section__see-all-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text, #ffffff);
  text-align: center;
}

.explore-section__see-all-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted, #a1a1aa);
  text-align: center;
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Card & Cover Styling */
.dashboard__album-card,
.explore-skeleton-card {
  position: relative;
  isolation: isolate;
  box-sizing: content-box;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  min-width: 0;
}

.dashboard__album-card::before {
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

.dashboard__album-card:hover {
  background: transparent;
  transform: none;
}

.dashboard__album-card:hover::before {
  opacity: 1;
  transition-duration: 0.06s;
}

.dashboard__album-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: var(--color-surface-raised, #18181b);
}

.dashboard__album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.dashboard__album-card:hover .dashboard__album-cover img {
  transform: none;
}

.dashboard__album-card--playing .dashboard__album-cover {
  box-shadow: 0 0 0 2px var(--color-primary, #6366f1), 0 8px 20px rgba(99, 102, 241, 0.25);
}

.explore-section__disc-badge {
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

.dashboard__album-playing-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.48);
  color: #fff;
}

.dashboard__album-playing-indicator svg {
  width: 2.5rem;
  height: 2.5rem;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}

.dashboard__album-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.dashboard__album-title-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.dashboard__album-pin-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: var(--color-primary, #6366f1);
}

.dashboard__album-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text, #ffffff);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dashboard__album-title--playing {
  color: var(--color-primary, #6366f1);
}

.dashboard__album-artist {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #a1a1aa);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dashboard__album-artist--playing {
  color: var(--color-primary, #6366f1);
}

.explore-section__error {
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md, 8px);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
}

.explore-section__retry-btn {
  padding: 0.35rem 0.75rem;
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.explore-section__empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-muted, #71717a);
  font-size: 0.875rem;
  border: 1px dashed var(--color-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 8px);
}

/* Skeletons */
.explore-skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: default;
}

.explore-skeleton-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md, 8px);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: exploreShimmer 1.5s infinite;
}

.explore-skeleton-title {
  border-radius: 4px;
  width: 80%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: exploreShimmer 1.5s infinite;
}

.explore-skeleton-subtitle {
  border-radius: 4px;
  width: 50%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: exploreShimmer 1.5s infinite;
}

@keyframes exploreShimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
