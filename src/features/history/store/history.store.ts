import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { historyApi } from '../api/history.api'
import type { RecentMusicItem, GroupedHistoryGroup } from '../types/history.types'
import type { Song } from '@/features/album/types/song.types'
import { logger } from '@/core/infrastructure/logger'

export const useHistoryStore = defineStore('history', () => {
  const tracks = ref<RecentMusicItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  let lastFetchedUserId: number | null = null

  const filteredTracks = computed<RecentMusicItem[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return tracks.value

    return tracks.value.filter((item) => {
      const titleMatch = item.title?.toLowerCase().includes(q)
      const artistMatch = item.artist?.toLowerCase().includes(q)
      const albumMatch = item.album?.toLowerCase().includes(q)
      return titleMatch || artistMatch || albumMatch
    })
  })

  const totalTracks = computed(() => tracks.value.length)

  const toSong = (item: RecentMusicItem): Song => item

  const songsList = computed<Song[]>(() => {
    return filteredTracks.value
  })

  const groupedTracks = computed<GroupedHistoryGroup[]>(() => {
    const list = filteredTracks.value
    if (list.length === 0) return []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const oneDayMs = 24 * 60 * 60 * 1000
    const yesterday = today - oneDayMs
    const sevenDaysAgo = today - 6 * oneDayMs

    const groups: Record<string, RecentMusicItem[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Earlier: [],
    }

    for (const track of list) {
      if (!track.played_at) {
        groups.Earlier.push(track)
        continue
      }

      const trackDateObj = new Date(track.played_at.replace(/-/g, '/'))
      const trackTime = new Date(
        trackDateObj.getFullYear(),
        trackDateObj.getMonth(),
        trackDateObj.getDate(),
      ).getTime()

      if (trackTime >= today) {
        groups.Today.push(track)
      } else if (trackTime >= yesterday) {
        groups.Yesterday.push(track)
      } else if (trackTime >= sevenDaysAgo) {
        groups['This Week'].push(track)
      } else {
        groups.Earlier.push(track)
      }
    }

    const result: GroupedHistoryGroup[] = []
    if (groups.Today.length > 0) result.push({ label: 'Today', tracks: groups.Today })
    if (groups.Yesterday.length > 0) result.push({ label: 'Yesterday', tracks: groups.Yesterday })
    if (groups['This Week'].length > 0) result.push({ label: 'This Week', tracks: groups['This Week'] })
    if (groups.Earlier.length > 0) result.push({ label: 'Earlier', tracks: groups.Earlier })

    return result
  })

  async function fetchRecentMusic(userId: number, force = false, signal?: AbortSignal): Promise<void> {
    if (!userId || userId <= 0) {
      tracks.value = []
      return
    }

    if (isLoading.value && !force) return
    if (!force && lastFetchedUserId === userId && tracks.value.length > 0) return

    isLoading.value = true
    error.value = null

    try {
      logger.info('HistoryStore', `Fetching recent music for user ${userId}`)
      const data = await historyApi.getRecentMusic(userId, signal)
      tracks.value = data
      lastFetchedUserId = userId
    } catch (err: unknown) {
      const errorObj = err as {
        name?: string
        code?: string
        message?: string
        response?: { data?: { message?: string } }
      }
      if (errorObj?.name === 'CanceledError' || errorObj?.code === 'ERR_CANCELED') {
        return
      }
      logger.error('HistoryStore', 'Failed to fetch recent music', err)
      error.value =
        errorObj?.response?.data?.message || errorObj?.message || 'Failed to load listening history'
    } finally {
      isLoading.value = false
    }
  }

  function clearState(): void {
    tracks.value = []
    error.value = null
    searchQuery.value = ''
    lastFetchedUserId = null
  }

  return {
    tracks,
    isLoading,
    error,
    searchQuery,
    filteredTracks,
    groupedTracks,
    totalTracks,
    songsList,
    toSong,
    fetchRecentMusic,
    clearState,
  }
})
