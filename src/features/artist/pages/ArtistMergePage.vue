<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { useTitle } from '@/core/shared/composables/useTitle'
  import { normalizeError } from '@/core/shared/utils/error-normalizer'
  import { artistApi } from '../api/artist.api'
  import type { ArtistCatalogItem, ArtistMergePreview } from '../types'

  useTitle(() => 'Merge artists')

  const router = useRouter()
  const artists = ref<ArtistCatalogItem[]>([])
  const isLoadingArtists = ref(false)
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

  function searchArtists(query: string, excludedId?: number): ArtistCatalogItem[] {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return []

    return artists.value
      .filter(
        (artist) =>
          artist.id_artist !== excludedId && artist.name.toLocaleLowerCase().includes(normalized),
      )
      .slice(0, 8)
  }

  const sourceOptions = computed(() =>
    searchArtists(sourceQuery.value, targetArtist.value?.id_artist),
  )
  const targetOptions = computed(() =>
    searchArtists(targetQuery.value, sourceArtist.value?.id_artist),
  )

  async function loadArtists(): Promise<void> {
    isLoadingArtists.value = true
    errorMessage.value = ''
    try {
      const { data } = await artistApi.getAllArtists()
      artists.value = data.data
    } catch (error) {
      errorMessage.value = normalizeError(error)
    } finally {
      isLoadingArtists.value = false
    }
  }

  onMounted(() => {
    void loadArtists()
  })

  function goToDashboard(): void {
    void router.push({ name: 'dashboard' })
  }

  function updateQuery(which: 'source' | 'target', event: Event): void {
    const value = (event.target as HTMLInputElement).value
    if (which === 'source') {
      sourceQuery.value = value
      sourceArtist.value = null
    } else {
      targetQuery.value = value
      targetArtist.value = null
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
    } else {
      targetArtist.value = artist
      targetQuery.value = artist.name
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
    } else {
      targetArtist.value = null
      targetQuery.value = ''
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
      errorMessage.value = normalizeError(error)
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
      successMessage.value = `${data.data.removed_artist.name} digabung ke ${data.data.kept_artist.name}. ${data.data.moved_link_count} tautan lagu dipindahkan.`
      sourceArtist.value = null
      targetArtist.value = null
      sourceQuery.value = ''
      targetQuery.value = ''
      preview.value = null
      confirmationName.value = ''
      await loadArtists()
    } catch (error) {
      errorMessage.value = normalizeError(error)
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
          <button class="artist-merge__back" type="button" aria-label="Kembali ke dashboard" @click="goToDashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <p class="artist-merge__eyebrow">ADMIN ARTIST TOOLS</p>
            <h1>Gabungkan artis</h1>
            <p class="artist-merge__subtitle">Satukan dua data artis duplikat tanpa menggandakan tautan lagu.</p>
          </div>
        </div>
        <div class="artist-merge__catalog-count"><strong>{{ artists.length }}</strong><span>artis di katalog</span></div>
      </header>

      <div v-if="successMessage" class="artist-merge__notice artist-merge__notice--success" role="status">
        <span class="artist-merge__notice-icon" aria-hidden="true">✓</span>
        <span>{{ successMessage }}</span>
      </div>
      <div v-if="errorMessage" class="artist-merge__notice artist-merge__notice--error" role="alert">
        <span class="artist-merge__notice-icon" aria-hidden="true">!</span>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="isLoadingArtists" class="artist-merge__loading">Memuat katalog artis…</div>
      <div v-else-if="artists.length === 0 && !errorMessage" class="artist-merge__loading">
        Katalog artis kosong.
      </div>

      <template v-else-if="artists.length">
        <section class="artist-merge__card" aria-labelledby="artist-merge-select-title">
          <div class="artist-merge__card-heading">
            <div>
              <p class="artist-merge__eyebrow">PILIH DATA</p>
              <h2 id="artist-merge-select-title">Tentukan artis sumber dan tujuan</h2>
            </div>
            <p class="artist-merge__helper">Sumber akan dihapus setelah tautan lagunya dipindah.</p>
          </div>

          <div class="artist-merge__pickers">
            <div class="artist-merge__picker">
              <label for="artist-merge-source">Artis sumber <span>data yang akan digabung</span></label>
              <div class="artist-merge__search-wrap">
                <input
                  id="artist-merge-source"
                  type="search"
                  :value="sourceQuery"
                  placeholder="Cari nama artis sumber"
                  autocomplete="off"
                  @input="updateQuery('source', $event)"
                />
                <div v-if="!sourceArtist && sourceOptions.length" class="artist-merge__options" role="listbox" aria-label="Hasil artis sumber">
                  <button v-for="artist in sourceOptions" :key="artist.id_artist" type="button" role="option" @click="chooseArtist('source', artist)">
                    <span>{{ artist.name }}</span><small>{{ artist.song_count }} lagu</small>
                  </button>
                </div>
              </div>
              <div v-if="sourceArtist" class="artist-merge__selected">
                <div><strong>{{ sourceArtist.name }}</strong><span>{{ sourceArtist.song_count }} lagu tertaut</span></div>
                <button type="button" aria-label="Ganti artis sumber" @click="clearArtist('source')">Ganti</button>
              </div>
            </div>

            <div class="artist-merge__flow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            </div>

            <div class="artist-merge__picker">
              <label for="artist-merge-target">Artis tujuan <span>data yang dipertahankan</span></label>
              <div class="artist-merge__search-wrap">
                <input
                  id="artist-merge-target"
                  type="search"
                  :value="targetQuery"
                  placeholder="Cari nama artis tujuan"
                  autocomplete="off"
                  @input="updateQuery('target', $event)"
                />
                <div v-if="!targetArtist && targetOptions.length" class="artist-merge__options" role="listbox" aria-label="Hasil artis tujuan">
                  <button v-for="artist in targetOptions" :key="artist.id_artist" type="button" role="option" @click="chooseArtist('target', artist)">
                    <span>{{ artist.name }}</span><small>{{ artist.song_count }} lagu</small>
                  </button>
                </div>
              </div>
              <div v-if="targetArtist" class="artist-merge__selected artist-merge__selected--target">
                <div><strong>{{ targetArtist.name }}</strong><span>{{ targetArtist.song_count }} lagu tertaut</span></div>
                <button type="button" aria-label="Ganti artis tujuan" @click="clearArtist('target')">Ganti</button>
              </div>
            </div>
          </div>

          <p v-if="sourceArtist && targetArtist && sourceArtist.id_artist === targetArtist.id_artist" class="artist-merge__inline-error">
            Pilih dua artis yang berbeda.
          </p>
          <div class="artist-merge__card-footer">
            <span>Semua lagu yang sudah tertaut ke tujuan akan tetap tertaut.</span>
            <button class="artist-merge__primary" type="button" :disabled="!canPreview" @click="previewMerge">
              {{ isLoadingPreview ? 'Menghitung…' : 'Pratinjau merge' }}
            </button>
          </div>
        </section>

        <section v-if="preview" class="artist-merge__preview" aria-labelledby="artist-merge-preview-title">
          <div class="artist-merge__preview-heading">
            <div>
              <p class="artist-merge__eyebrow">PRATINJAU</p>
              <h2 id="artist-merge-preview-title">{{ preview.source.name }} → {{ preview.target.name }}</h2>
            </div>
            <span class="artist-merge__preview-badge">Periksa sebelum lanjut</span>
          </div>

          <div class="artist-merge__stats">
            <div><span>Lagu di sumber</span><strong>{{ preview.source.song_count }}</strong></div>
            <div><span>Lagu di tujuan</span><strong>{{ preview.target.song_count }}</strong></div>
            <div><span>Tautan duplikat</span><strong>{{ preview.shared_song_count }}</strong></div>
            <div class="artist-merge__stats-result"><span>Lagu di tujuan setelah merge</span><strong>{{ preview.result_song_count }}</strong></div>
          </div>

          <div class="artist-merge__warning">
            <strong>{{ preview.source.name }}</strong> akan dihapus. Tautan lagu yang sudah ada di tujuan akan dipertahankan satu kali.
          </div>

          <div class="artist-merge__confirm">
            <label for="artist-merge-confirm">Ketik nama artis sumber untuk mengonfirmasi</label>
            <input id="artist-merge-confirm" v-model="confirmationName" type="text" :placeholder="preview.source.name" autocomplete="off" />
            <button class="artist-merge__danger" type="button" :disabled="!confirmationMatches || isMerging" @click="mergeArtists">
              {{ isMerging ? 'Menggabungkan…' : 'Gabungkan dan hapus sumber' }}
            </button>
          </div>
        </section>
      </template>
    </section>
  </AppLayout>
</template>

<style src="./ArtistMergePage.css"></style>
