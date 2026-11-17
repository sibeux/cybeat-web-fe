<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { useTitle } from '@/core/shared/composables/useTitle'
  import { artistError } from '../utils/artistError'
  import { artistApi } from '../api/artist.api'
  import ArtistSplitTool from './ArtistSplitTool.vue'
  import ArtistEditTool from './ArtistEditTool.vue'
  import { useArtistLookup } from '../composables/useArtistLookup'
  import type { ArtistCatalogItem, ArtistMergePreview } from '../types'

  useTitle(() => 'Manage artists')

  const router = useRouter()
  const route = useRoute()
  const activeTool = computed<'edit' | 'merge' | 'split'>(() =>
    route.query.tool === 'merge' || route.query.tool === 'split' ? route.query.tool : 'edit',
  )

  function setTool(tool: 'edit' | 'merge' | 'split'): void {
    void router.replace({ name: 'admin-artist-manage', query: tool === 'edit' ? {} : { tool } })
  }

  function handleArtistChanged(): void {
    sourceArtist.value = null
    targetArtist.value = null
    sourceQuery.value = ''
    targetQuery.value = ''
    preview.value = null
    confirmationName.value = ''
    successMessage.value = ''
    cancelSourceSearch()
    cancelTargetSearch()
  }
  const {
    results: sourceResults, isSearching: isSearchingSource, error: sourceSearchError,
    search: searchSource, cancel: cancelSourceSearch,
  } = useArtistLookup()
  const {
    results: targetResults, isSearching: isSearchingTarget, error: targetSearchError,
    search: searchTarget, cancel: cancelTargetSearch,
  } = useArtistLookup()
  const isLoadingPreview = ref(false)
  const isMerging = ref(false)
  const sourceArtist = ref<ArtistCatalogItem | null>(null)
  const targetArtist = ref<ArtistCatalogItem | null>(null)
  const sourceQuery = ref('')
  const targetQuery = ref('')
  const preview = ref<ArtistMergePreview | null>(null)
  const confirmationName = ref('')
  const errorMessage = ref('')
  const successMessage = ref('')

  const canPreview = computed(
    () =>
      !!sourceArtist.value &&
      !!targetArtist.value &&
      sourceArtist.value.id_artist !== targetArtist.value.id_artist &&
      !isLoadingPreview.value,
  )

  const confirmationMatches = computed(
    () => !!sourceArtist.value && confirmationName.value === sourceArtist.value.name,
  )

  const sourceOptions = computed(() => sourceResults.value.filter((artist) => artist.id_artist !== targetArtist.value?.id_artist))
  const targetOptions = computed(() => targetResults.value.filter((artist) => artist.id_artist !== sourceArtist.value?.id_artist))

  function goToDashboard(): void {
    void router.push({ name: 'dashboard' })
  }

  function updateQuery(which: 'source' | 'target', event: Event): void {
    const value = (event.target as HTMLInputElement).value
    if (which === 'source') {
      sourceQuery.value = value
      sourceArtist.value = null
      searchSource(value)
    } else {
      targetQuery.value = value
      targetArtist.value = null
      searchTarget(value)
    }
    preview.value = null
    confirmationName.value = ''
    successMessage.value = ''
    errorMessage.value = ''
  }

  function chooseArtist(which: 'source' | 'target', artist: ArtistCatalogItem): void {
    if (which === 'source') {
      sourceArtist.value = artist
      sourceQuery.value = artist.name
      cancelSourceSearch()
    } else {
      targetArtist.value = artist
      targetQuery.value = artist.name
      cancelTargetSearch()
    }
    preview.value = null
    confirmationName.value = ''
    successMessage.value = ''
    errorMessage.value = ''
  }

  function clearArtist(which: 'source' | 'target'): void {
    if (which === 'source') {
      sourceArtist.value = null
      sourceQuery.value = ''
      cancelSourceSearch()
    } else {
      targetArtist.value = null
      targetQuery.value = ''
      cancelTargetSearch()
    }
    preview.value = null
    confirmationName.value = ''
    successMessage.value = ''
    errorMessage.value = ''
  }

  async function previewMerge(): Promise<void> {
    if (!canPreview.value || !sourceArtist.value || !targetArtist.value) return

    isLoadingPreview.value = true
    preview.value = null
    confirmationName.value = ''
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const { data } = await artistApi.previewMerge(
        sourceArtist.value.id_artist,
        targetArtist.value.id_artist,
      )
      preview.value = data.data
    } catch (error) {
      errorMessage.value = artistError(error)
    } finally {
      isLoadingPreview.value = false
    }
  }

  async function mergeArtists(): Promise<void> {
    if (!preview.value || !sourceArtist.value || !targetArtist.value || !confirmationMatches.value) {
      return
    }

    isMerging.value = true
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const { data } = await artistApi.mergeArtists({
        source_artist_id: sourceArtist.value.id_artist,
        target_artist_id: targetArtist.value.id_artist,
        confirm_source_name: confirmationName.value,
      })
      successMessage.value = `${data.data.removed_artist.name} was merged into ${data.data.kept_artist.name}. ${data.data.moved_link_count} song links were moved.`
      sourceArtist.value = null
      targetArtist.value = null
      sourceQuery.value = ''
      targetQuery.value = ''
      preview.value = null
      confirmationName.value = ''
      cancelSourceSearch()
      cancelTargetSearch()
    } catch (error) {
      errorMessage.value = artistError(error)
    } finally {
      isMerging.value = false
    }
  }
</script>

<template>
  <AppLayout>
    <section class="artist-merge">
      <header class="artist-merge__header">
        <div class="artist-merge__heading">
          <button class="artist-merge__back" type="button" aria-label="Back to dashboard" @click="goToDashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <p class="artist-merge__eyebrow">ADMIN ARTIST TOOLS</p>
            <h1>Manage artists</h1>
            <p class="artist-merge__subtitle">Edit names, combine duplicates, and split shared credits in one place.</p>
          </div>
        </div>
        <div class="artist-merge__catalog-count"><span class="artist-merge__live-dot"></span><span>Search the catalog</span></div>
      </header>

      <div class="artist-manage__tabs" role="tablist" aria-label="Artist tools">
        <button id="artist-manage-edit-tab" type="button" role="tab" :aria-selected="activeTool === 'edit'" aria-controls="artist-manage-edit-panel" :class="{ 'artist-manage__tab--active': activeTool === 'edit' }" @click="setTool('edit')">Edit artist</button>
        <button id="artist-manage-merge-tab" type="button" role="tab" :aria-selected="activeTool === 'merge'" aria-controls="artist-manage-merge-panel" :class="{ 'artist-manage__tab--active': activeTool === 'merge' }" @click="setTool('merge')">Merge artists</button>
        <button id="artist-manage-split-tab" type="button" role="tab" :aria-selected="activeTool === 'split'" aria-controls="artist-manage-split-panel" :class="{ 'artist-manage__tab--active': activeTool === 'split' }" @click="setTool('split')">Split artist</button>
      </div>

      <div v-if="activeTool === 'edit'" id="artist-manage-edit-panel" role="tabpanel" aria-labelledby="artist-manage-edit-tab" class="artist-manage__panel">
        <ArtistEditTool @changed="handleArtistChanged" />
      </div>
      <div v-else-if="activeTool === 'merge'" id="artist-manage-merge-panel" role="tabpanel" aria-labelledby="artist-manage-merge-tab" class="artist-manage__panel">

      <div v-if="successMessage" class="artist-merge__notice artist-merge__notice--success" role="status">
        <span class="artist-merge__notice-icon" aria-hidden="true">✓</span>
        <span>{{ successMessage }}</span>
      </div>
      <div v-if="errorMessage" class="artist-merge__notice artist-merge__notice--error" role="alert">
        <span class="artist-merge__notice-icon" aria-hidden="true">!</span>
        <span>{{ errorMessage }}</span>
      </div>

        <section class="artist-merge__card artist-manage__tool-card" aria-labelledby="artist-merge-select-title">
          <div class="artist-merge__card-heading">
            <div>
              <p class="artist-merge__eyebrow">SELECT ARTISTS</p>
              <h2 id="artist-merge-select-title">Choose the source and destination</h2>
            </div>
            <p class="artist-merge__helper">The source is removed after its song links move to the destination.</p>
          </div>

          <div class="artist-merge__pickers">
            <div class="artist-merge__picker">
              <label for="artist-merge-source">Source artist <span>the record to merge and remove</span></label>
              <div class="artist-merge__search-wrap">
                <input
                  id="artist-merge-source"
                  type="search"
                  :value="sourceQuery"
                  placeholder="Search source artist"
                  autocomplete="off"
                  @input="updateQuery('source', $event)"
                />
                <div v-if="!sourceArtist && sourceQuery.trim()" class="artist-merge__options" role="listbox" aria-label="Source artist results">
                  <div v-if="isSearchingSource" class="artist-merge__option-skeleton" role="status" aria-label="Searching artists"><span v-for="row in 3" :key="row"></span></div>
                  <div v-else-if="sourceSearchError" class="artist-merge__option-empty">{{ sourceSearchError }}</div>
                  <template v-else><button v-for="artist in sourceOptions" :key="artist.id_artist" type="button" role="option" @click="chooseArtist('source', artist)"><span>{{ artist.name }}</span><small>{{ artist.song_count }} songs</small></button></template>
                  <div v-if="!isSearchingSource && !sourceSearchError && !sourceOptions.length" class="artist-merge__option-empty">No artists found.</div>
                </div>
              </div>
              <div v-if="sourceArtist" class="artist-merge__selected">
                <div><strong>{{ sourceArtist.name }}</strong><span>{{ sourceArtist.song_count }} linked songs</span></div>
                <button type="button" aria-label="Change source artist" @click="clearArtist('source')">Change</button>
              </div>
            </div>

            <div class="artist-merge__flow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            </div>

            <div class="artist-merge__picker">
              <label for="artist-merge-target">Destination artist <span>the record to keep</span></label>
              <div class="artist-merge__search-wrap">
                <input
                  id="artist-merge-target"
                  type="search"
                  :value="targetQuery"
                  placeholder="Search destination artist"
                  autocomplete="off"
                  @input="updateQuery('target', $event)"
                />
                <div v-if="!targetArtist && targetQuery.trim()" class="artist-merge__options" role="listbox" aria-label="Destination artist results">
                  <div v-if="isSearchingTarget" class="artist-merge__option-skeleton" role="status" aria-label="Searching artists"><span v-for="row in 3" :key="row"></span></div>
                  <div v-else-if="targetSearchError" class="artist-merge__option-empty">{{ targetSearchError }}</div>
                  <template v-else><button v-for="artist in targetOptions" :key="artist.id_artist" type="button" role="option" @click="chooseArtist('target', artist)"><span>{{ artist.name }}</span><small>{{ artist.song_count }} songs</small></button></template>
                  <div v-if="!isSearchingTarget && !targetSearchError && !targetOptions.length" class="artist-merge__option-empty">No artists found.</div>
                </div>
              </div>
              <div v-if="targetArtist" class="artist-merge__selected artist-merge__selected--target">
                <div><strong>{{ targetArtist.name }}</strong><span>{{ targetArtist.song_count }} linked songs</span></div>
                <button type="button" aria-label="Change destination artist" @click="clearArtist('target')">Change</button>
              </div>
            </div>
          </div>

          <p v-if="sourceArtist && targetArtist && sourceArtist.id_artist === targetArtist.id_artist" class="artist-merge__inline-error">
            Select two different artists.
          </p>
          <div class="artist-merge__card-footer">
            <span>Existing links on the destination artist stay intact.</span>
            <button class="artist-merge__primary" type="button" :disabled="!canPreview" @click="previewMerge">
              {{ isLoadingPreview ? 'Loading…' : 'Preview merge' }}
            </button>
          </div>
        </section>

        <section v-if="isLoadingPreview" class="artist-merge__preview artist-merge__preview--loading" role="status" aria-label="Loading merge preview"><div class="artist-merge__preview-skeleton"><span></span><span></span><span></span></div></section>
        <section v-if="preview" class="artist-merge__preview" aria-labelledby="artist-merge-preview-title">
          <div class="artist-merge__preview-heading">
            <div>
              <p class="artist-merge__eyebrow">PREVIEW</p>
              <h2 id="artist-merge-preview-title">{{ preview.source.name }} → {{ preview.target.name }}</h2>
            </div>
            <span class="artist-merge__preview-badge">Review before saving</span>
          </div>

          <div class="artist-merge__stats">
            <div><span>Source songs</span><strong>{{ preview.source.song_count }}</strong></div>
            <div><span>Destination songs</span><strong>{{ preview.target.song_count }}</strong></div>
            <div><span>Shared links</span><strong>{{ preview.shared_song_count }}</strong></div>
            <div class="artist-merge__stats-result"><span>Destination songs after merge</span><strong>{{ preview.result_song_count }}</strong></div>
          </div>

          <div class="artist-merge__warning">
            <strong>{{ preview.source.name }}</strong> will be removed. Existing destination links will be kept once.
          </div>

          <div class="artist-merge__confirm">
            <label for="artist-merge-confirm">Type the source artist name to confirm</label>
            <input id="artist-merge-confirm" v-model="confirmationName" type="text" :placeholder="preview.source.name" autocomplete="off" />
            <button class="artist-merge__danger" type="button" :disabled="!confirmationMatches || isMerging" @click="mergeArtists">
              {{ isMerging ? 'Merging…' : 'Merge and remove source' }}
            </button>
          </div>
        </section>
      </div>
      <div v-else id="artist-manage-split-panel" role="tabpanel" aria-labelledby="artist-manage-split-tab" class="artist-manage__panel">
        <ArtistSplitTool @changed="handleArtistChanged" />
      </div>
    </section>
  </AppLayout>
</template>

<style src="./ArtistMergePage.css"></style>
<style scoped>
.artist-manage__tabs { display: inline-flex; width: fit-content; max-width: 100%; gap: .25rem; padding: .3rem; border: 1px solid var(--color-border); border-radius: .8rem; background: var(--color-surface); box-shadow: 0 5px 20px rgb(0 0 0 / .07); }
.artist-manage__tabs button { min-width: 10rem; padding: .7rem 1.05rem; border: 0; border-radius: .55rem; background: transparent; color: var(--color-text-muted); font: inherit; font-size: .82rem; font-weight: 700; cursor: pointer; transition: background .15s ease, color .15s ease; }
.artist-manage__tabs button:hover, .artist-manage__tabs button:focus-visible { background: var(--color-surface-raised); color: var(--color-text); outline: none; }
.artist-manage__tabs .artist-manage__tab--active { background: var(--color-primary-subtle); color: var(--color-primary); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 20%, transparent); }
.artist-manage__panel { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }
@media (max-width: 520px) { .artist-manage__tabs { width: 100%; } .artist-manage__tabs button { min-width: 0; flex: 1; } }
</style>
