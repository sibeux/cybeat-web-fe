import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'
import type {
  ArtistCatalogResponse,
  ArtistMergeCommand,
  ArtistMergePreview,
  ArtistMergeResult,
  ArtistPageData,
} from '../types'

export const artistApi = {
  getArtist(id: number, signal?: AbortSignal) {
    return apiClient.get<ApiSuccessResponse<ArtistPageData>>('/music/artist/', {
      params: { id },
      signal,
    })
  },

  getAllArtists(signal?: AbortSignal) {
    return apiClient.get<ArtistCatalogResponse>('/music/artist/all/', { signal })
  },

  previewMerge(sourceArtistId: number, targetArtistId: number) {
    return apiClient.get<ApiSuccessResponse<ArtistMergePreview>>('/admin/artists/merge/', {
      params: {
        source_artist_id: sourceArtistId,
        target_artist_id: targetArtistId,
      },
    })
  },

  mergeArtists(command: ArtistMergeCommand) {
    return apiClient.post<ApiSuccessResponse<ArtistMergeResult>>('/admin/artists/merge/', command)
  },
}
