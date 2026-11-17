<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizeError } from '@/core/shared/utils/error-normalizer'
import { artistApi } from '../api/artist.api'
import type { ArtistCatalogItem, ArtistSplitPreview } from '../types'
import { useArtistLookup } from '../composables/useArtistLookup'

const emit = defineEmits<{ changed: [] }>()

const source = ref<ArtistCatalogItem | null>(null)
const sourceQuery = ref('')
const targetNames = ref(['', ''])
const preview = ref<ArtistSplitPreview | null>(null)
const confirmationName = ref('')
const isPreviewing = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
let previewRequest = 0
const activeTargetIndex = ref<number | null>(null)
const {
  results: sourceResults, isSearching: isSearchingSource, error: sourceSearchError,
  search: searchSource, cancel: cancelSourceSearch,
} = useArtistLookup()
const {
  results: targetResults, isSearching: isSearchingTarget, error: targetSearchError,
  search: searchTarget, cancel: cancelTargetSearch,
} = useArtistLookup()

const sourceOptions = computed(() => sourceResults.value)
const canPreview = computed(() => {
  if (!source.value || isPreviewing.value || isSaving.value) return false
  const names = targetNames.value.map((name) => name.trim().toLocaleLowerCase())
  return names.length >= 2 && names.every((name) => !!name && name !== source.value?.name.toLocaleLowerCase()) && new Set(names).size === names.length
})
const canSave = computed(() => !!preview.value && confirmationName.value === preview.value.source.name && !isSaving.value)

function resetPreview() {
  previewRequest++
  preview.value = null
  confirmationName.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

function changeSource(event: Event) {
  sourceQuery.value = (event.target as HTMLInputElement).value
  source.value = null
  searchSource(sourceQuery.value)
  resetPreview()
}

function chooseSource(artist: ArtistCatalogItem) {
  source.value = artist
  sourceQuery.value = artist.name
  cancelSourceSearch()
  const parts = artist.name.split('・').map((name) => name.trim()).filter(Boolean)
  targetNames.value = parts.length >= 2 ? parts : ['', '']
  resetPreview()
}

function changeTarget(index: number, event: Event) {
  targetNames.value[index] = (event.target as HTMLInputElement).value
  activeTargetIndex.value = index
  searchTarget(targetNames.value[index])
  resetPreview()
}

function chooseTarget(index: number, artist: ArtistCatalogItem) {
  targetNames.value[index] = artist.name
  activeTargetIndex.value = null
  cancelTargetSearch()
  resetPreview()
}

function addTarget() {
  activeTargetIndex.value = null
  cancelTargetSearch()
  targetNames.value.push('')
  resetPreview()
}

function removeTarget(index: number) {
  if (targetNames.value.length <= 2) return
  targetNames.value.splice(index, 1)
  activeTargetIndex.value = null
  cancelTargetSearch()
  resetPreview()
}

async function previewSplit() {
  if (!canPreview.value || !source.value) return
  isPreviewing.value = true
  preview.value = null
  confirmationName.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  const request = ++previewRequest
  try {
    const { data } = await artistApi.previewSplit(source.value.id_artist, targetNames.value.map((name) => name.trim()))
    if (request === previewRequest) preview.value = data.data
  } catch (error) {
    if (request === previewRequest) errorMessage.value = normalizeError(error)
  } finally {
    isPreviewing.value = false
  }
}

async function saveSplit() {
  if (!canSave.value || !preview.value || !source.value) return
  isSaving.value = true
  errorMessage.value = ''
  try {
    const { data } = await artistApi.splitArtist({
      source_artist_id: source.value.id_artist,
      target_names: preview.value.targets.map((target) => target.name),
      confirm_source_name: confirmationName.value,
      expected_song_count: preview.value.song_count,
      expected_album_count: preview.value.albums.length,
      preview_token: preview.value.preview_token,
    })
    successMessage.value = `${data.data.song_count} lagu ditautkan ke ${data.data.targets.length} artis. ${data.data.album_count} kredit album diperbarui. Artis gabungan dihapus.`
    source.value = null
    sourceQuery.value = ''
    targetNames.value = ['', '']
    preview.value = null
    confirmationName.value = ''
    cancelSourceSearch()
    cancelTargetSearch()
    emit('changed')
  } catch (error) {
    errorMessage.value = normalizeError(error)
  } finally {
    isSaving.value = false
  }
}

</script>

<template>
    <section class="artist-merge artist-split">

      <div v-if="successMessage" class="artist-merge__notice artist-merge__notice--success" role="status">{{ successMessage }}</div>
      <div v-if="errorMessage" class="artist-merge__notice artist-merge__notice--error" role="alert">{{ errorMessage }}</div>
      <section class="artist-merge__card">
        <div class="artist-merge__card-heading">
          <div>
            <p class="artist-merge__eyebrow">PILIH DATA</p>
            <h2>Sumber dan artis tujuan</h2>
          </div>
          <p class="artist-merge__helper">Setiap lagu sumber akan tertaut ke semua artis tujuan.</p>
        </div>
        <div class="artist-split__fields">
          <div class="artist-merge__picker artist-split__source">
            <label for="split-source">Artis gabungan <span>pilih dari katalog</span></label>
            <div class="artist-merge__search-wrap">
              <input id="split-source" type="search" :value="sourceQuery" placeholder="Cari artis gabungan" autocomplete="off" :disabled="isSaving || isPreviewing" @input="changeSource">
              <div v-if="!source && sourceQuery.trim()" class="artist-merge__options" role="listbox" aria-label="Hasil artis sumber">
                <div v-if="isSearchingSource" class="artist-merge__option-skeleton" role="status" aria-label="Mencari artis"><span v-for="row in 3" :key="row"></span></div>
                <div v-else-if="sourceSearchError" class="artist-merge__option-empty">{{ sourceSearchError }}</div>
                <template v-else><button v-for="artist in sourceOptions" :key="artist.id_artist" type="button" role="option" @click="chooseSource(artist)"><span>{{ artist.name }}</span><small>{{ artist.song_count }} lagu</small></button><div v-if="!sourceOptions.length" class="artist-merge__option-empty">Artis tidak ditemukan.</div></template>
              </div>
            </div>
            <div v-if="source" class="artist-merge__selected"><div><strong>{{ source.name }}</strong><span>{{ source.song_count }} lagu tertaut</span></div><button type="button" :disabled="isSaving || isPreviewing" @click="source = null; sourceQuery = ''; resetPreview()">Ganti</button></div>
          </div>
          <div v-for="(targetName, index) in targetNames" :key="index" class="artist-merge__picker">
            <label :for="`split-target-${index}`">Artis tujuan {{ index + 1 }} <span>artis yang sudah ada akan dipakai; nama baru akan dibuat</span></label>
            <div class="artist-split__target-input">
              <div class="artist-merge__search-wrap">
                <input :id="`split-target-${index}`" type="text" :value="targetName" maxlength="255" autocomplete="off" :disabled="isSaving || isPreviewing" :placeholder="`Nama artis tujuan ${index + 1}`" @input="changeTarget(index, $event)">
                <div v-if="activeTargetIndex === index && targetName.trim()" class="artist-merge__options" role="listbox" :aria-label="`Hasil artis tujuan ${index + 1}`">
                  <div v-if="isSearchingTarget" class="artist-merge__option-skeleton" role="status" aria-label="Mencari artis"><span v-for="row in 3" :key="row"></span></div>
                  <div v-else-if="targetSearchError" class="artist-merge__option-empty">{{ targetSearchError }}</div>
                  <template v-else><button v-for="artist in targetResults" :key="artist.id_artist" type="button" role="option" @click="chooseTarget(index, artist)"><span>{{ artist.name }}</span><small>{{ artist.song_count }} lagu</small></button><div v-if="!targetResults.length" class="artist-merge__option-empty">Nama baru akan dibuat saat disimpan.</div></template>
                </div>
              </div>
              <button v-if="targetNames.length > 2" type="button" :disabled="isSaving || isPreviewing" :aria-label="`Hapus artis tujuan ${index + 1}`" @click="removeTarget(index)">Hapus</button>
            </div>
          </div>
        </div>
        <button class="artist-split__add" type="button" :disabled="isSaving || isPreviewing" @click="addTarget">+ Tambah artis tujuan</button>
        <div class="artist-merge__card-footer">
          <span>Teks kredit asli pada lagu tetap tersimpan.</span>
          <button class="artist-merge__primary" type="button" :disabled="!canPreview" @click="previewSplit">{{ isPreviewing ? 'Memuat…' : 'Pratinjau split' }}</button>
        </div>
      </section>

      <section v-if="isPreviewing" class="artist-merge__preview artist-merge__preview--loading" role="status" aria-label="Memuat pratinjau split"><div class="artist-merge__preview-skeleton"><span></span><span></span><span></span></div></section>
      <section v-if="preview" class="artist-merge__preview">
        <div class="artist-merge__preview-heading"><div><p class="artist-merge__eyebrow">PRATINJAU</p><h2>{{ preview.source.name }} → {{ preview.targets.map((target) => target.name).join(' + ') }}</h2></div><span class="artist-merge__preview-badge">Periksa sebelum lanjut</span></div>
        <div class="artist-split__summary">
          <div><strong>{{ preview.song_count }}</strong><span>lagu akan ditautkan ke masing-masing dari {{ preview.targets.length }} artis</span></div>
          <div><strong>{{ preview.albums.length }}</strong><span>kredit album akan diperbarui</span></div>
        </div>
        <p class="artist-split__targets"><span v-for="target in preview.targets" :key="target.name">{{ target.name }} <small>{{ target.is_new ? 'dibuat baru' : 'sudah ada' }}</small></span></p>
        <div class="artist-merge__warning">Semua lagu sumber akan ditautkan ke <strong>semua {{ preview.targets.length }} artis tujuan</strong>. Artis gabungan beserta tautan lamanya akan dihapus setelah relasi baru lengkap.</div>
        <div v-if="preview.song_sample.length" class="artist-split__list"><strong>Contoh lagu {{ preview.song_sample.length }} dari {{ preview.song_count }}</strong><ul><li v-for="song in preview.song_sample" :key="song.id_music">{{ song.title }}</li></ul></div>
        <div v-if="preview.albums.length" class="artist-split__list"><strong>Kredit album yang berubah</strong><ul><li v-for="album in preview.albums" :key="album.id"><b>{{ album.name }}</b>: {{ album.author_before }} → {{ album.author_after }}</li></ul></div>
        <div class="artist-merge__confirm"><label for="split-confirm">Ketik nama artis gabungan untuk mengonfirmasi</label><input id="split-confirm" v-model="confirmationName" type="text" :placeholder="preview.source.name" autocomplete="off" :disabled="isSaving"><button class="artist-merge__danger" type="button" :disabled="!canSave" @click="saveSplit">{{ isSaving ? 'Menyimpan…' : 'Pisahkan dan hapus artis gabungan' }}</button></div>
      </section>
    </section>
</template>

<style scoped>
.artist-split { width: 100%; max-width: none; margin: 0; padding: 0; }
.artist-split__fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
.artist-split__source { grid-column: 1 / -1; max-width: 35rem; margin-bottom: .35rem; }
.artist-split__fields > .artist-merge__picker:not(.artist-split__source) { padding: .9rem; border: 1px solid var(--color-border); border-radius: .8rem; background: var(--color-surface-raised); }
.artist-split__target-input { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .45rem; }
.artist-split__target-input button, .artist-split__add { padding: .45rem .65rem; border: 1px solid var(--color-border); border-radius: .65rem; background: var(--color-surface); color: var(--color-text-muted); font: inherit; font-size: .75rem; cursor: pointer; }
.artist-split__target-input button:hover, .artist-split__add:hover { border-color: var(--color-primary); color: var(--color-primary); }
.artist-split__add { width: 100%; margin-top: .85rem; padding: .8rem; border-style: dashed; background: var(--color-primary-subtle); color: var(--color-primary); font-weight: 700; }
.artist-split__target-input button:disabled, .artist-split__add:disabled { opacity: .5; cursor: not-allowed; }
.artist-split__summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; margin-top: 1rem; }
.artist-split__summary > div { display: flex; flex-direction: column; gap: .2rem; padding: .95rem; border: 1px solid var(--color-border); border-radius: .75rem; background: var(--color-surface-raised); }
.artist-split__summary strong { font-size: 1.2rem; }
.artist-split__summary span, .artist-split__targets small { color: var(--color-text-muted); font-size: .75rem; }
.artist-split__targets { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1rem 0; }
.artist-split__targets > span { display: flex; gap: .4rem; padding: .5rem .7rem; border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--color-border)); border-radius: 999px; background: var(--color-primary-subtle); color: var(--color-text); font-size: .8rem; }
.artist-split__list { margin-top: 1rem; color: var(--color-text-muted); font-size: .8rem; }
.artist-split__list > strong { color: var(--color-text); }
.artist-split__list ul { max-height: 12rem; overflow: auto; margin: .4rem 0 0; padding-left: 1.25rem; }
.artist-split__list li { padding: .16rem 0; overflow-wrap: anywhere; }
@media (max-width: 760px) { .artist-split__fields { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .artist-split__summary { grid-template-columns: 1fr; } }
</style>
