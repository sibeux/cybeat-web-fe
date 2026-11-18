import apiClient from '@/core/infrastructure/http/axios'

export type PinnableType = 'album' | 'playlist' | 'category'

interface PinResponse {
  status: string
  message?: string
  data?: { pinned: boolean }
}

export const pinApi = {
  status(type: PinnableType, id: number) {
    return apiClient.get<PinResponse>('/music/album/pin/index.php', { params: { albumId: id, albumType: type } })
  },
  pin(type: PinnableType, id: number) {
    return apiClient.post<PinResponse>('/music/album/pin/index.php', { albumId: id, albumType: type })
  },
  unpin(type: PinnableType, id: number) {
    return apiClient.delete<PinResponse>('/music/album/pin/index.php', { params: { albumId: id, albumType: type } })
  },
}
