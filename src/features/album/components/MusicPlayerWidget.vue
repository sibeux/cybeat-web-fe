<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { Song } from '../types/song.types'
import apiClient from '@/infrastructure/http/axios'

const props = defineProps<{
  song: Song | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'next'): void
  (e: 'prev'): void
}>()

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
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
watch(() => props.song, async (newSong) => {
  await nextTick()
  loadSong(newSong)
})

const togglePlay = () => {
  if (!audioRef.value || !props.song) return
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

const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

const onEnded = () => {
  isPlaying.value = false
  emit('next')
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
  if (props.song) {
    loadSong(props.song)
  }
})
</script>

<template>
  <div v-if="song" class="player-widget">
    <audio 
      ref="audioRef"
      @timeupdate="onTimeUpdate"
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
        <button class="player-btn" @click="emit('prev')" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button class="player-btn player-btn--play" @click="togglePlay" aria-label="Play/Pause" :disabled="isLoadingStream">
          <svg v-if="isLoadingStream" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <svg v-else-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button class="player-btn" @click="emit('next')" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
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
      />
      <button class="player-btn player-btn--close" @click="emit('close')" aria-label="Close Player">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.player-widget {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 800px;
  background: rgba(18, 18, 18, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  gap: 1rem;
}

.player-widget__info {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 25%;
  min-width: 150px;
}

.player-widget__cover {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.5rem;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.player-widget__track-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.player-widget__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-widget__artist {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-widget__codec {
  font-size: 0.65rem;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-top: 0.25rem;
  display: inline-block;
  width: fit-content;
}

.player-widget__controls-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.player-widget__buttons {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.player-btn {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.player-btn:hover {
  color: #fff;
  transform: scale(1.1);
}

.player-btn svg {
  width: 1.5rem;
  height: 1.5rem;
}

.player-btn--play {
  background: #fff;
  color: #000;
  padding: 0.6rem;
}
.player-btn--play:hover {
  background: #e0e0e0;
  color: #000;
  transform: scale(1.05);
}
.player-btn--play svg {
  width: 1.8rem;
  height: 1.8rem;
}

.player-btn--close svg {
  width: 1.2rem;
  height: 1.2rem;
}

.player-widget__progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 400px;
}

.player-widget__time {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.7);
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: center;
}

.player-widget__seek, .player-widget__volume {
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255,255,255,0.2);
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.player-widget__seek {
  flex: 1;
}

.player-widget__seek::-webkit-slider-thumb, .player-widget__volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  transition: transform 0.1s;
}

.player-widget__seek::-webkit-slider-thumb:hover, .player-widget__volume::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.player-widget__extra {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 25%;
  justify-content: flex-end;
}

.player-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: rgba(255,255,255,0.7);
}

.player-widget__volume {
  width: 80px;
}

.player-btn--play:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none !important;
}

.spinner {
  animation: widget-spin 2s linear infinite;
  color: #000;
}

@keyframes widget-spin {
  100% {
    transform: rotate(360deg);
  }
}
</style>
