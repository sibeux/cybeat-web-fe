import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'

export interface PlaylistOption {
  id: number
  title: string
  cover: string | null
  created_at: string
}

interface PlaylistMutationResponse {
  status: string
  message?: string
  data?: { id: number; title: string }
}

export const playlistApi = {
  list() {
    return apiClient.get<ApiSuccessResponse<PlaylistOption[]>>('/music/playlist/crud.php')
  },
  create(title: string) {
    return apiClient.post<PlaylistMutationResponse>('/music/playlist/crud.php', { title })
  },
  update(id: number, title: string) {
    return apiClient.patch<PlaylistMutationResponse>('/music/playlist/crud.php', { id, title })
  },
  delete(id: number) {
    return apiClient.delete<PlaylistMutationResponse>('/music/playlist/crud.php', { params: { id } })
  },
}
