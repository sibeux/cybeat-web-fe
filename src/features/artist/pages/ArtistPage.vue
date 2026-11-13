<script setup lang="ts">
  import { computed, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { APP_NAME } from '@/core/app/config/app.config'
  import { useTitle } from '@/core/shared/composables/useTitle'
  import { artistApi } from '../api/artist.api'
  import type { ArtistAlbum, ArtistLink } from '../types'

  const route = useRoute()
  const router = useRouter()
  const artistId = computed(() => Number(route.params.id))
  const artist = ref<ArtistLink | null>(null)
  const albums = ref<ArtistAlbum[]>([])
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  let requestController: AbortController | null = null

  const DEFAULT_COVER = '/assets/images/placeholder_cover_music.png'

  useTitle(() => (artist.value ? `${artist.value.name} • Artist` : `Artist • ${APP_NAME}`))

  const loadArtist = async () => {
    requestController?.abort()
    requestController = new AbortController()
    artist.value = null
    albums.value = []
    error.value = null

    if (!Number.isInteger(artistId.value) || artistId.value <= 0) {
      error.value = 'Invalid artist ID.'
      isLoading.value = false
      return
    }

    isLoading.value = true
    try {
      const response = await artistApi.getArtist(artistId.value, requestController.signal)
      artist.value = response.data.data.artist
      albums.value = response.data.data.albums || []
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      error.value = err.response?.data?.message || err.message || 'Failed to load artist.'
    } finally {
      isLoading.value = false
    }
  }

  const openAlbum = (album: ArtistAlbum) => {
    void router.push({
      name: 'album',
      params: { type: 'album', id: album.id },
      state: {
        albumName: album.title,
        artistName: artist.value?.name || album.author || '',
      },
    })
  }

  const goBack = () => {
    void router.back()
  }

  const handleCoverError = (event: Event) => {
    const image = event.target as HTMLImageElement
    if (image.dataset.fallbackApplied) return
    image.dataset.fallbackApplied = 'true'
    image.src = DEFAULT_COVER
  }

  watch(artistId, () => void loadArtist(), { immediate: true })

  onUnmounted(() => {
    requestController?.abort()
  })
</script>

<template>
  <AppLayout>
    <main class="artist-page">
      <header class="artist-page__header">
        <button class="artist-page__back" type="button" @click="goBack">
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>
        <p class="artist-page__eyebrow">Artist</p>
        <h1 class="artist-page__title">{{ artist?.name || 'Artist' }}</h1>
        <p v-if="!isLoading && !error" class="artist-page__count">
          {{ albums.length }} {{ albums.length === 1 ? 'album' : 'albums' }}
        </p>
      </header>

      <div v-if="isLoading" class="artist-page__state" role="status">Loading albums…</div>
      <div v-else-if="error" class="artist-page__state artist-page__state--error" role="alert">
        {{ error }}
      </div>
      <div v-else-if="albums.length === 0" class="artist-page__state">
        No accessible albums found for this artist.
      </div>
      <section v-else class="artist-page__album-grid" aria-label="Artist albums">
        <button
          v-for="album in albums"
          :key="album.id"
          class="artist-page__album-card"
          type="button"
          @click="openAlbum(album)"
        >
          <span class="artist-page__album-cover" :style="{ backgroundColor: album.bg_color || undefined }">
            <img
              v-img-cache="album.cover || DEFAULT_COVER"
              :alt="`${album.title} cover`"
              loading="lazy"
              @error="handleCoverError"
            />
          </span>
          <span class="artist-page__album-title" :title="album.title">{{ album.title }}</span>
          <span class="artist-page__album-author" :title="album.author || artist?.name">
            {{ album.author || artist?.name }}
          </span>
        </button>
      </section>
    </main>
  </AppLayout>
</template>

<style scoped>
.artist-page {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 2rem);
  color: var(--color-text);
}

.artist-page__header {
  margin-bottom: 1.75rem;
}

.artist-page__back {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-muted, #a1a1aa);
  font: inherit;
  cursor: pointer;
}

.artist-page__back:hover {
  color: var(--color-text);
}

.artist-page__eyebrow {
  margin: 0 0 0.35rem;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.artist-page__title {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.1;
}

.artist-page__count {
  margin: 0.65rem 0 0;
  color: var(--color-text-muted, #a1a1aa);
}

.artist-page__state {
  padding: 3rem 1rem;
  border: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 1rem);
  color: var(--color-text-muted, #a1a1aa);
  text-align: center;
}

.artist-page__state--error {
  color: #f87171;
}

.artist-page__album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}

.artist-page__album-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.artist-page__album-cover {
  display: block;
  width: 100%;
  overflow: hidden;
  aspect-ratio: 1;
  border-radius: var(--radius-md, 0.75rem);
  background: var(--color-surface-raised, #252833);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.artist-page__album-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}

.artist-page__album-card:hover .artist-page__album-cover img {
  transform: scale(1.045);
}

.artist-page__album-title,
.artist-page__album-author {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-page__album-title {
  margin-top: 0.25rem;
  font-weight: 700;
}

.artist-page__album-author {
  color: var(--color-text-muted, #a1a1aa);
  font-size: 0.875rem;
}

.artist-page__album-card:focus-visible,
.artist-page__back:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}
</style>
