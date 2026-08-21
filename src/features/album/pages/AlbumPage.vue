<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/app/layouts/AppLayout.vue'
import { albumApi } from '../api/album.api'
import type { Song } from '../types/song.types'
import MusicPlayerWidget from '../components/MusicPlayerWidget.vue'

const route = useRoute()
const router = useRouter()

const songs = ref<Song[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const currentSong = ref<Song | null>(null)

const type = route.params.type as string
const id = Number(route.params.id)

onMounted(async () => {
  if (!type || !id) {
    error.value = 'Invalid album parameters'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    const response = await albumApi.getSongs(type, id)
    songs.value = response.data.data || []
  } catch (err: any) {
    error.value = err.message || 'Gagal memuat data'
  } finally {
    isLoading.value = false
  }
})

const resolveCoverUrl = (cover: string | null) => {
  if (!cover) return ''
  if (cover.startsWith('http') || cover.startsWith('data:')) return cover
  return `https://${cover}`
}

const goBack = () => {
  router.back()
}

const playSong = (song: Song) => {
  currentSong.value = song
}

const playNext = () => {
  if (!currentSong.value) return
  const idx = songs.value.findIndex(s => s.id_music === currentSong.value?.id_music)
  if (idx !== -1 && idx < songs.value.length - 1) {
    currentSong.value = songs.value[idx + 1]
  }
}

const playPrev = () => {
  if (!currentSong.value) return
  const idx = songs.value.findIndex(s => s.id_music === currentSong.value?.id_music)
  if (idx > 0) {
    currentSong.value = songs.value[idx - 1]
  }
}
</script>

<template>
  <AppLayout>
    <div class="album-page">
      <div class="album-page__header">
        <button class="album-page__back-btn" @click="goBack" aria-label="Go back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="album-page__title">Detail Page</h1>
      </div>

      <div v-if="isLoading" class="album-page__state">
        <svg class="album-page__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        Memuat lagu...
      </div>

      <div v-else-if="error" class="album-page__state album-page__state--error">
        {{ error }}
      </div>

      <div v-else-if="songs.length === 0" class="album-page__state">
        Belum ada lagu.
      </div>

      <div v-else class="album-page__content">
        <table class="song-list">
          <thead>
            <tr>
              <th class="song-list__th song-list__th--index">#</th>
              <th class="song-list__th song-list__th--title">Judul</th>
              <th class="song-list__th song-list__th--artist">Artis</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(song, index) in songs" :key="song.id_music" class="song-list__tr">
              <td class="song-list__td song-list__td--index">{{ index + 1 }}</td>
              <td class="song-list__td song-list__td--title-cover">
                <div class="song-list__cover-wrapper" @click="playSong(song)">
                  <img v-if="resolveCoverUrl(song.cover)" :src="resolveCoverUrl(song.cover)" :alt="song.title" class="song-list__cover" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                  <div v-else class="song-list__cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                  </div>
                  <div class="song-list__play-overlay" :class="{ 'song-list__play-overlay--active': currentSong?.id_music === song.id_music }">
                    <svg v-if="currentSong?.id_music === song.id_music" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                <span class="song-list__title" :class="{ 'song-list__title--active': currentSong?.id_music === song.id_music }">{{ song.title }}</span>
              </td>
              <td class="song-list__td song-list__td--artist">{{ song.artist }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <MusicPlayerWidget 
      :song="currentSong" 
      @close="currentSong = null" 
      @next="playNext" 
      @prev="playPrev" 
    />
  </AppLayout>
</template>

<style scoped>
.album-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.album-page__header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.album-page__back-btn {
  background: transparent;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: background-color 0.2s;
}

.album-page__back-btn:hover {
  background-color: var(--color-surface-raised);
}

.album-page__back-btn svg {
  width: 1.5rem;
  height: 1.5rem;
}

.album-page__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.02em;
}

.album-page__state {
  padding: 3rem;
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.album-page__spinner {
  width: 2rem;
  height: 2rem;
  animation: spin 2s linear infinite;
  color: var(--color-primary);
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.album-page__state--error {
  color: #ef4444;
  border-color: #ef4444;
}

.album-page__content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.song-list {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.song-list__th {
  padding: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-raised);
}

.song-list__th--index {
  width: 4rem;
  text-align: center;
}

.song-list__tr {
  transition: background-color 0.2s;
}

.song-list__tr:hover {
  background-color: var(--color-surface-raised);
}

.song-list__tr:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.song-list__td {
  padding: 1rem;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.song-list__td--index {
  text-align: center;
  color: var(--color-text-muted);
}

.song-list__td--title-cover {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.song-list__cover-wrapper {
  position: relative;
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background-color: var(--color-surface-raised);
  flex-shrink: 0;
  cursor: pointer;
}

.song-list__play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: #fff;
}

.song-list__cover-wrapper:hover .song-list__play-overlay,
.song-list__play-overlay--active {
  opacity: 1;
}

.song-list__play-overlay svg {
  width: 1.5rem;
  height: 1.5rem;
}

.song-list__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-list__cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
}

.song-list__cover-placeholder svg {
  width: 1.5rem;
  height: 1.5rem;
}

.song-list__title {
  font-weight: 500;
  transition: color 0.2s;
}

.song-list__title--active {
  color: var(--color-primary, #10b981);
}

.song-list__td--artist {
  color: var(--color-text-muted);
}
</style>
