import type { Song } from '@/features/album/types/song.types'

export type RecentMusicItem = Song & {
  played_at?: string
}

export interface GroupedHistoryGroup {
  label: string
  tracks: RecentMusicItem[]
}
