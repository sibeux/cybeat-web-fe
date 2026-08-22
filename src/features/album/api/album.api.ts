import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'
import type { Song } from '../types/song.types'

export const albumApi = {
  getSongs(type: string, uid: number) {
    return apiClient.get<ApiSuccessResponse<Song[]>>(`/music/song/`, {
      params: {
        type,
        uid,
      },
    })
  },
}
