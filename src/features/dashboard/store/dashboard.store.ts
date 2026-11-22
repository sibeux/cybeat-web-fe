import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, Category, Playlist, ExploreCategoryInfo } from '../types/album.types'
import { libraryApi } from '../api/library.api'
import { useAuthStore } from '@/features/auth'

export interface ExplorePageCacheItem {
  albums: Album[]
  categoryInfo: ExploreCategoryInfo | null
  cursor: number | null
  hasMore: boolean
}

export const useDashboardStore = defineStore('dashboard', () => {
  const albums = ref<Album[]>([])
  const libraryAlbums = ref<Album[]>([])
  const libraryBusyId = ref<number | null>(null)
  const libraryError = ref<string | null>(null)
  const isSidebarLoading = ref(false)
  const sidebarError = ref<string | null>(null)
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
  const explorePageCache = ref<Record<string, ExplorePageCacheItem>>({})

  const authStore = useAuthStore()
  let sidebarController: AbortController | null = null

  // Invalidate cache and reset data when auth state changes (login/logout)
  watch(() => authStore.isAuthenticated, () => {
    sidebarController?.abort()
    sidebarController = null
    dashboardAbortController?.abort()
    dashboardAbortController = null
    isSidebarLoading.value = false
    isLoading.value = false
    sidebarError.value = null
    error.value = null
    isFetched.value = false
    fetchedSearch.value = ''
    searchQuery.value = ''
    albums.value = []
    libraryAlbums.value = []
    libraryError.value = null
    categories.value = []
    playlists.value = []
    exploreCategories.value = {}
    explorePageCache.value = {}
  }, { flush: 'sync' })

  const setExploreCategoryAlbums = (categoryId: number, items: Album[]) => {
    exploreCategories.value[categoryId] = items
  }

  const exploreCacheKey = (categoryId: number, search = '', sort = '') =>
    sort || search.trim() ? JSON.stringify([categoryId, search.trim(), sort]) : String(categoryId)

  const getExplorePageCache = (categoryId: number, search = '', sort = '') =>
    explorePageCache.value[exploreCacheKey(categoryId, search, sort)]

  const clearExplorePageCache = (categoryId: number) => {
    for (const key of Object.keys(explorePageCache.value)) {
      if (key === String(categoryId) || key.startsWith(`[${categoryId},`)) {
        delete explorePageCache.value[key]
      }
    }
  }

  const setExplorePageCache = (categoryId: number, data: ExplorePageCacheItem, search = '', sort = '') => {
    explorePageCache.value[exploreCacheKey(categoryId, search, sort)] = { ...data, albums: [...data.albums] }
  }

  let dashboardAbortController: AbortController | null = null

  const fetchSidebarData = async () => {
    if (isSidebarLoading.value) return
    const controller = new AbortController()
    sidebarController = controller
    try {
      isSidebarLoading.value = true
      sidebarError.value = null
      const response = await dashboardApi.getSidebar(controller.signal)
      if (sidebarController !== controller) return
      libraryAlbums.value = response.data.data.album || []
      categories.value = response.data.data.category || []
      playlists.value = response.data.data.playlist || []
    } catch (err: unknown) {
      if (sidebarController !== controller || controller.signal.aborted) return
      sidebarError.value = err instanceof Error ? err.message : 'Gagal memuat data'
    } finally {
      if (sidebarController === controller) isSidebarLoading.value = false
    }
  }

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

  const isInLibrary = (id: number) => libraryAlbums.value.some((album) => Number(album.id) === Number(id))
  const toggleLibraryAlbum = async (item: Album) => {
    if (libraryBusyId.value !== null || isSidebarLoading.value) return
    if (!authStore.isAuthenticated) { libraryError.value = 'Sign in to add albums to your library.'; return }
    libraryBusyId.value = Number(item.id)
    libraryError.value = null
    const identity = authStore.user?.id
    const saved = isInLibrary(item.id)
    try {
      if (saved) await libraryApi.remove(Number(item.id))
      else await libraryApi.add(Number(item.id))
      if (!authStore.isAuthenticated || authStore.user?.id !== identity) return
      if (saved) libraryAlbums.value = libraryAlbums.value.filter((album) => Number(album.id) !== Number(item.id))
      else libraryAlbums.value = [...libraryAlbums.value, { ...item }]
    } catch {
      libraryError.value = 'Could not update library. Please try again.'
    } finally { libraryBusyId.value = null }
  }

  return {
    libraryAlbums, libraryBusyId, libraryError, isInLibrary, toggleLibraryAlbum,
    fetchSidebarData,
    isSidebarLoading,
    sidebarError,
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
    getExplorePageCache,
    clearExplorePageCache,
    fetchDashboardData
  }
})
