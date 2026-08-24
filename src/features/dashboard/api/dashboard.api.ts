import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'
import type { MusicDashboardData } from '../types/album.types'

export const dashboardApi = {
  getMusicDashboard(search = '') {
    return apiClient.get<ApiSuccessResponse<MusicDashboardData>>('/music/album/', {
      params: search ? { search } : undefined,
    })
  },
}
