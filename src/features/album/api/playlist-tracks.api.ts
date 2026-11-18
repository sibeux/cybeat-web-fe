import apiClient from '@/core/infrastructure/http/axios'

interface PlaylistTrackResponse {
  status: string
  message?: string
}

export const playlistTracksApi = {
  add(playlistId: number, songId: number) {
    return apiClient.post<PlaylistTrackResponse>('/music/playlist/tracks.php', {
      playlist_id: playlistId,
      song_id: songId,
    })
  },
  remove(playlistId: number, songId: number) {
    return apiClient.delete<PlaylistTrackResponse>('/music/playlist/tracks.php', {
      data: { playlist_id: playlistId, song_ids: [songId] },
    })
  },
  removeMany(playlistId: number, songIds: number[]) {
    return apiClient.delete<PlaylistTrackResponse>('/music/playlist/tracks.php', {
      data: { playlist_id: playlistId, song_ids: songIds },
    })
  },
}
