import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, Category, Playlist } from '../types/album.types'
import { useAuthStore } from '@/features/auth'

export const useDashboardStore = defineStore('dashboard', () => {
  const albums = ref<Album[]>([])
  const categories = ref<Category[]>([])
  const playlists = ref<Playlist[]>([])
  const isLoading = ref(false)
  const isFetched = ref(false)
  const error = ref<string | null>(null)
  const fetchedSearch = ref('')
  const searchQuery = ref('')

  const authStore = useAuthStore()

  // Invalidate cache and reset data when auth state changes (login/logout)
  watch(() => authStore.isAuthenticated, () => {
    isFetched.value = false
    albums.value = []
    categories.value = []
    playlists.value = []
  })

  let dashboardAbortController: AbortController | null = null

  const fetchDashboardData = async (search = '', force = false) => {
    const trimmedSearch = search.trim()
    if (isFetched.value && fetchedSearch.value === trimmedSearch && !force) return

    if (dashboardAbortController) {
      dashboardAbortController.abort()
    }
    dashboardAbortController = new AbortController()

    try {
      isLoading.value = true
      error.value = null
      const response = await dashboardApi.getMusicDashboard(trimmedSearch, dashboardAbortController.signal)
      albums.value = response.data.data.album || []
      if (!trimmedSearch) {
        categories.value = response.data.data.category || []
        playlists.value = response.data.data.playlist || []
      }
      fetchedSearch.value = trimmedSearch
      isFetched.value = true
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return
      }
      error.value = err.message || 'Gagal memuat data'
    } finally {
      isLoading.value = false
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
    fetchDashboardData
  }
})
