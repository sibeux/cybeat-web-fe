import apiClient from '@/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/shared/types/api.types'
import type { MusicDashboardData } from '../types/album.types'

export const dashboardApi = {
  getMusicDashboard() {
    return apiClient.get<ApiSuccessResponse<MusicDashboardData>>('/music/album/')
  },
}
