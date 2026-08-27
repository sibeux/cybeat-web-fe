<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '../store/player.store'

const playerStore = usePlayerStore()
const { 
  currentSong: song, 
  repeatMode, 
  isShuffle, 
  isPlaying, 
  currentTime,
  duration,
  bufferedTime,
  isLoadingStream,
  volume
} = storeToRefs(playerStore)

const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00'
  const m = Math.floor(time / 60)
  const s = Math.floor(time % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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

const seek = (e: Event) => {
  const target = e.target as HTMLInputElement
  playerStore.seek(Number(target.value))
}

const changeVolume = (e: Event) => {
  const target = e.target as HTMLInputElement
  playerStore.changeVolume(Number(target.value))
}

// Minimal local fallback for cover resolving in template
const resolveCoverUrl = (cover: string | null) => {
  if (!cover) return ''
  if (cover.startsWith('http') || cover.startsWith('data:')) return cover
  if (cover.includes('cover_url=cdncloudflare/')) {
    const match = cover.match(/cover_url=cdncloudflare\/(.*)/);
    if (match && match[1]) return `https://cdn.sibeux.my.id/${match[1]}`;
  }
  return `https://${cover}`
}

const DEFAULT_COVER = '/assets/images/placeholder_cover_music.png'

const handleCoverError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img.dataset.fallbackApplied) return
  img.dataset.fallbackApplied = 'true'
  img.src = DEFAULT_COVER
}
</script>

<template>
  <div v-if="song" class="player-widget">
    <div class="player-widget__info">
      <img 
        v-img-cache="resolveCoverUrl(song.cover) || DEFAULT_COVER" 
        alt="Cover" 
        class="player-widget__cover" 
        @error="handleCoverError"
      />
      <div class="player-widget__track-details">
        <h4 class="player-widget__title">{{ song.title }}</h4>
        <span class="player-widget__artist">{{ song.artist }}</span>
        <span v-if="song.codec_name" class="player-widget__codec">
          {{ song.codec_name }} • {{ song.bit_rate || 'Unknown' }} bps
        </span>
      </div>
    </div>

    <div class="player-widget__controls-container">
      <div class="player-widget__buttons">
        <button class="player-btn player-btn--small" :class="{ 'is-active-repeat-all': repeatMode === 1, 'is-active-repeat-one': repeatMode === 2 }" aria-label="Repeat" @click="playerStore.toggleRepeat()">
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
        <button class="player-btn" aria-label="Previous" @click="playerStore.playPrev()">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button class="player-btn player-btn--play" aria-label="Play/Pause" :disabled="isLoadingStream" @click="playerStore.togglePlayback()">
          <svg v-if="isLoadingStream" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <svg v-else-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button class="player-btn" aria-label="Next" @click="playerStore.playNext()">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button class="player-btn player-btn--small" :class="{ 'is-active-shuffle': isShuffle }" aria-label="Shuffle" @click="playerStore.toggleShuffle()">
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
        <span class="player-widget__time">{{ isLoadingStream ? '--:--' : formatTime(currentTime) }}</span>
        <input 
          type="range" 
          class="player-widget__seek" 
          :min="0" 
          :max="duration || 100" 
          :value="currentTime" 
          :style="progressStyle" 
          :disabled="isLoadingStream || !duration"
          @input="seek"
        />
        <span class="player-widget__time">{{ isLoadingStream ? '--:--' : formatTime(duration) }}</span>
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
        :style="volumeStyle" 
        @input="changeVolume"
      />
      <button class="player-btn player-btn--close" aria-label="Close Player" @click="playerStore.closePlayer()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  </div>
</template>

<style scoped src="./MusicPlayerWidget.css"></style>
