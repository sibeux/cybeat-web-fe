import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'
import type { MusicDashboardData, ExploreCategoryData } from '../types/album.types'

export const dashboardApi = {
  getSidebar(signal?: AbortSignal) {
    return apiClient.get<ApiSuccessResponse<MusicDashboardData>>('/music/album/sidebar.php', { signal })
  },
  getMusicDashboard(search = '', signal?: AbortSignal) {
    return apiClient.get<ApiSuccessResponse<MusicDashboardData>>('/music/album/', {
      params: search ? { search } : undefined,
      signal,
    })
  },

  getExploreAlbums(categoryId?: number, limit = 10, cursor?: number | null, signal?: AbortSignal, search = '', sort?: { mode: string; direction: 'asc' | 'desc' }) {
    return apiClient.get<ApiSuccessResponse<ExploreCategoryData>>('/music/album/explore', {
      params: {
        category_id: categoryId,
        sort_by: sort?.mode,
        sort_direction: sort?.direction,
        search: search.trim() || undefined,
        limit,
        cursor: cursor ?? undefined,
      },
      signal,
    })
  },
}
