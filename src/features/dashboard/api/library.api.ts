import apiClient from '@/core/infrastructure/http/axios'

export const libraryApi = {
  add(albumId: number) {
    return apiClient.post('/music/album/library.php', { album_id: albumId })
  },
  remove(albumId: number) {
    return apiClient.delete('/music/album/library.php', { params: { album_id: albumId } })
  },
}
