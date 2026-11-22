<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AlbumCatalogPage from '../components/AlbumCatalogPage.vue'
import { useDashboardStore } from '../store/dashboard.store'
import { useTitle } from '@/core/shared/composables/useTitle'

const dashboardStore = useDashboardStore()
const { albums, isLoading, error } = storeToRefs(dashboardStore)
useTitle(() => 'All Albums ? Cybeat')
const search = ref('')
const refresh = () => dashboardStore.fetchDashboardData(search.value, true)
const searchAlbums = (query: string) => {
  search.value = query
  void dashboardStore.fetchDashboardData(query, true)
}
onMounted(() => dashboardStore.fetchDashboardData('', false))
</script>

<template>
  <AlbumCatalogPage
    v-model:albums="albums"
    title="All Albums"
    badge="Catalog"
    subtitle="Browse through all albums available in the catalog"
    :is-loading="isLoading"
    :error="error"
    @refresh="refresh"
    @search="searchAlbums"
  />
</template>
