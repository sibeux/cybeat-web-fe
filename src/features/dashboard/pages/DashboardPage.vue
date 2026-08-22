<script setup lang="ts">
  import { onMounted, watch, watchEffect } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { APP_NAME } from '@/core/app/config/app.config'
  import { useAuthStore } from '@/features/auth/index'
  import { usePlayerStore } from '@/features/album/store/player.store'
  import { useDashboardStore } from '../store/dashboard.store'

  const authStore = useAuthStore()
  const router = useRouter()
  const playerStore = usePlayerStore()
  const dashboardStore = useDashboardStore()
  
  const { albums, categories, playlists, isLoading, error } = storeToRefs(dashboardStore)
  const { currentAlbum, currentSong } = storeToRefs(playerStore)

  watchEffect(() => {
    document.title = currentSong.value
      ? `${currentSong.value.title} • ${currentSong.value.artist}`
      : APP_NAME
  })

  onMounted(async () => {
    await dashboardStore.fetchDashboardData()
  })

  watch(() => authStore.isAuthenticated, async () => {
    await dashboardStore.fetchDashboardData(true)
  })

  const resolveCoverUrl = (cover: unknown) => {
    if (typeof cover !== 'string' || !cover) return ''
    if (cover.startsWith('http') || cover.startsWith('data:')) return cover
    return `https://${cover}`
  }

  const getCoverUrls = (item: any): string[] => {
    const cover = item.cover
    if (!cover || typeof cover !== 'object' || !['category', 'playlist'].includes(item.type)) {
      const url = resolveCoverUrl(cover)
      return url ? [url] : []
    }

    const coverUrls = [cover.cover_1, cover.cover_2, cover.cover_3, cover.cover_4]
      .map(resolveCoverUrl)
      .filter((url): url is string => Boolean(url))

    return coverUrls.length === 4 ? coverUrls : coverUrls.slice(-1)
  }

  const goToAlbum = (item: any) => {
    if (!item.type || !item.id) return
    router.push({ 
      name: 'album', 
      params: { type: item.type, id: item.id },
      state: { albumName: item.title, artistName: item.author || '' }
    })
  }

  const isPlayingAlbum = (item: any) => {
    return currentAlbum.value?.type === item.type && currentAlbum.value?.id === item.id
  }
</script>

<template>
  <AppLayout>
    <div class="dashboard">
      <div class="dashboard__welcome">
        <div class="dashboard__welcome-icon" aria-hidden="true">👋</div>
        <div>
          <h1 class="dashboard__title">
            Selamat datang<template v-if="authStore.user?.name">, {{ authStore.user.name }}</template><template v-else> di Cybeat</template>!
          </h1>
          <p class="dashboard__subtitle">
            <template v-if="authStore.isAuthenticated">
              Anda berhasil masuk ke Cybeat. Dashboard sedang dalam pengembangan.
            </template>
            <template v-else>
              Silakan masuk untuk mengakses fitur penuh Cybeat. Dashboard sedang dalam pengembangan.
            </template>
          </p>
        </div>
      </div>

      <div class="dashboard__cards">
        <div class="dashboard__card">
          <div class="dashboard__card-icon dashboard__card-icon--blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div class="dashboard__card-content">
            <span class="dashboard__card-label">Proyek</span>
            <span class="dashboard__card-value">—</span>
          </div>
        </div>

        <div class="dashboard__card">
          <div class="dashboard__card-icon dashboard__card-icon--purple" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div class="dashboard__card-content">
            <span class="dashboard__card-label">Anggota Tim</span>
            <span class="dashboard__card-value">—</span>
          </div>
        </div>

        <div class="dashboard__card">
          <div class="dashboard__card-icon dashboard__card-icon--green" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div class="dashboard__card-content">
            <span class="dashboard__card-label">Aktivitas</span>
            <span class="dashboard__card-value">—</span>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="dashboard__loading">
        <svg class="dashboard__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        Memuat data...
      </div>
      <div v-else-if="error" class="dashboard__error">
        {{ error }}
      </div>
      <template v-else>
        <!-- Kategori Section -->
        <div class="dashboard__albums-section" v-if="categories.length > 0">
          <h2 class="dashboard__section-title">Kategori</h2>
          <div class="dashboard__album-grid">
            <div v-for="item in categories" :key="item.id" class="dashboard__album-card" :class="{ 'dashboard__album-card--playing': isPlayingAlbum(item) }" @click="goToAlbum(item)">
              <div class="dashboard__album-cover" :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }">
                <div v-if="getCoverUrls(item).length === 4" class="dashboard__album-cover-grid">
                  <img v-for="(coverUrl, index) in getCoverUrls(item)" :key="`${item.id}-cover-${index}`" :src="coverUrl" :alt="`${item.title} cover ${index + 1}`" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                </div>
                <img v-else-if="getCoverUrls(item).length" :src="getCoverUrls(item)[0]" :alt="item.title" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <div v-else class="dashboard__album-cover-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </div>
                <div v-if="isPlayingAlbum(item)" class="dashboard__album-playing-indicator" aria-label="Sedang diputar">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div class="dashboard__album-info">
                <h3 class="dashboard__album-title" :class="{ 'dashboard__album-title--playing': isPlayingAlbum(item) }" :title="item.title">{{ item.title }}</h3>
                <p v-if="item.author" class="dashboard__album-artist" :class="{ 'dashboard__album-artist--playing': isPlayingAlbum(item) }">Author: {{ item.author }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Album Section -->
        <div class="dashboard__albums-section" v-if="albums.length > 0">
          <h2 class="dashboard__section-title">Album Terbaru</h2>
          <div class="dashboard__album-grid">
            <div v-for="item in albums" :key="item.id" class="dashboard__album-card" :class="{ 'dashboard__album-card--playing': isPlayingAlbum(item) }" @click="goToAlbum(item)">
              <div class="dashboard__album-cover" :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }">
                <div v-if="getCoverUrls(item).length === 4" class="dashboard__album-cover-grid">
                  <img v-for="(coverUrl, index) in getCoverUrls(item)" :key="`${item.id}-cover-${index}`" :src="coverUrl" :alt="`${item.title} cover ${index + 1}`" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                </div>
                <img v-else-if="getCoverUrls(item).length" :src="getCoverUrls(item)[0]" :alt="item.title" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <div v-else class="dashboard__album-cover-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </div>
                <div v-if="isPlayingAlbum(item)" class="dashboard__album-playing-indicator" aria-label="Sedang diputar">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div class="dashboard__album-info">
                <h3 class="dashboard__album-title" :class="{ 'dashboard__album-title--playing': isPlayingAlbum(item) }" :title="item.title">{{ item.title }}</h3>
                <p class="dashboard__album-artist" :class="{ 'dashboard__album-artist--playing': isPlayingAlbum(item) }" :title="item.author">{{ item.author }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Playlist Section -->
        <div class="dashboard__albums-section" v-if="playlists.length > 0">
          <h2 class="dashboard__section-title">Playlist</h2>
          <div class="dashboard__album-grid">
            <div v-for="item in playlists" :key="item.id" class="dashboard__album-card" :class="{ 'dashboard__album-card--playing': isPlayingAlbum(item) }" @click="goToAlbum(item)">
              <div class="dashboard__album-cover" :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }">
                <div v-if="getCoverUrls(item).length === 4" class="dashboard__album-cover-grid">
                  <img v-for="(coverUrl, index) in getCoverUrls(item)" :key="`${item.id}-cover-${index}`" :src="coverUrl" :alt="`${item.title} cover ${index + 1}`" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                </div>
                <img v-else-if="getCoverUrls(item).length" :src="getCoverUrls(item)[0]" :alt="item.title" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <div v-else class="dashboard__album-cover-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </div>
                <div v-if="isPlayingAlbum(item)" class="dashboard__album-playing-indicator" aria-label="Sedang diputar">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div class="dashboard__album-info">
                <h3 class="dashboard__album-title" :class="{ 'dashboard__album-title--playing': isPlayingAlbum(item) }" :title="item.title">{{ item.title }}</h3>
                <p v-if="item.author" class="dashboard__album-artist" :class="{ 'dashboard__album-artist--playing': isPlayingAlbum(item) }" :title="item.author">{{ item.author }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped src="./DashboardPage.css"></style>
