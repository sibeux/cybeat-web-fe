import { onUnmounted, ref } from 'vue'
import { artistApi } from '../api/artist.api'
import type { ArtistCatalogItem } from '../types'

export function useArtistLookup() {
  const results = ref<ArtistCatalogItem[]>([])
  const isSearching = ref(false)
  const error = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let request = 0

  function cancel() {
    request++
    if (timer) clearTimeout(timer)
    timer = null
    controller?.abort()
    controller = null
    results.value = []
    isSearching.value = false
    error.value = ''
  }

  function search(value: string) {
    cancel()
    const query = value.trim()
    if (!query) return

    isSearching.value = true
    const currentRequest = request
    timer = setTimeout(async () => {
      timer = null
      const activeController = new AbortController()
      controller = activeController
      try {
        const { data } = await artistApi.getAllArtists(query, activeController.signal)
        if (currentRequest === request) results.value = data.data.slice(0, 8)
      } catch (requestError) {
        if (currentRequest === request && !activeController.signal.aborted) {
          error.value = 'Search failed. Please try again.'
        }
      } finally {
        if (currentRequest === request) {
          isSearching.value = false
          controller = null
        }
      }
    }, 250)
  }

  onUnmounted(cancel)
  return { results, isSearching, error, search, cancel }
}
