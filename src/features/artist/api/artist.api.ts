import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'
import type {
  ArtistCatalogResponse,
  ArtistMergeCommand,
  ArtistMergePreview,
  ArtistMergeResult,
  ArtistSplitPreview,
  ArtistSplitResult,
  ArtistEditPreview,
  ArtistEditResult,
  ArtistPageData,
} from '../types'

export const artistApi = {
  getArtist(id: number, signal?: AbortSignal) {
    return apiClient.get<ApiSuccessResponse<ArtistPageData>>('/music/artist/', {
      params: { id },
      signal,
    })
  },

  getAllArtists(search?: string, signal?: AbortSignal) {
    return apiClient.get<ArtistCatalogResponse>('/music/artist/all/', {
      params: search === undefined ? undefined : { search },
      signal,
    })
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

  previewSplit(sourceArtistId: number, targetNames: string[]) {
    return apiClient.get<ApiSuccessResponse<ArtistSplitPreview>>('/admin/artists/split/', {
      params: { source_artist_id: sourceArtistId, target_names: targetNames },
    })
  },

  splitArtist(command: { source_artist_id: number; target_names: string[]; confirm_source_name: string; expected_song_count: number; expected_album_count: number; preview_token: string }) {
    return apiClient.post<ApiSuccessResponse<ArtistSplitResult>>('/admin/artists/split/', command)
  },

  previewEdit(artistId: number) {
    return apiClient.get<ApiSuccessResponse<ArtistEditPreview>>('/admin/artists/edit/', {
      params: { artist_id: artistId },
    })
  },

  editArtist(command: { artist_id: number; name: string; expected_name: string; preview_token: string }) {
    return apiClient.patch<ApiSuccessResponse<ArtistEditResult>>('/admin/artists/edit/', command)
  },
}
