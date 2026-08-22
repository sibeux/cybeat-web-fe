<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '../store/player.store'
import type { Song } from '../types/song.types'
import apiClient from '@/core/infrastructure/http/axios'

const playerStore = usePlayerStore()
const { currentSong: song, repeatMode, isShuffle } = storeToRefs(playerStore)

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const bufferedTime = ref(0)
const volume = ref(1)

const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00'
  const m = Math.floor(time / 60)
  const s = Math.floor(time % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const isLoadingStream = ref(false)

const loadSong = async (newSong: Song | null) => {
  if (!newSong || !audioRef.value) return
  
  try {
    isPlaying.value = false
    isLoadingStream.value = true
    
    const response = await apiClient.get('/music/stream', {
      params: {
        music_id: newSong.id_music,
        file_type: 'audio'
      }
    })
    
    const data = response.data
    if (data.success && data.stream_url) {
      audioRef.value.src = data.stream_url
      audioRef.value.play().catch(e => console.error('Playback failed', e))
      isPlaying.value = true
    } else {
      console.error('Failed to resolve stream URL:', data)
    }
  } catch (err) {
    console.error('Error fetching stream URL:', err)
  } finally {
    isLoadingStream.value = false
  }
}

// Watch for song changes to autoplay
watch(song, async (newSong) => {
  await nextTick()
  loadSong(newSong)
})

const togglePlay = () => {
  if (!audioRef.value || !song.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play().catch(e => console.error('Playback failed', e))
  }
  isPlaying.value = !isPlaying.value
}

const onTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

const onProgress = () => {
  if (audioRef.value && audioRef.value.buffered.length > 0) {
    let maxBuffered = 0
    for (let i = 0; i < audioRef.value.buffered.length; i++) {
      if (audioRef.value.buffered.end(i) > maxBuffered) {
        maxBuffered = audioRef.value.buffered.end(i)
      }
    }
    bufferedTime.value = maxBuffered
  }
}

const progressStyle = computed(() => {
  const dur = duration.value || 100
  const currentPct = (currentTime.value / dur) * 100
  const bufferedPct = (bufferedTime.value / dur) * 100
  
  return {
    background: `linear-gradient(to right, 
      var(--color-primary) 0%, 
      var(--color-primary) ${currentPct}%, 
      var(--color-primary-ring) ${currentPct}%, 
      var(--color-primary-ring) ${bufferedPct}%, 
      rgba(255,255,255,0.2) ${bufferedPct}%, 
      rgba(255,255,255,0.2) 100%)`
  }
})

const volumeStyle = computed(() => {
  const volPct = volume.value * 100
  return {
    background: `linear-gradient(to right, 
      var(--color-primary) 0%, 
      var(--color-primary) ${volPct}%, 
      rgba(255,255,255,0.2) ${volPct}%, 
      rgba(255,255,255,0.2) 100%)`
  }
})

const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

const onEnded = () => {
  if (repeatMode.value === 2) {
    if (audioRef.value) {
      audioRef.value.currentTime = 0
      audioRef.value.play().catch(e => console.error('Playback failed', e))
      isPlaying.value = true
    }
  } else {
    isPlaying.value = false
    playerStore.playNext()
  }
}

const seek = (e: Event) => {
  const target = e.target as HTMLInputElement
  const time = Number(target.value)
  if (audioRef.value) {
    audioRef.value.currentTime = time
    currentTime.value = time
  }
}

const changeVolume = (e: Event) => {
  const target = e.target as HTMLInputElement
  const vol = Number(target.value)
  if (audioRef.value) {
    audioRef.value.volume = vol
    volume.value = vol
  }
}

const resolveCoverUrl = (cover: string | null) => {
  if (!cover) return ''
  if (cover.startsWith('http') || cover.startsWith('data:')) return cover
  return `https://${cover}`
}

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }
  if (song.value) {
    loadSong(song.value)
  }
})
</script>

<template>
  <div v-if="song" class="player-widget">
    <audio 
      ref="audioRef"
      @timeupdate="onTimeUpdate"
      @progress="onProgress"
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
      @play="isPlaying = true"
      @pause="isPlaying = false"
    ></audio>

    <div class="player-widget__info">
      <img :src="resolveCoverUrl(song.cover)" alt="Cover" class="player-widget__cover" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
      <div class="player-widget__track-details">
        <h4 class="player-widget__title">{{ song.title }}</h4>
        <span class="player-widget__artist">{{ song.artist }}</span>
        <span class="player-widget__codec" v-if="song.codec_name">
          {{ song.codec_name }} • {{ song.bit_rate || 'Unknown' }} bps
        </span>
      </div>
    </div>

    <div class="player-widget__controls-container">
      <div class="player-widget__buttons">
        <button class="player-btn player-btn--small" :class="{ 'is-active-repeat-all': repeatMode === 1, 'is-active-repeat-one': repeatMode === 2 }" @click="playerStore.toggleRepeat()" aria-label="Repeat">
          <svg v-if="repeatMode === 0 || repeatMode === 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          <svg v-else-if="repeatMode === 2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            <path d="M11 10h1v4"></path>
          </svg>
        </button>
        <button class="player-btn" @click="playerStore.playPrev()" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button class="player-btn player-btn--play" @click="togglePlay" aria-label="Play/Pause" :disabled="isLoadingStream">
          <svg v-if="isLoadingStream" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <svg v-else-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button class="player-btn" @click="playerStore.playNext()" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button class="player-btn player-btn--small" :class="{ 'is-active-shuffle': isShuffle }" @click="playerStore.toggleShuffle()" aria-label="Shuffle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 3 21 3 21 8"></polyline>
            <line x1="4" y1="20" x2="21" y2="3"></line>
            <polyline points="21 16 21 21 16 21"></polyline>
            <line x1="15" y1="15" x2="21" y2="21"></line>
            <line x1="4" y1="4" x2="9" y2="9"></line>
          </svg>
        </button>
      </div>

      <div class="player-widget__progress">
        <span class="player-widget__time">{{ formatTime(currentTime) }}</span>
        <input 
          type="range" 
          class="player-widget__seek" 
          :min="0" 
          :max="duration || 100" 
          :value="currentTime" 
          @input="seek" 
          :style="progressStyle"
        />
        <span class="player-widget__time">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="player-widget__extra">
      <svg class="player-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
      <input 
        type="range" 
        class="player-widget__volume" 
        min="0" 
        max="1" 
        step="0.01" 
        :value="volume" 
        @input="changeVolume" 
        :style="volumeStyle"
      />
      <button class="player-btn player-btn--close" @click="playerStore.closePlayer()" aria-label="Close Player">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  </div>
</template>

<style scoped src="./MusicPlayerWidget.css"></style>
