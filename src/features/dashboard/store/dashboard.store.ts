import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, Category, Playlist, ExploreCategoryInfo } from '../types/album.types'
import { useAuthStore } from '@/features/auth'

export interface ExplorePageCacheItem {
  albums: Album[]
  categoryInfo: ExploreCategoryInfo | null
  cursor: number | null
  hasMore: boolean
}

export const useDashboardStore = defineStore('dashboard', () => {
  const albums = ref<Album[]>([])
  const categories = ref<Category[]>([])
  const playlists = ref<Playlist[]>([])
  const isLoading = ref(false)
  const isFetched = ref(false)
  const error = ref<string | null>(null)
  const fetchedSearch = ref('')
  const searchQuery = ref('')

  // In-memory cache for explore categories (e.g. 10 albums per category carousel on Dashboard)
  const exploreCategories = ref<Record<number, Album[]>>({})

  // In-memory cache for explore category dedicated pages (/explore/:id)
  const explorePageCache = ref<Record<number, ExplorePageCacheItem>>({})

  const authStore = useAuthStore()

  // Invalidate cache and reset data when auth state changes (login/logout)
  watch(() => authStore.isAuthenticated, () => {
    isFetched.value = false
    fetchedSearch.value = ''
    searchQuery.value = ''
    albums.value = []
    categories.value = []
    playlists.value = []
    exploreCategories.value = {}
    explorePageCache.value = {}
  })

  const setExploreCategoryAlbums = (categoryId: number, items: Album[]) => {
    exploreCategories.value[categoryId] = items
  }

  const setExplorePageCache = (categoryId: number, data: ExplorePageCacheItem) => {
    explorePageCache.value[categoryId] = data
  }

  let dashboardAbortController: AbortController | null = null

  const fetchDashboardData = async (search = '', force = false) => {
    const trimmedSearch = search.trim()
    if (isFetched.value && fetchedSearch.value === trimmedSearch && !force) return

    if (dashboardAbortController) {
      dashboardAbortController.abort()
    }
    const currentController = new AbortController()
    dashboardAbortController = currentController

    try {
      isLoading.value = true
      error.value = null
      const response = await dashboardApi.getMusicDashboard(trimmedSearch, currentController.signal)
      if (dashboardAbortController !== currentController) return

      albums.value = response.data.data.album || []
      if (!trimmedSearch) {
        categories.value = response.data.data.category || []
        playlists.value = response.data.data.playlist || []
      }
      fetchedSearch.value = trimmedSearch
      isFetched.value = true
    } catch (err: unknown) {
      const errorObj = err as { name?: string; code?: string; message?: string }
      if (errorObj?.name === 'CanceledError' || errorObj?.code === 'ERR_CANCELED') {
        return
      }
      if (dashboardAbortController === currentController) {
        error.value = errorObj?.message || 'Gagal memuat data'
      }
    } finally {
      if (dashboardAbortController === currentController) {
        isLoading.value = false
      }
    }
  }

  return {
    albums,
    categories,
    playlists,
    isLoading,
    isFetched,
    fetchedSearch,
    error,
    searchQuery,
    exploreCategories,
    explorePageCache,
    setExploreCategoryAlbums,
    setExplorePageCache,
    fetchDashboardData
  }
})
