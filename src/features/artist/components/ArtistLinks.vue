<script setup lang="ts">
  import type { ArtistLink } from '../types'

  withDefaults(
    defineProps<{
      artists?: ArtistLink[]
      fallback?: string
    }>(),
    {
      artists: () => [],
      fallback: '',
    },
  )
</script>

<template>
  <span class="artist-links">
    <template v-if="artists.length">
      <template v-for="(artist, index) in artists" :key="artist.id_artist">
        <span v-if="index > 0" class="artist-links__separator">, </span>
        <RouterLink
          class="artist-links__link"
          :to="{ name: 'artist', params: { id: artist.id_artist } }"
          @click.stop
        >
          {{ artist.name }}
        </RouterLink>
      </template>
    </template>
    <span v-else>{{ fallback || 'Unknown Artist' }}</span>
  </span>
</template>

<style scoped>
.artist-links {
  display: inline;
}

.artist-links__link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.artist-links__link:hover,
.artist-links__link:focus-visible {
  color: var(--color-primary);
  border-color: currentColor;
  outline: none;
}
</style>
