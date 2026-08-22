import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi } from '../api/dashboard.api'
import type { Album, Category } from '../types/album.types'

export const useDashboardStore = defineStore('dashboard', () => {
  const albums = ref<Album[]>([])
  const categories = ref<Category[]>([])
  const playlists = ref<any[]>([])
  const isLoading = ref(false)
  const isFetched = ref(false)
  const error = ref<string | null>(null)

  const fetchDashboardData = async (force = false) => {
    if (isFetched.value && !force) return

    try {
      isLoading.value = true
      error.value = null
      const response = await dashboardApi.getMusicDashboard()
      albums.value = response.data.data.album || []
      categories.value = response.data.data.category || []
      playlists.value = response.data.data.playlist || []
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
    fetchDashboardData
  }
})
