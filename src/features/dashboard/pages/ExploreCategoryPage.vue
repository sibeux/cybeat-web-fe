<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import AlbumCatalogPage from '../components/AlbumCatalogPage.vue'
import { useDashboardStore } from '../store/dashboard.store'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, ExploreCategoryInfo } from '../types/album.types'
import { useTitle } from '@/core/shared/composables/useTitle'
import axios from 'axios'

const route = useRoute()
const dashboardStore = useDashboardStore()

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

const fetchInitialAlbums = async (force = false) => {
  if (!force && cached && albums.value.length > 0) {
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
  <AlbumCatalogPage
    v-model:albums="albums"
    :title="`Explore ${categoryMeta.name} New Albums`"
    :badge="categoryMeta.badge"
    subtitle="Newly added albums ordered from latest additions"
    :is-loading="isLoading"
    :error="error"
    loaded-count
    @refresh="fetchInitialAlbums(true)"
  >
    <div ref="sentinelRef" class="explore-page__sentinel">
      <div v-if="isLoadingMore" class="explore-page__spinner-wrap" role="status">
        <span class="explore-page__spinner"></span>
        <span>Loading more albums...</span>
      </div>
      <div v-else-if="!isLoading && !hasMore && albums.length" class="explore-page__end-text">
        You have reached the end of the albums
      </div>
    </div>
  </AlbumCatalogPage>
</template>

<style scoped>
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

</style>
