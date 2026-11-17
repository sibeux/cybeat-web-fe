<script setup lang="ts">
  import { computed } from 'vue'
  import type { ArtistLink } from '../types'
  import { parseArtistCredits } from '../utils/parseArtistCredits'

  const props = withDefaults(
    defineProps<{
      artists?: ArtistLink[]
      fallback?: string
      preserveFallbackCredits?: boolean
    }>(),
    {
      artists: () => [],
      fallback: '',
      preserveFallbackCredits: false,
    },
  )

  const fallbackCredits = computed(() => {
    return props.preserveFallbackCredits ? parseArtistCredits(props.fallback, props.artists) : []
  })
</script>

<template>
  <span class="artist-links">
    <template v-if="fallbackCredits.length">
      <template v-for="(credit, index) in fallbackCredits" :key="`${credit.name}-${index}`">
        <span v-if="index > 0" class="artist-links__separator">, </span>
        <RouterLink v-if="credit.artist" class="artist-links__link" :to="{ name: 'artist', params: { id: credit.artist.id_artist } }" @click.stop>{{ credit.name }}</RouterLink>
        <span v-else>{{ credit.name }}</span>
      </template>
    </template>
    <template v-else-if="artists.length">
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
