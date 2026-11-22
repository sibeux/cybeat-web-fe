<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AlbumCatalogPage from '../components/AlbumCatalogPage.vue'
import { useDashboardStore } from '../store/dashboard.store'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, ExploreCategoryInfo } from '../types/album.types'
import { useTitle } from '@/core/shared/composables/useTitle'
import axios from 'axios'

const props = defineProps<{ embedded?: boolean; categoryId?: number }>()
const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()

const categoryId = computed(() => props.categoryId || Number(route.params.id) || 1)

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

const initialSearch = typeof route.query.search === 'string' ? route.query.search : ''
const sort = ref<{ mode: 'default' | 'alphabetical' | 'created'; direction: 'asc' | 'desc' }>({
  mode: route.query.sort === 'alphabetical' || route.query.sort === 'created' ? route.query.sort : 'default',
  direction: route.query.order === 'asc' ? 'asc' : 'desc',
})
const sortCacheKey = () => sort.value.mode + ':' + sort.value.direction
const cached = dashboardStore.getExplorePageCache(categoryId.value, initialSearch, sortCacheKey())

const albums = ref<Album[]>(cached ? [...cached.albums] : [])
const categoryInfo = ref<ExploreCategoryInfo | null>(cached ? cached.categoryInfo : null)
const cursor = ref<number | null>(cached ? cached.cursor : null)
const hasMore = ref(cached ? cached.hasMore : true)
const isLoading = ref(!cached)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)

let sentinelObserver: IntersectionObserver | null = null

const search = ref(initialSearch)
let requestController: AbortController | null = null

const syncToCache = () => {
  dashboardStore.setExplorePageCache(categoryId.value, {
    albums: albums.value, categoryInfo: categoryInfo.value,
    cursor: cursor.value, hasMore: hasMore.value,
  }, search.value, sortCacheKey())
}

const requestAlbums = async (append = false) => {
  if (append && (isLoading.value || isLoadingMore.value || !hasMore.value || !cursor.value)) return
  requestController?.abort()
  const controller = new AbortController()
  requestController = controller
  if (append) isLoadingMore.value = true
  else {
    isLoading.value = true
    isLoadingMore.value = false
    error.value = null
    albums.value = []
    cursor.value = null
    hasMore.value = true
  }
  try {
    const response = await dashboardApi.getExploreAlbums(categoryId.value, 30, append ? cursor.value : null, controller.signal, search.value, sort.value)
    if (requestController !== controller || controller.signal.aborted) return
    const result = response.data.data
    categoryInfo.value = result.category
    albums.value = append ? [...albums.value, ...(result.albums || [])] : result.albums || []
    cursor.value = result.next_cursor
    hasMore.value = Boolean(result.has_more)
    syncToCache()
  } catch (err: unknown) {
    if (requestController !== controller || controller.signal.aborted) return
    error.value = axios.isAxiosError(err) ? err.response?.data?.message || err.message : 'Gagal memuat album kategori'
  } finally {
    if (requestController === controller) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

const fetchInitialAlbums = async (force = false) => {
  if (!force && cached) return
  await requestAlbums()
}
const loadMoreAlbums = () => requestAlbums(true)
const searchAlbums = (query: string) => {
  search.value = query
  void router.replace({ query: { ...route.query, search: query || undefined } })
  const saved = dashboardStore.getExplorePageCache(categoryId.value, query, sortCacheKey())
  if (saved) {
    requestController?.abort()
    requestController = null
    albums.value = [...saved.albums]
    categoryInfo.value = saved.categoryInfo
    cursor.value = saved.cursor
    hasMore.value = saved.hasMore
    isLoading.value = false
    isLoadingMore.value = false
    error.value = null
    return
  }
  void requestAlbums()
}

const changeSort = (value: typeof sort.value) => {
  sort.value = value
  void router.replace({ query: { ...route.query, sort: value.mode, order: value.direction } })
  void requestAlbums()
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
  if (!cached) {
    await fetchInitialAlbums()
  }
  setupSentinelObserver()
})

onUnmounted(() => {
  requestController?.abort()
  if (sentinelObserver) {
    sentinelObserver.disconnect()
    sentinelObserver = null
  }
})
</script>

<template>
  <AlbumCatalogPage
    v-model:albums="albums"
    :embedded="embedded"
    :initial-search="initialSearch"
    server-sort
    :initial-sort-mode="sort.mode"
    :initial-sort-direction="sort.direction"
    @sort="changeSort"
    :title="`Explore ${categoryMeta.name} New Albums`"
    :badge="categoryMeta.badge"
    subtitle="Newly added albums ordered from latest additions"
    :is-loading="isLoading"
    :error="error"
    loaded-count
    @refresh="fetchInitialAlbums(true)"
    @search="searchAlbums"
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
