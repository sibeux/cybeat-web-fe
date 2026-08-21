import apiClient from '@/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/shared/types/api.types'
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
