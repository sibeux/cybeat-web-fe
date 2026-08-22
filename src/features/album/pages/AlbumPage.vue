<script setup lang="ts">
import { ref, onMounted, watchEffect, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/core/app/layouts/AppLayout.vue'
import { albumApi } from '../api/album.api'
import type { Song } from '../types/song.types'
import { usePlayerStore } from '../store/player.store'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const { currentSong } = storeToRefs(playerStore)

const songs = ref<Song[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const type = route.params.type as string
const id = Number(route.params.id)

const originalTitle = document.title
const stateAlbumName = history.state?.albumName as string | undefined
const stateArtistName = history.state?.artistName as string | undefined

watchEffect(() => {
  if (currentSong.value) {
    document.title = `${currentSong.value.title} • ${currentSong.value.artist}`
  } else if (stateAlbumName) {
    document.title = stateArtistName ? `${stateAlbumName} • ${stateArtistName}` : stateAlbumName
  } else if (songs.value.length > 0) {
    const firstSong = songs.value[0]
    document.title = `${firstSong.album} • ${firstSong.artist}`
  } else {
    document.title = 'Cybeat'
  }
})

onUnmounted(() => {
  document.title = originalTitle
})

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
    error.value = err.response?.data?.message || err.message || 'Gagal memuat data'
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
  playerStore.playSong(song, songs.value, { type, id })
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
        <h1 class="album-page__title">{{ stateAlbumName }}</h1>
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
  </AppLayout>
</template>

<style scoped src="./AlbumPage.css"></style>
