<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/core/app/layouts/AppLayout.vue'
import { APP_NAME } from '@/core/app/config/app.config'
import { albumApi } from '../api/album.api'
import type { Song } from '../types/song.types'
import { usePlayerStore } from '../store/player.store'
import { storeToRefs } from 'pinia'
import { useTitle } from '@/core/shared/composables/useTitle'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const { currentSong, isPlaying } = storeToRefs(playerStore)

const songs = ref<Song[]>([])
const totalSongs = ref(0)
const isLoading = ref(true)
const error = ref<string | null>(null)

const type = route.params.type as string
const id = Number(route.params.id)

const stateAlbumName = history.state?.albumName as string | undefined
const stateArtistName = history.state?.artistName as string | undefined

const isStickyVisible = ref(false)
let scrollHandler: (() => void) | null = null

useTitle(() => {
  if (currentSong.value) {
    return `${currentSong.value.title} • ${currentSong.value.artist}`
  } else if (stateAlbumName) {
    return stateArtistName ? `${stateAlbumName} • ${stateArtistName}` : stateAlbumName
  } else if (songs.value.length > 0) {
    const firstSong = songs.value[0]
    return `${firstSong.album} • ${firstSong.artist}`
  }
  return APP_NAME
})

onMounted(async () => {
  scrollHandler = () => {
    // Show sticky title when scrolled down past the header (e.g., 80px)
    isStickyVisible.value = window.scrollY > 80
  }
  
  window.addEventListener('scroll', scrollHandler, { passive: true })
  
  if (!type || !id) {
    error.value = 'Invalid album parameters'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    const response = await albumApi.getSongs(type, id)
    songs.value = response.data.data || []
    // TODO: Jika API sudah mendukung pagination, ganti 'any' dengan tipe meta API Anda
    // Saat ini fallback ke array length jika 'total' belum ada di response backend
    totalSongs.value = (response.data as any).total || songs.value.length
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Gagal memuat data'
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler)
  }
})

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

const resolveQualityBadge = (song: Song) => {
  if (song.codec_name?.toLowerCase() === 'alac') return '/assets/images/badge-alac.png'

  const sampleRate = Number.parseFloat(song.sample_rate)
  if (sampleRate >= 96) return '/assets/images/badge-en-hires.png'
  if (sampleRate > 0 && song.music_quality?.toLowerCase() === 'lossless') return '/assets/images/badge-en-lossless.png'
  return undefined
}

const handleCoverError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img.dataset.fallbackApplied) return
  img.dataset.fallbackApplied = 'true'
  img.src = DEFAULT_COVER
}

const goBack = () => {
  router.back()
}

const playSong = (song: Song) => {
  if (song.codec_name?.toLowerCase() === 'alac') {
    alert('Format ALAC tidak dapat diputar karena masalah kompatibilitas browser.')
    return
  }

  if (currentSong.value?.id_music === song.id_music) {
    playerStore.togglePlayback()
    return
  }

  playerStore.playSong(song, songs.value, { type, id: Number(id) })
}

const albumCovers = computed<string[]>(() => {
  if (songs.value.length === 0) return []

  if (['playlist', 'category'].includes(type)) {
    const covers = new Set<string>()
    for (const song of songs.value) {
      if (song.cover) {
        covers.add(resolveCoverUrl(song.cover))
      }
      if (covers.size === 4) break
    }
    
    const coverUrls = Array.from(covers)
    // Jika tidak genap 4 cover unik, gunakan cover urutan terakhir (index terbesar)
    // Sesuai dengan logika getCoverUrls di Dashboard: coverUrls.length < 4 ? coverUrls.slice(-1) : coverUrls
    return coverUrls.length < 4 && coverUrls.length > 0 ? coverUrls.slice(-1) : coverUrls
  }
  
  if (songs.value[0].cover) {
    return [resolveCoverUrl(songs.value[0].cover)]
  }
  return [DEFAULT_COVER]
})

const albumCover = computed(() => {
  if (albumCovers.value.length > 0) {
    return albumCovers.value[0]
  }
  return DEFAULT_COVER
})

const albumType = computed(() => {
  return type === 'playlist' ? 'Playlist' : 'Album'
})

const displayAlbumName = computed(() => {
  return stateAlbumName || (songs.value.length > 0 ? songs.value[0].album : 'Unknown')
})

const displayArtistName = computed(() => {
  return stateArtistName || (songs.value.length > 0 ? songs.value[0].artist : 'Unknown Artist')
})

const headerStyle = computed(() => {
  const bg = songs.value.length > 0 && songs.value[0].bg_color ? songs.value[0].bg_color : '#3b3b3b'
  return {
    background: `linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.7) 100%), ${bg}`
  }
})

const stickyNavBackground = computed(() => {
  const bg = songs.value.length > 0 && songs.value[0].bg_color ? songs.value[0].bg_color : '#3b3b3b'
  return `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), ${bg}`
})

</script>

<template>
  <AppLayout :overrideBrand="isStickyVisible" :navBackground="isStickyVisible ? stickyNavBackground : undefined">
    <template #nav-brand>
      <div class="album-page__sticky-brand">
        <button class="album-page__back-btn album-page__back-btn--sticky" aria-label="Go back" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div class="album-page__sticky-title">
          {{ stateAlbumName }}
        </div>
      </div>
    </template>

    <div class="album-page">
      <div class="album-page__hero" :style="headerStyle">
        <div class="album-page__hero-topbar">
          <button class="album-page__back-btn album-page__back-btn--hero" aria-label="Go back" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        </div>
        <div class="album-page__hero-content">
          <div class="album-page__hero-cover-wrapper">
            <div v-if="albumCovers.length === 4" class="album-page__hero-cover-grid">
              <img v-for="(coverUrl, index) in albumCovers" :key="`hero-grid-${index}`" v-img-cache="coverUrl" :alt="`Cover ${index + 1}`" @error="handleCoverError" />
            </div>
            <img v-else v-img-cache="albumCover" alt="Album Cover" class="album-page__hero-cover" @error="handleCoverError" />
          </div>
          <div class="album-page__hero-details">
            <span class="album-page__hero-type">{{ albumType }}</span>
            <h1 class="album-page__hero-title">{{ displayAlbumName }}</h1>
            <div class="album-page__hero-meta">
              <div class="album-page__hero-artist-avatar-wrapper">
                <img v-img-cache="albumCover" alt="Artist" class="album-page__hero-artist-avatar" @error="handleCoverError" />
              </div>
              <span class="album-page__hero-artist">{{ displayArtistName }}</span>
              <span class="album-page__hero-dot">•</span>
              <span class="album-page__hero-tracks">{{ totalSongs }} lagu</span>
            </div>
          </div>
        </div>
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
                <div class="song-list__cover-wrapper" @click="playSong(song)" :title="song.codec_name?.toLowerCase() === 'alac' ? 'Format ALAC tidak dapat diputar' : ''" :style="song.codec_name?.toLowerCase() === 'alac' ? 'cursor: not-allowed; opacity: 0.7;' : ''">
                  <div class="song-list__cover-surface">
                    <img v-if="resolveCoverUrl(song.cover)" v-img-cache="resolveCoverUrl(song.cover)" :alt="song.title" class="song-list__cover" loading="lazy" @error="handleCoverError" />
                    <div v-else class="song-list__cover-placeholder">
                      <img v-img-cache="DEFAULT_COVER" :alt="song.title" class="song-list__cover" />
                    </div>
                    <div class="song-list__play-overlay" :class="{ 'song-list__play-overlay--active': currentSong?.id_music === song.id_music && isPlaying, 'song-list__play-overlay--disabled': song.codec_name?.toLowerCase() === 'alac' }">
                      <svg v-if="currentSong?.id_music === song.id_music && isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      <svg v-else-if="song.codec_name?.toLowerCase() === 'alac'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                      <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  <img v-if="resolveQualityBadge(song)" v-img-cache="resolveQualityBadge(song)" :alt="`${song.codec_name} quality badge`" class="song-list__quality-badge" />
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
