<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { catalogApi } from '../api/catalog.api'
import type { AdminAlbum, AdminCategory, UpdateCatalogCommand } from '../types/catalog.types'

const router = useRouter()
const albums = ref<AdminAlbum[]>([])
const categories = ref<AdminCategory[]>([])
const activeType = ref<'album' | 'category'>('album')
const selectedId = ref<number | null>(null)
const search = ref('')
const name = ref('')
const author = ref('')
const cover = ref('')
const haveDisc = ref(false)
const isPrivate = ref(false)
const selectedAlbumIds = ref<number[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const message = ref('')

const items = computed(() => activeType.value === 'album' ? albums.value : categories.value)
const filteredItems = computed(() => items.value.filter(item => item.name.toLowerCase().includes(search.value.trim().toLowerCase())))
const selectedItem = computed(() => items.value.find(item => item.id === selectedId.value) ?? null)

function itemDescription(item: AdminAlbum | AdminCategory): string {
  return activeType.value === 'album' ? (item as AdminAlbum).author : `${(item as AdminCategory).album_ids.length} albums`
}

function setType(type: 'album' | 'category') {
  activeType.value = type
  search.value = ''
  selectedId.value = null
  message.value = ''
  error.value = ''
}

function selectItem(id: number) {
  selectedId.value = id
  const item = items.value.find(entry => entry.id === id)
  if (!item) return
  name.value = item.name
  cover.value = item.cover ?? ''
  if (activeType.value === 'album') {
    const album = item as AdminAlbum
    author.value = album.author ?? ''
    haveDisc.value = Boolean(album.have_disc)
    isPrivate.value = Boolean(album.is_private)
  } else {
    selectedAlbumIds.value = [...(item as AdminCategory).album_ids]
  }
  message.value = ''
  error.value = ''
}

async function loadCatalog() {
  loading.value = true
  error.value = ''
  try {
    const response = await catalogApi.getCatalog()
    albums.value = response.data.data.albums
    categories.value = response.data.data.categories
    if (!selectedId.value && items.value.length) selectItem(items.value[0].id)
  } catch {
    error.value = 'Could not load the catalog. Try refreshing the page.'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!selectedItem.value || saving.value || !name.value.trim()) return
  if (activeType.value === 'album' && !author.value.trim()) return
  saving.value = true
  error.value = ''
  message.value = ''
  const command: UpdateCatalogCommand = {
    type: activeType.value,
    id: selectedItem.value.id,
    name: name.value.trim(),
    cover: cover.value.trim(),
  }
  if (activeType.value === 'album') {
    command.author = author.value.trim()
    command.have_disc = haveDisc.value
    command.is_private = isPrivate.value
  } else {
    command.album_ids = selectedAlbumIds.value
  }
  try {
    await catalogApi.updateCatalog(command)
    await loadCatalog()
    selectItem(command.id)
    message.value = 'Changes saved.'
  } catch (e: unknown) {
    const responseMessage = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    error.value = responseMessage || 'Could not save changes.'
  } finally {
    saving.value = false
  }
}

function toggleAlbum(id: number) {
  selectedAlbumIds.value = selectedAlbumIds.value.includes(id)
    ? selectedAlbumIds.value.filter(albumId => albumId !== id)
    : [...selectedAlbumIds.value, id]
}

onMounted(loadCatalog)
</script>

<template>
  <main class="catalog-page">
    <header class="catalog-page__header">
      <div class="catalog-page__title-area">
        <button class="catalog-page__back" type="button" aria-label="Back" @click="router.push('/')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/><path d="M20 12H9"/></svg>
        </button>
        <div><h1>Edit albums & categories</h1><p>Manage the CyBeat catalog.</p></div>
      </div>
      <button class="catalog-page__refresh" type="button" :disabled="loading" @click="loadCatalog">Refresh</button>
    </header>

    <nav class="catalog-page__tabs" aria-label="Catalog type">
      <button :class="{ 'is-active': activeType === 'album' }" @click="setType('album')">Albums <span>{{ albums.length }}</span></button>
      <button :class="{ 'is-active': activeType === 'category' }" @click="setType('category')">Categories <span>{{ categories.length }}</span></button>
    </nav>

    <div v-if="loading" class="catalog-page__state">Loading catalog…</div>
    <div v-else-if="error && !selectedItem" class="catalog-page__state catalog-page__state--error">{{ error }} <button @click="loadCatalog">Try again</button></div>
    <section v-else class="catalog-page__workspace">
      <aside class="catalog-page__list">
        <label class="catalog-page__search"><span>⌕</span><input v-model="search" placeholder="Search catalog…"></label>
        <button v-for="item in filteredItems" :key="item.id" class="catalog-page__item" :class="{ 'is-selected': selectedId === item.id }" @click="selectItem(item.id)">
          <img v-if="item.cover" :src="item.cover" alt="" loading="lazy">
          <span v-else class="catalog-page__placeholder">{{ item.name.slice(0, 1).toUpperCase() }}</span>
          <span class="catalog-page__item-copy"><strong>{{ item.name }}</strong><small>{{ itemDescription(item) }}</small></span>
        </button>
        <p v-if="filteredItems.length === 0" class="catalog-page__empty">No results found.</p>
      </aside>

      <form v-if="selectedItem" class="catalog-page__editor" :class="{ 'catalog-page__editor--saving': saving }" @submit.prevent="save">
        <div class="catalog-page__editor-heading"><div><p>{{ activeType === 'album' ? 'ALBUM' : 'CATEGORY' }}</p><h2>{{ selectedItem.name }}</h2></div><span>#{{ selectedItem.id }}</span></div>
        <label class="catalog-page__field"><span>Name <i class="catalog-page__required" aria-hidden="true">*</i></span><input v-model="name" required maxlength="255" :aria-invalid="!name.trim()" :aria-describedby="!name.trim() ? 'catalog-name-error' : undefined"><small v-if="!name.trim()" id="catalog-name-error" class="catalog-page__field-error">Can't be null</small></label>
        <label v-if="activeType === 'album'" class="catalog-page__field"><span>Artist <i class="catalog-page__required" aria-hidden="true">*</i></span><input v-model="author" required maxlength="255" :aria-invalid="!author.trim()"><small v-if="!author.trim()" class="catalog-page__field-error">Can't be null</small></label>
        <label class="catalog-page__field"><span>Cover URL</span><input v-model="cover" type="url" maxlength="2048" placeholder="https://…"></label>
        <div v-if="activeType === 'album'" class="catalog-page__toggles">
          <label><input v-model="isPrivate" type="checkbox"><span><strong>Premium album</strong><small>Available to premium members and admins only.</small></span></label>
          <label><input v-model="haveDisc" type="checkbox"><span><strong>Has multiple discs</strong><small>Show disc grouping on the album page.</small></span></label>
        </div>
        <div v-else class="catalog-page__album-picker">
          <div class="catalog-page__picker-heading"><div><strong>Albums in category</strong><small>{{ selectedAlbumIds.length }} selected</small></div></div>
          <label v-for="album in albums" :key="album.id" class="catalog-page__album-option">
            <input type="checkbox" :checked="selectedAlbumIds.includes(album.id)" @change="toggleAlbum(album.id)">
            <img v-if="album.cover" :src="album.cover" alt="" loading="lazy"><span v-else class="catalog-page__mini-placeholder">♪</span>
            <span><strong>{{ album.name }}</strong><small>{{ album.author }}</small></span>
          </label>
        </div>
        <p v-if="message" class="catalog-page__message">{{ message }}</p>
        <p v-if="error" class="catalog-page__error">{{ error }}</p>
        <footer><button type="button" class="catalog-page__cancel" :disabled="saving" @click="selectItem(selectedItem.id)">Reset</button><button type="submit" class="catalog-page__save" :disabled="saving || !name.trim() || (activeType === 'album' && !author.trim())">{{ saving ? 'Saving…' : 'Save changes' }}</button></footer>
      </form>
      <div v-else class="catalog-page__state">Select an {{ activeType === 'album' ? 'album' : 'category' }} to edit.</div>
    </section>
  </main>
</template>

<style src="./CatalogPage.css"></style>
