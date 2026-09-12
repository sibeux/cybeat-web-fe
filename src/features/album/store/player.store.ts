import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song } from '../types/song.types'
import { albumApi } from '../api/album.api'

export interface PlaybackAlbum {
  type: string
  id: number
}

// Helper to resolve cover for Media Session API
const resolveCoverUrl = (cover: string | null) => {
  if (!cover) return 'https://cybeat.sibeux.my.id/assets/images/placeholder_cover_music.png' // Fallback
  if (cover.startsWith('http') || cover.startsWith('data:')) return cover
  if (cover.includes('cover_url=cdncloudflare/')) {
    const match = cover.match(/cover_url=cdncloudflare\/(.*)/);
    if (match && match[1]) return `https://cdn.sibeux.my.id/${match[1]}`;
  }
  return `https://${cover}`
}

export const usePlayerStore = defineStore('player', () => {
  // === Audio Native Instance ===
  const audio = new Audio()

  // === State ===
  const currentSong = ref<Song | null>(null)
  const currentAlbum = ref<PlaybackAlbum | null>(null)
  const playlist = ref<Song[]>([])
  const shuffledPlaylist = ref<Song[]>([])
  
  const repeatMode = ref<number>(0) // 0: None, 1: All, 2: One
  const isShuffle = ref<boolean>(false)
  const isPlaying = ref(false)
  
  // New playback state
  const currentTime = ref(0)
  const duration = ref(0)
  const bufferedTime = ref(0)
  const isLoadingStream = ref(false)
  
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }
  
  const setCookie = (name: string, value: string, days = 365) => {
    const d = new Date()
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000))
    const expires = `expires=${d.toUTCString()}`
    document.cookie = `${name}=${value};${expires};path=/`
  }
  
  const volume = ref(getCookie('cybeat_volume') !== null ? Number(getCookie('cybeat_volume')) : 1)
  audio.volume = volume.value

  const codecData = ref<{ bits_per_raw_sample: string, sample_rate: string, bit_rate: string, codec_name: string, music_quality: string } | null>(null)
  const dominantColor = ref<{ bg_color: string, text_color: string } | null>(null)

  const activePlaylist = computed(() => isShuffle.value ? shuffledPlaylist.value : playlist.value)

  // === Native Audio Event Listeners ===
  audio.addEventListener('timeupdate', () => {
    if (!isLoadingStream.value && audio.src) {
      currentTime.value = audio.currentTime
    }
  })

  audio.addEventListener('progress', () => {
    if (audio.buffered.length > 0) {
      let maxBuffered = 0
      for (let i = 0; i < audio.buffered.length; i++) {
        if (audio.buffered.end(i) > maxBuffered) {
          maxBuffered = audio.buffered.end(i)
        }
      }
      bufferedTime.value = maxBuffered
    }
  })

  audio.addEventListener('loadedmetadata', () => {
    duration.value = audio.duration || 0
    currentTime.value = audio.currentTime || 0
    isLoadingStream.value = false
  })

  audio.addEventListener('ended', () => {
    if (repeatMode.value === 2) {
      audio.currentTime = 0
      audio.play().catch(e => console.error('Playback failed', e))
      isPlaying.value = true
      if (currentSong.value) {
        setRecentsCodecDominantColor(currentSong.value, currentAlbum.value)
      }
    } else {
      const endedSongId = currentSong.value?.id_music
      isPlaying.value = false
      playNext()

      if (repeatMode.value === 1 && currentSong.value?.id_music === endedSongId) {
        audio.currentTime = 0
        audio.play().catch(e => console.error('Playback failed', e))
        isPlaying.value = true
      }
    }
  })

  audio.addEventListener('play', () => { isPlaying.value = true })
  audio.addEventListener('pause', () => { isPlaying.value = false })
  audio.addEventListener('waiting', () => { isLoadingStream.value = true })
  audio.addEventListener('canplay', () => { isLoadingStream.value = false })
  audio.addEventListener('error', (e) => {
    const mediaError = (e.target as HTMLAudioElement)?.error
    console.error('Audio native error:', mediaError?.code, mediaError?.message || mediaError)
    isLoadingStream.value = false
    isPlaying.value = false
  })

  // === Media Session API Integration ===
  const setupMediaSession = (song: Song) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: 'Cybeat Music',
        artwork: [
          { src: resolveCoverUrl(song.cover), sizes: '512x512', type: 'image/png' },
          { src: resolveCoverUrl(song.cover), sizes: '256x256', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlayback());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayback());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
  }

  // === Methods ===
  const shuffleArray = (array: Song[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  const setRecentsCodecDominantColor = async (song: Song, album: PlaybackAlbum | null) => {
    codecData.value = null
    dominantColor.value = null
    try {
      const response = await albumApi.setRecentMusic({
        music_id: song.id_music,
        album_id: album?.id ?? 0,
        album_type: album?.type ?? 'song'
      })
      if (response.data.status === 'success') {
        if (response.data.codec) codecData.value = response.data.codec
        if (response.data.dominant_color) dominantColor.value = response.data.dominant_color
      }
    } catch (e) {
      console.error('Error setting recent music / fetching codec:', e)
    }
  }

  let loadRequestId = 0
  let activeAbortController: AbortController | null = null

  const loadAudioStream = async (song: Song) => {
    const requestId = ++loadRequestId
    
    // Abort previous stream request if any
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }

    // Reset player state immediately
    currentTime.value = 0
    duration.value = 0
    bufferedTime.value = 0
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    try {
      audio.currentTime = 0
    } catch {}
    
    isPlaying.value = false
    isLoadingStream.value = true

    const controller = new AbortController()
    activeAbortController = controller
    
    try {
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string || '').replace(/\/+$/, '')
      const streamEndpoint = `${apiBaseUrl}/music/stream/?music_id=${song.id_music}&file_type=audio`
      
      // Fetch headers and immediate body chunk without waiting for server connection close
      const res = await fetch(streamEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      // Read the first chunk immediately where JSON payload arrives
      const reader = res.body?.getReader()
      let rawJson = ''
      
      if (reader) {
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (value) {
            rawJson += decoder.decode(value, { stream: true })
          }
          // As soon as valid JSON object is received, stop waiting and abort hanging connection
          if (rawJson.includes('stream_url') || done) {
            break
          }
        }
        controller.abort() // Immediately release hanging server connection
      } else {
        rawJson = await res.text()
      }

      let data: any = null
      try {
        data = JSON.parse(rawJson)
      } catch {
        // Fallback in case rawJson has trailing characters
        const match = rawJson.match(/\{[\s\S]*"stream_url"\s*:\s*"([^"]+)"[\s\S]*\}/)
        if (match && match[1]) {
          data = { stream_url: match[1] }
        }
      }
      
      if (requestId !== loadRequestId || song.id_music !== currentSong.value?.id_music) return

      const directUrl = 
        data?.stream_url || 
        data?.url || 
        data?.data?.stream_url || 
        data?.data?.url || 
        (typeof data === 'string' ? data : null)

      if (directUrl) {
        audio.src = directUrl
        audio.volume = volume.value
        setupMediaSession(song)
        
        audio.play()
          .then(() => {
            isPlaying.value = true
            isLoadingStream.value = false
          })
          .catch((playErr) => {
            console.error('Audio playback failed:', playErr)
            isPlaying.value = false
            isLoadingStream.value = false
          })
      } else {
        console.error('No stream URL found in API response:', rawJson)
        isLoadingStream.value = false
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      if (requestId === loadRequestId) {
        console.error('Error fetching stream URL:', err)
        isLoadingStream.value = false
      }
    } finally {
      if (activeAbortController === controller) {
        activeAbortController = null
      }
    }
  }

  const playSong = (song: Song, contextPlaylist: Song[] = [], album: PlaybackAlbum | null = null) => {
    const previousSongId = currentSong.value?.id_music
    currentSong.value = song
    
    if (album) currentAlbum.value = album
    
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
    
    if (song.id_music !== previousSongId) {
      currentTime.value = 0
      duration.value = 0
      bufferedTime.value = 0
      loadAudioStream(song)
    }
    
    setRecentsCodecDominantColor(song, currentAlbum.value)
  }

  const togglePlayback = () => {
    if (!currentSong.value || isLoadingStream.value) return
    if (isPlaying.value) {
      audio.pause()
    } else {
      audio.play().catch(e => console.error('Playback failed', e))
    }
  }

  const seek = (time: number) => {
    audio.currentTime = time
    currentTime.value = time
  }

  const changeVolume = (vol: number) => {
    audio.volume = vol
    volume.value = vol
    setCookie('cybeat_volume', vol.toString())
  }

  const playNext = () => {
    if (!currentSong.value || activePlaylist.value.length === 0) return
    const currentList = activePlaylist.value
    const idx = currentList.findIndex(s => s.id_music === currentSong.value?.id_music)
    
    if (idx !== -1) {
      if (idx < currentList.length - 1) {
        playSong(currentList[idx + 1])
      } else if (repeatMode.value === 1 || repeatMode.value === 2) {
        playSong(currentList[0])
      }
    }
  }

  const playPrev = () => {
    if (!currentSong.value || activePlaylist.value.length === 0) return
    const currentList = activePlaylist.value
    const idx = currentList.findIndex(s => s.id_music === currentSong.value?.id_music)
    
    if (idx > 0) {
      playSong(currentList[idx - 1])
    } else if (repeatMode.value === 1 || repeatMode.value === 2) {
      playSong(currentList[currentList.length - 1])
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
    currentTime.value = 0
    duration.value = 0
    bufferedTime.value = 0
    isLoadingStream.value = false
    
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  return {
    currentSong,
    currentAlbum,
    playlist,
    repeatMode,
    isShuffle,
    isPlaying,
    
    currentTime,
    duration,
    bufferedTime,
    isLoadingStream,
    volume,
    
    codecData,
    dominantColor,
    
    playSong,
    togglePlayback,
    seek,
    changeVolume,
    playNext,
    playPrev,
    toggleShuffle,
    toggleRepeat,
    closePlayer,
    setRecentsCodecDominantColor
  }
})
