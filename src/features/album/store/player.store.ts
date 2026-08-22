import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song } from '../types/song.types'

export interface PlaybackAlbum {
  type: string
  id: number
}

export const usePlayerStore = defineStore('player', () => {
  const currentSong = ref<Song | null>(null)
  const currentAlbum = ref<PlaybackAlbum | null>(null)
  const playlist = ref<Song[]>([])
  const shuffledPlaylist = ref<Song[]>([])
  
  const repeatMode = ref<number>(0) // 0: None, 1: All, 2: One
  const isShuffle = ref<boolean>(false)
  const isPlaying = ref(false)
  const playbackToggleRequest = ref(0)

  const activePlaylist = computed(() => isShuffle.value ? shuffledPlaylist.value : playlist.value)

  const shuffleArray = (array: Song[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  const playSong = (song: Song, contextPlaylist: Song[] = [], album: PlaybackAlbum | null = null) => {
    currentSong.value = song
    isPlaying.value = false
    if (album) {
      currentAlbum.value = album
    }
    if (contextPlaylist.length > 0) {
      playlist.value = contextPlaylist
      if (isShuffle.value) {
        const others = contextPlaylist.filter(s => s.id_music !== song.id_music)
        shuffledPlaylist.value = [song, ...shuffleArray(others)]
      }
    } else if (isShuffle.value && shuffledPlaylist.value.length === 0) {
      const others = playlist.value.filter(s => s.id_music !== song.id_music)
      shuffledPlaylist.value = [song, ...shuffleArray(others)]
    }
  }

  const togglePlayback = () => {
    playbackToggleRequest.value++
  }

  const playNext = () => {
    if (!currentSong.value || activePlaylist.value.length === 0) return
    const currentList = activePlaylist.value
    const idx = currentList.findIndex(s => s.id_music === currentSong.value?.id_music)
    
    if (idx !== -1) {
      if (idx < currentList.length - 1) {
        currentSong.value = currentList[idx + 1]
      } else if (repeatMode.value === 1 || repeatMode.value === 2) {
        currentSong.value = currentList[0]
      }
    }
  }

  const playPrev = () => {
    if (!currentSong.value || activePlaylist.value.length === 0) return
    const currentList = activePlaylist.value
    const idx = currentList.findIndex(s => s.id_music === currentSong.value?.id_music)
    
    if (idx > 0) {
      currentSong.value = currentList[idx - 1]
    } else if (repeatMode.value === 1 || repeatMode.value === 2) {
      currentSong.value = currentList[currentList.length - 1]
    }
  }

  const toggleShuffle = () => {
    isShuffle.value = !isShuffle.value
    if (isShuffle.value && currentSong.value) {
      const others = playlist.value.filter(s => s.id_music !== currentSong.value?.id_music)
      shuffledPlaylist.value = [currentSong.value, ...shuffleArray(others)]
    }
  }

  const toggleRepeat = () => {
    repeatMode.value = (repeatMode.value + 1) % 3
  }

  const closePlayer = () => {
    currentSong.value = null
    isPlaying.value = false
    currentAlbum.value = null
    playlist.value = []
    shuffledPlaylist.value = []
    isShuffle.value = false
    repeatMode.value = 0
  }

  return {
    currentSong,
    currentAlbum,
    playlist,
    repeatMode,
    isShuffle,
    isPlaying,
    playbackToggleRequest,
    playSong,
    togglePlayback,
    playNext,
    playPrev,
    toggleShuffle,
    toggleRepeat,
    closePlayer
  }
})
