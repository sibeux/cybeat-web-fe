import apiClient from '@/core/infrastructure/http/axios'
import type { RecentMusicItem } from '../types/history.types'

interface ApiResponsePayload {
  status?: string
  data?: Record<string, unknown>[]
}

export const historyApi = {
  async getRecentMusic(userId: number, signal?: AbortSignal): Promise<RecentMusicItem[]> {
    const response = await apiClient.get<ApiResponsePayload | Record<string, unknown>[]>('/playlist', {
      params: {
        recents_music: userId,
      },
      signal,
    })

    const payload = response.data
    let rawList: Record<string, unknown>[] = []
    if (payload && !Array.isArray(payload) && Array.isArray(payload.data)) {
      rawList = payload.data
    } else if (Array.isArray(payload)) {
      rawList = payload
    }

    return rawList.map((item) => ({
      id_music: Number(item.id_music),
      title: String(item.title || ''),
      artist: String(item.artist || ''),
      artists: Array.isArray(item.artists) ? (item.artists as any) : [],
      cover: String(item.cover || ''),
      disc_number: item.disc_number ? Number(item.disc_number) : 1,
      album: String(item.album || ''),
      metadata_id_music: item.metadata_id_music ? Number(item.metadata_id_music) : 0,
      codec_name: item.codec_name ? String(item.codec_name) : '',
      music_quality: item.music_quality ? String(item.music_quality) : '',
      sample_rate: item.sample_rate ? String(item.sample_rate) : '',
      bit_rate: item.bit_rate ? String(item.bit_rate) : '',
      bits_per_raw_sample: item.bits_per_raw_sample ? String(item.bits_per_raw_sample) : '',
      bg_color: (item.bg_color as string) || null,
      text_color: (item.text_color as string) || null,
      cache_music_id: item.cache_music_id ? Number(item.cache_music_id) : null,
      played_at: item.played_at ? String(item.played_at) : undefined,
    }))
  },
}
