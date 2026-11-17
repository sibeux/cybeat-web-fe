<script setup lang="ts">
import { computed, ref } from 'vue'
import { artistApi } from '../api/artist.api'
import { useArtistLookup } from '../composables/useArtistLookup'
import type { ArtistCatalogItem, ArtistEditPreview } from '../types'
import { artistError } from '../utils/artistError'

const emit = defineEmits<{ changed: [] }>()
const query = ref('')
const selected = ref<ArtistCatalogItem | null>(null)
const preview = ref<ArtistEditPreview | null>(null)
const newName = ref('')
const isLoadingPreview = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
let previewRequest = 0

const {
  results, isSearching, error: searchError,
  search, cancel: cancelSearch,
} = useArtistLookup()

const canSave = computed(() =>
  !!selected.value && !!preview.value && !isLoadingPreview.value && !isSaving.value &&
  !!newName.value.trim() && newName.value.trim() !== preview.value.artist.name &&
  newName.value.trim().length <= 255 && !newName.value.includes(','),
)

function changeQuery(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  selected.value = null
  preview.value = null
  newName.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  previewRequest++
  isLoadingPreview.value = false
  search(query.value)
}

async function chooseArtist(artist: ArtistCatalogItem) {
  selected.value = artist
  query.value = artist.name
  newName.value = artist.name
  preview.value = null
  errorMessage.value = ''
  successMessage.value = ''
  cancelSearch()
  const request = ++previewRequest
  isLoadingPreview.value = true
  try {
    const { data } = await artistApi.previewEdit(artist.id_artist)
    if (request === previewRequest) preview.value = data.data
  } catch (error) {
    if (request === previewRequest) errorMessage.value = artistError(error)
  } finally {
    if (request === previewRequest) isLoadingPreview.value = false
  }
}

function clearArtist() {
  previewRequest++
  selected.value = null
  preview.value = null
  query.value = ''
  newName.value = ''
  isLoadingPreview.value = false
  errorMessage.value = ''
  cancelSearch()
}

async function saveName() {
  if (!canSave.value || !selected.value || !preview.value) return
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { data } = await artistApi.editArtist({
      artist_id: selected.value.id_artist,
      name: newName.value.trim(),
      expected_name: preview.value.artist.name,
      preview_token: preview.value.preview_token,
    })
    successMessage.value = `Artist renamed to ${data.data.artist.name}. ${data.data.album_count} album credits updated.`
    selected.value = null
    preview.value = null
    query.value = ''
    newName.value = ''
    emit('changed')
  } catch (error) {
    errorMessage.value = artistError(error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="artist-merge artist-edit">
    <div v-if="successMessage" class="artist-merge__notice artist-merge__notice--success" role="status">{{ successMessage }}</div>
    <div v-if="errorMessage" class="artist-merge__notice artist-merge__notice--error" role="alert">{{ errorMessage }}</div>

    <section class="artist-merge__card artist-manage__tool-card" aria-labelledby="artist-edit-title">
      <div class="artist-merge__card-heading">
        <div><p class="artist-merge__eyebrow">EDIT ARTIST</p><h2 id="artist-edit-title">Update an artist name</h2></div>
        <p class="artist-merge__helper">Song links stay attached to the same artist record.</p>
      </div>

      <div class="artist-edit__form">
        <div class="artist-merge__picker">
          <label for="artist-edit-search">Find artist <span>search the catalog by name</span></label>
          <div class="artist-merge__search-wrap">
            <input id="artist-edit-search" type="search" :value="query" placeholder="Search artist" autocomplete="off" :disabled="isSaving" @input="changeQuery">
            <div v-if="!selected && query.trim()" class="artist-merge__options" role="listbox" aria-label="Artist search results">
              <div v-if="isSearching" class="artist-merge__option-skeleton" role="status" aria-label="Searching artists"><span v-for="row in 3" :key="row"></span></div>
              <div v-else-if="searchError" class="artist-merge__option-empty">{{ searchError }}</div>
              <template v-else><button v-for="artist in results" :key="artist.id_artist" type="button" role="option" @click="chooseArtist(artist)"><span>{{ artist.name }}</span><small>{{ artist.song_count }} songs</small></button><div v-if="!results.length" class="artist-merge__option-empty">No artists found.</div></template>
            </div>
          </div>
          <div v-if="selected" class="artist-merge__selected artist-merge__selected--target"><div><strong>{{ selected.name }}</strong><span>{{ selected.song_count }} linked songs</span></div><button type="button" :disabled="isSaving" @click="clearArtist">Change</button></div>
        </div>

        <div v-if="isLoadingPreview" class="artist-edit__loading" role="status" aria-label="Loading artist details"><span></span><span></span></div>
        <div v-else-if="preview" class="artist-edit__details">
          <div class="artist-merge__picker">
            <label for="artist-edit-name">New artist name <span>up to 255 characters; commas are not supported</span></label>
            <div class="artist-merge__search-wrap"><input id="artist-edit-name" v-model="newName" type="text" maxlength="255" autocomplete="off" :disabled="isSaving" placeholder="Enter new artist name"></div>
          </div>
          <div class="artist-edit__impact"><strong>{{ preview.albums.length }}</strong><span>album credits will update with this name</span></div>
        </div>
      </div>

      <div v-if="preview?.albums.length" class="artist-edit__albums"><strong>Affected albums</strong><ul><li v-for="album in preview.albums" :key="album.id">{{ album.name }}</li></ul></div>
      <div class="artist-merge__card-footer"><span>Original song credit text stays unchanged.</span><button class="artist-merge__primary" type="button" :disabled="!canSave" @click="saveName">{{ isSaving ? 'Saving…' : 'Save artist name' }}</button></div>
    </section>
  </section>
</template>

<style scoped>
.artist-edit { width: 100%; max-width: none; margin: 0; padding: 0; }
.artist-edit__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 1rem; }
.artist-edit__details { display: flex; flex-direction: column; gap: .75rem; }
.artist-edit__impact { display: flex; align-items: center; gap: .65rem; padding: .7rem .8rem; border: 1px solid var(--color-border); border-radius: .7rem; background: var(--color-surface-raised); color: var(--color-text-muted); font-size: .76rem; }
.artist-edit__impact strong { color: var(--color-primary); font-size: 1.15rem; }
.artist-edit__albums { margin-top: 1rem; color: var(--color-text-muted); font-size: .78rem; }
.artist-edit__albums > strong { color: var(--color-text); }
.artist-edit__albums ul { display: flex; flex-wrap: wrap; gap: .4rem; margin: .55rem 0 0; padding: 0; list-style: none; }
.artist-edit__albums li { padding: .4rem .6rem; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface-raised); }
.artist-edit__loading { display: grid; gap: .75rem; padding: .8rem; }
.artist-edit__loading span { height: 1rem; border-radius: .4rem; background: linear-gradient(100deg, var(--color-surface-raised) 12%, color-mix(in srgb, var(--color-primary) 16%, var(--color-surface-raised)) 35%, var(--color-surface-raised) 60%); background-size: 220% 100%; animation: artist-edit-shimmer 1.2s ease-in-out infinite; }
.artist-edit__loading span:nth-child(2) { width: 75%; }
@keyframes artist-edit-shimmer { to { background-position-x: -220%; } }
@media (max-width: 700px) { .artist-edit__form { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .artist-edit__loading span { animation: none; } }
</style>
