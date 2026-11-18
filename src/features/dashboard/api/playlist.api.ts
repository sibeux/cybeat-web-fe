import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'

export interface PlaylistOption {
  id: number
  title: string
  cover: string | null
  created_at: string
  contains_song?: boolean
}

interface PlaylistMutationResponse {
  status: string
  message?: string
  data?: { id: number; title: string }
}

export const playlistApi = {
  list(songId?: number) {
    return apiClient.get<ApiSuccessResponse<PlaylistOption[]>>('/music/playlist/crud.php', {
      params: songId ? { song_id: songId } : undefined,
    })
  },
  create(title: string) {
    return apiClient.post<PlaylistMutationResponse>('/music/playlist/crud.php', { title })
  },
  update(id: number, title: string, cover = '') {
    return apiClient.patch<PlaylistMutationResponse>('/music/playlist/crud.php', { id, title, cover })
  },
  delete(id: number) {
    return apiClient.delete<PlaylistMutationResponse>('/music/playlist/crud.php', { params: { id } })
  },
}
