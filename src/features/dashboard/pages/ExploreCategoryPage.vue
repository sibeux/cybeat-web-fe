<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppLayout from '@/core/app/layouts/AppLayout.vue'
import { usePlayerStore } from '@/features/album/store/player.store'
import { useDashboardStore } from '../store/dashboard.store'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, ExploreCategoryInfo } from '../types/album.types'
import { useTitle } from '@/core/shared/composables/useTitle'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const dashboardStore = useDashboardStore()
const { currentAlbum } = storeToRefs(playerStore)

const categoryId = computed(() => Number(route.params.id) || 1)

const CATEGORY_NAMES: Record<number, { name: string; badge: string }> = {
  1: { name: 'IndoPride', badge: 'Indonesian' },
  2: { name: '日本の歌', badge: 'Japanese' },
  3: { name: 'Jowo Mletre', badge: 'Javanese' },
  4: { name: 'Worldwide', badge: 'Worldwide' },
  5: { name: 'Instrumental', badge: 'Instrumental' },
}

const categoryMeta = computed(() => {
  return CATEGORY_NAMES[categoryId.value] || { name: `Category #${categoryId.value}`, badge: 'Music' }
})

useTitle(() => `${categoryMeta.value.name} - Explore New Albums • Cybeat`)

const cached = dashboardStore.explorePageCache[categoryId.value]

const albums = ref<Album[]>(cached ? [...cached.albums] : [])
const categoryInfo = ref<ExploreCategoryInfo | null>(cached ? cached.categoryInfo : null)
const cursor = ref<number | null>(cached ? cached.cursor : null)
const hasMore = ref(cached ? cached.hasMore : true)
const isLoading = ref(!cached)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)

let sentinelObserver: IntersectionObserver | null = null

const syncToCache = () => {
  dashboardStore.setExplorePageCache(categoryId.value, {
    albums: albums.value,
    categoryInfo: categoryInfo.value,
    cursor: cursor.value,
    hasMore: hasMore.value,
  })
}

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

const fetchInitialAlbums = async () => {
  if (cached && albums.value.length > 0) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  error.value = null

  try {
    // 30 album pertama sesuai permintaan user
    const response = await dashboardApi.getExploreAlbums(categoryId.value, 30, null)
    const result = response.data.data

    categoryInfo.value = result.category
    albums.value = result.albums || []
    cursor.value = result.next_cursor
    hasMore.value = Boolean(result.has_more)
    syncToCache()
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Gagal memuat album kategori'
    } else {
      error.value =
        err instanceof Error
          ? err.message
          : 'Gagal memuat album kategori'
    }
  } finally {
    isLoading.value = false
  }
}

const loadMoreAlbums = async () => {
  if (isLoadingMore.value || !hasMore.value || !cursor.value) return
  isLoadingMore.value = true

  try {
    const response = await dashboardApi.getExploreAlbums(categoryId.value, 30, cursor.value)
    const result = response.data.data

    albums.value.push(...(result.albums || []))
    cursor.value = result.next_cursor
    hasMore.value = Boolean(result.has_more)
    syncToCache()
  } catch (err: unknown) {
    console.error('[ExploreCategoryPage] Failed to load more albums:', err)
  } finally {
    isLoadingMore.value = false
  }
}

const setupSentinelObserver = () => {
  if (!('IntersectionObserver' in window)) return

  sentinelObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore.value && !isLoading.value && !isLoadingMore.value) {
          loadMoreAlbums()
        }
      })
    },
    {
      root: null,
      rootMargin: '300px 0px',
      threshold: 0.1,
    },
  )

  if (sentinelRef.value) {
    sentinelObserver.observe(sentinelRef.value)
  }
}

onMounted(async () => {
  if (!cached || albums.value.length === 0) {
    await fetchInitialAlbums()
  }
  setupSentinelObserver()
})

onUnmounted(() => {
  if (sentinelObserver) {
    sentinelObserver.disconnect()
    sentinelObserver = null
  }
})
</script>

<template>
  <AppLayout>
    <div class="explore-page">
      <!-- Header -->
      <header class="explore-page__header">
        <div class="explore-page__title-area">
          <button class="explore-page__back-btn" type="button" title="Back to dashboard" aria-label="Back to dashboard"
            @click="goToDashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div class="explore-page__badge-row">
              <span class="explore-page__badge">{{ categoryMeta.badge }}</span>
              <span v-if="albums.length" class="explore-page__count">{{ albums.length }} albums loaded</span>
            </div>
            <h1 class="explore-page__title">Explore {{ categoryMeta.name }} New Albums</h1>
            <p class="explore-page__subtitle">Newly added albums ordered from latest additions</p>
          </div>
        </div>
      </header>

      <!-- Loading State Initial -->
      <div v-if="isLoading" class="explore-page__loading">
        <div class="dashboard__album-grid">
          <div v-for="i in 12" :key="`skel-init-${i}`" class="explore-skeleton-card">
            <div class="explore-skeleton-cover"></div>
            <div class="explore-skeleton-title"></div>
            <div class="explore-skeleton-subtitle"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="explore-page__error">
        <p>{{ error }}</p>
        <button type="button" class="explore-page__retry-btn" @click="fetchInitialAlbums">Try Again</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="albums.length === 0" class="explore-page__empty">
        <p>No albums found for this category yet.</p>
        <button type="button" class="explore-page__retry-btn" @click="goToDashboard">Go to Dashboard</button>
      </div>

      <!-- Main Album Grid -->
      <div v-else class="explore-page__content">
        <div class="dashboard__album-grid">
          <div v-for="item in albums" :key="item.id" class="dashboard__album-card"
            :class="{ 'dashboard__album-card--playing': isPlayingAlbum(item) }" @click="goToAlbum(item)">
            <div class="dashboard__album-cover"
              :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }">
              <img v-img-cache="resolveCoverUrl(item.cover)" :alt="item.title" loading="lazy"
                @error="handleCoverError" />

              <!-- Disc badge -->
              <span v-if="item.have_disc" class="explore-page__disc-badge" title="Have Disc">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Disc
              </span>

              <div v-if="isPlayingAlbum(item)" class="dashboard__album-playing-indicator" aria-label="Playing now">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            <div class="dashboard__album-info">
              <div class="dashboard__album-title-row">
                <svg v-if="item.pin_at" class="dashboard__album-pin-icon" viewBox="0 0 24 24" fill="currentColor"
                  title="Pinned" aria-label="Pinned">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" />
                </svg>
                <h3 class="dashboard__album-title" :class="{ 'dashboard__album-title--playing': isPlayingAlbum(item) }"
                  :title="item.title">
                  {{ item.title }}
                </h3>
              </div>
              <p class="dashboard__album-artist" :class="{ 'dashboard__album-artist--playing': isPlayingAlbum(item) }"
                :title="item.author">
                {{ item.author }}
              </p>
            </div>
          </div>
        </div>

        <!-- Infinite Scroll Sentinel -->
        <div ref="sentinelRef" class="explore-page__sentinel">
          <div v-if="isLoadingMore" class="explore-page__spinner-wrap">
            <span class="explore-page__spinner"></span>
            <span>Loading more albums...</span>
          </div>
          <div v-else-if="!hasMore && albums.length > 0" class="explore-page__end-text">
            <span>You have reached the end of the albums</span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.explore-page {
  padding: 2rem 2.5rem 4rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .explore-page {
    padding: 1.25rem 1rem 3rem;
  }
}

.explore-page__header {
  margin-bottom: 2.25rem;
  border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  padding-bottom: 1.5rem;
}

.explore-page__title-area {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.explore-page__back-btn {
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

.explore-page__back-btn:hover {
  background: var(--color-primary, #6366f1);
  border-color: var(--color-primary, #6366f1);
  transform: translateX(-2px);
}

.explore-page__badge-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.explore-page__badge {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-sm, 6px);
  background: var(--color-primary-subtle, rgba(99, 102, 241, 0.15));
  color: var(--color-primary, #6366f1);
}

.explore-page__count {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #a1a1aa);
}

.explore-page__title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text, #ffffff);
  margin: 0 0 0.35rem 0;
  letter-spacing: -0.02em;
}

.explore-page__subtitle {
  font-size: 0.9375rem;
  color: var(--color-text-muted, #a1a1aa);
  margin: 0;
}

.explore-page__disc-badge {
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

/* Sentinel & Infinite scroll */
.explore-page__sentinel {
  padding: 3rem 0 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.explore-page__spinner-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-text-muted, #a1a1aa);
  font-size: 0.875rem;
  font-weight: 500;
}

.explore-page__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--color-primary, #6366f1);
  border-radius: 50%;
  animation: explorePageSpin 0.7s linear infinite;
}

@keyframes explorePageSpin {
  to {
    transform: rotate(360deg);
  }
}

.explore-page__end-text {
  font-size: 0.875rem;
  color: var(--color-text-muted, #71717a);
  padding: 1rem 1.5rem;
  background: var(--color-surface-raised, rgba(255, 255, 255, 0.03));
  border-radius: 9999px;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.06));
}

.explore-page__error,
.explore-page__empty {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-muted, #a1a1aa);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.explore-page__retry-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-primary, #6366f1);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm, 6px);
  font-weight: 600;
  cursor: pointer;
}

/* Album Grid & Cards (Self-contained) */
.dashboard__album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .dashboard__album-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
}

.dashboard__album-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.2s ease;
  min-width: 0;
}

.dashboard__album-card:hover {
  transform: translateY(-4px);
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
  transition: transform 0.3s ease;
}

.dashboard__album-card:hover .dashboard__album-cover img {
  transform: scale(1.05);
}

.dashboard__album-card--playing .dashboard__album-cover {
  box-shadow: 0 0 0 2px var(--color-primary, #6366f1), 0 8px 20px rgba(99, 102, 241, 0.25);
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
  font-size: 1rem;
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
  font-size: 0.875rem;
  color: var(--color-text-muted, #a1a1aa);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dashboard__album-artist--playing {
  color: var(--color-primary, #6366f1);
}

/* Skeletons */
.explore-skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.explore-skeleton-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md, 8px);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: explorePageShimmer 1.5s infinite;
}

.explore-skeleton-title {
  height: 16px;
  border-radius: 4px;
  width: 80%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: explorePageShimmer 1.5s infinite;
}

.explore-skeleton-subtitle {
  height: 13px;
  border-radius: 4px;
  width: 50%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: explorePageShimmer 1.5s infinite;
}

@keyframes explorePageShimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
