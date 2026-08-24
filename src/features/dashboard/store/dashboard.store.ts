import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, Category } from '../types/album.types'
import { useAuthStore } from '@/features/auth'

export const useDashboardStore = defineStore('dashboard', () => {
  const albums = ref<Album[]>([])
  const categories = ref<Category[]>([])
  const playlists = ref<any[]>([])
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

  const fetchDashboardData = async (search = '', force = false) => {
    if (isFetched.value && fetchedSearch.value === search && !force) return

    try {
      isLoading.value = true
      error.value = null
      const response = await dashboardApi.getMusicDashboard(search)
      albums.value = response.data.data.album || []
      categories.value = response.data.data.category || []
      playlists.value = response.data.data.playlist || []
      fetchedSearch.value = search
      isFetched.value = true
    } catch (err: any) {
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
    error,
    searchQuery,
    fetchDashboardData
  }
})
