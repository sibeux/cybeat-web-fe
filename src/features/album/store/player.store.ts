import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song } from '../types/song.types'
import { albumApi } from '../api/album.api'

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
  
  const codecData = ref<{ bits_per_raw_sample: string, sample_rate: string, bit_rate: string, codec_name: string, music_quality: string } | null>(null)
  const dominantColor = ref<{ bg_color: string, text_color: string } | null>(null)

  const activePlaylist = computed(() => isShuffle.value ? shuffledPlaylist.value : playlist.value)

  const shuffleArray = (array: Song[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  const setRecentsCodecDominantColor = async (song: Song, album: PlaybackAlbum | null) => {
    // Reset state before fetching
    codecData.value = null
    dominantColor.value = null
    
    try {
      const response = await albumApi.setRecentMusic({
        music_id: song.id_music,
        album_id: album?.id ?? 0, // Fallback to 0 if no album
        album_type: album?.type ?? 'song' // Fallback to 'song' if no album type
      })
      
      if (response.data.status === 'success') {
        if (response.data.codec) {
          codecData.value = response.data.codec
        }
        if (response.data.dominant_color) {
          dominantColor.value = response.data.dominant_color
        }
      }
    } catch (e) {
      console.error('Error setting recent music / fetching codec:', e)
    }
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
    
    // Fire and forget
    setRecentsCodecDominantColor(song, currentAlbum.value)
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
    playbackToggleRequest.value = 0
  }

  return {
    currentSong,
    currentAlbum,
    playlist,
    repeatMode,
    isShuffle,
    isPlaying,
    playbackToggleRequest,
    codecData,
    dominantColor,
    playSong,
    togglePlayback,
    playNext,
    playPrev,
    toggleShuffle,
    toggleRepeat,
    closePlayer,
    setRecentsCodecDominantColor
  }
})
