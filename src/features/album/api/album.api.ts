import apiClient from '@/core/infrastructure/http/axios'
import type { ApiSuccessResponse } from '@/core/shared/types/api.types'
import type { Song } from '../types/song.types'

export interface SetRecentMusicPayload {
  music_id: number;
  album_id: number;
  album_type: string;
}

export interface SetRecentMusicResponse {
  status: string;
  message: string;
  codec?: {
    bits_per_raw_sample: string;
    sample_rate: string;
    bit_rate: string;
    codec_name: string;
  } | null;
  dominant_color?: {
    bg_color: string;
    text_color: string;
  } | null;
}

export const albumApi = {
  getSongs(type: string, uid: number) {
    return apiClient.get<ApiSuccessResponse<Song[]>>(`/music/song/`, {
      params: {
        type,
        uid,
      },
    })
  },
  setRecentMusic(payload: SetRecentMusicPayload) {
    const params = new URLSearchParams()
    params.append('music_id', payload.music_id.toString())
    params.append('album_id', payload.album_id.toString())
    params.append('album_type', payload.album_type)

    return apiClient.post<SetRecentMusicResponse>(`/recents_music`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
  }
}
