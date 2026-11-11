import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'
import type { ArtistPageData } from '../types'

export const artistApi = {
  getArtist(id: number, signal?: AbortSignal) {
    return apiClient.get<ApiSuccessResponse<ArtistPageData>>('/music/artist/', {
      params: { id },
      signal,
    })
  },
}
