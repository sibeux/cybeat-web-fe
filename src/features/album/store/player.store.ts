import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Song } from '../types/song.types'

export const usePlayerStore = defineStore('player', () => {
  const currentSong = ref<Song | null>(null)
  const playlist = ref<Song[]>([])

  const playSong = (song: Song, contextPlaylist: Song[] = []) => {
    currentSong.value = song
    if (contextPlaylist.length > 0) {
      playlist.value = contextPlaylist
    }
  }

  const playNext = () => {
    if (!currentSong.value || playlist.value.length === 0) return
    const idx = playlist.value.findIndex(s => s.id_music === currentSong.value?.id_music)
    if (idx !== -1 && idx < playlist.value.length - 1) {
      currentSong.value = playlist.value[idx + 1]
    }
  }

  const playPrev = () => {
    if (!currentSong.value || playlist.value.length === 0) return
    const idx = playlist.value.findIndex(s => s.id_music === currentSong.value?.id_music)
    if (idx > 0) {
      currentSong.value = playlist.value[idx - 1]
    }
  }

  const closePlayer = () => {
    currentSong.value = null
  }

  return {
    currentSong,
    playlist,
    playSong,
    playNext,
    playPrev,
    closePlayer
  }
})
