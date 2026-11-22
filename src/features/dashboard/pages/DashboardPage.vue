<script setup lang="ts">
  import { onMounted, onUnmounted, watch, ref, computed } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { APP_NAME } from '@/core/app/config/app.config'
  import { useAuthStore } from '@/features/auth/index'
  import { usePlayerStore } from '@/features/album/store/player.store'
  import { useDashboardStore } from '../store/dashboard.store'
  import { playlistApi } from '../api/playlist.api'
  import { pinApi, type PinnableType } from '@/features/album/api/pin.api'
  import { useHistoryStore } from '@/features/history/store/history.store'
  import type { RecentMusicItem } from '@/features/history/types/history.types'
  import { useTitle } from '@/core/shared/composables/useTitle'
  import ExploreCategorySection from '../components/ExploreCategorySection.vue'
  import ExploreCategoryPage from './ExploreCategoryPage.vue'
  import SidebarSkeleton from '../components/SidebarSkeleton.vue'

  const EXPLORE_CATEGORIES = [
    { id: 2, name: '日本の歌', badge: 'Japanese' },
    { id: 5, name: 'Instrumental', badge: 'Instrumental' },
    { id: 4, name: 'Worldwide', badge: 'Worldwide' },
    { id: 1, name: 'IndoPride', badge: 'Indonesian' },
    { id: 3, name: 'Jowo Mletre', badge: 'Javanese' },
  ]

  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  const selectedExploreCategory = computed(() => {
    const id = Number(route.query.category)
    return EXPLORE_CATEGORIES.some((category) => category.id === id) ? id : null
  })
  const playerStore = usePlayerStore()
  const dashboardStore = useDashboardStore()
  watch(selectedExploreCategory, (categoryId, previousCategoryId) => {
    if (route.path === '/' && categoryId === null && previousCategoryId !== null) {
      dashboardStore.clearExplorePageCache(previousCategoryId)
    }
  })
  const historyStore = useHistoryStore()

  const { albums, categories, playlists, isSidebarLoading: isLoading } =
    storeToRefs(dashboardStore)
  const { currentAlbum, currentSong } = storeToRefs(playerStore)
  const { tracks: recentTracks, isLoading: isHistoryLoading } = storeToRefs(historyStore)
  const sidebarTab = ref<'kategori' | 'playlist' | 'history'>('kategori')
  const showScrollTop = ref(false)
  const playlistDialogOpen = ref(false)
  const playlistDialogTitle = ref('')
  const editingPlaylistId = ref<number | null>(null)
  const playlistSaving = ref(false)
  const playlistError = ref('')
  const playlistContextMenu = ref<{ item: { id: number; title: string }; x: number; y: number } | null>(null)
  const playlistContextMenuRef = ref<HTMLElement | null>(null)
  const albumContextMenu = ref<{ item: any; x: number; y: number } | null>(null)
  const albumContextMenuRef = ref<HTMLElement | null>(null)
  const pinningAlbumId = ref<number | null>(null)
  const albumOriginalIndexes = new Map<number, number>()
  const deletePlaylistTarget = ref<{ id: number; title: string } | null>(null)
  const playlistDeleting = ref(false)
  const deletePlaylistError = ref('')

  const handleScroll = () => {
    showScrollTop.value = window.scrollY > 300
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  useTitle(() =>
    currentSong.value ? `${currentSong.value.title} • ${currentSong.value.artist}` : APP_NAME,
  )

  onMounted(async () => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handlePlaylistMenuOutsideClick)
    window.addEventListener('keydown', handlePlaylistMenuKeydown)
    await dashboardStore.fetchSidebarData()
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('click', handlePlaylistMenuOutsideClick)
    window.removeEventListener('keydown', handlePlaylistMenuKeydown)
  })

  watch(
    () => authStore.isAuthenticated,
    async () => {
      await dashboardStore.fetchSidebarData()
    },
  )


  const resolveCoverUrl = (cover: unknown) => {
    if (typeof cover !== 'string' || !cover) return ''
    if (cover.startsWith('http') || cover.startsWith('data:')) return cover

    // Bypass non-cacheable API redirect to allow native browser caching
    if (cover.includes('cover_url=cdncloudflare/')) {
      const match = cover.match(/cover_url=cdncloudflare\/(.*)/)
      if (match && match[1]) return `https://cdn.sibeux.my.id/${match[1]}`
    }

    return `https://${cover}`
  }

  const getCoverUrls = (item: any): string[] => {
    const cover = item.cover
    if (!cover || typeof cover !== 'object' || !['category', 'playlist'].includes(item.type)) {
      const url = resolveCoverUrl(cover)
      return url ? [url] : []
    }

    const coverUrls = [cover.cover_1, cover.cover_2, cover.cover_3, cover.cover_4]
      .map((coverUrl) => resolveCoverUrl(coverUrl))
      .filter((coverUrl): coverUrl is string => Boolean(coverUrl))

    return coverUrls.length < 4 ? coverUrls.slice(-1) : coverUrls
  }

  const DEFAULT_COVER = '/assets/images/placeholder_cover_music.png'

  const handleCoverError = (e: Event) => {
    const img = e.target as HTMLImageElement
    if (img.dataset.fallbackApplied) return
    img.dataset.fallbackApplied = 'true'
    img.src = DEFAULT_COVER
  }

  const goToAlbum = (item: any) => {
    const rawType = item.type ? String(item.type).trim().toLowerCase() : 'album'
    const id = Number(item.id)
    if (!id) return
    router.push({
      name: 'album',
      params: { type: rawType, id },
      state: {
        albumName: item.title,
        artistName: item.author || '',
        isPinned: Boolean(item.pin_at),
      },
    })
  }

  const isPlayingAlbum = (item: any) => {
    return (
      String(currentAlbum.value?.type) === String(item.type) &&
      Number(currentAlbum.value?.id) === Number(item.id)
    )
  }

  const openPlaylistDialog = (item?: { id: number; title: string }) => {
    if (!authStore.isAuthenticated) {
      router.push('/login')
      return
    }
    editingPlaylistId.value = item?.id ?? null
    playlistDialogTitle.value = item?.title ?? ''
    playlistError.value = ''
    playlistDialogOpen.value = true
  }

  const openPlaylistMenu = (event: MouseEvent, item: { id: number; title: string }) => {
    event.preventDefault()
    const menuWidth = 216
    const menuHeight = 112
    const anchor = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
    const anchorX = event.clientX || anchor?.right || 0
    const anchorY = event.clientY || anchor?.bottom || 0
    playlistContextMenu.value = {
      item,
      x: Math.max(8, Math.min(anchorX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(anchorY, window.innerHeight - menuHeight - 8)),
    }
  }

  const openAlbumMenu = (event: MouseEvent, item: any) => {
    event.preventDefault()
    const menuWidth = 180
    const menuHeight = 52
    albumContextMenu.value = {
      item,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    }
    playlistContextMenu.value = null
  }

  const handlePlaylistMenuOutsideClick = (event: MouseEvent) => {
    const target = event.target as Element | null
    if (target?.closest('[data-playlist-menu-trigger]')) return
    if (playlistContextMenuRef.value?.contains(event.target as Node)) return
    if (albumContextMenuRef.value?.contains(event.target as Node)) return
    playlistContextMenu.value = null
    albumContextMenu.value = null
  }

  const handlePlaylistMenuKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') playlistContextMenu.value = null
  }

  const renamePlaylistFromMenu = () => {
    const item = playlistContextMenu.value?.item
    playlistContextMenu.value = null
    if (item) openPlaylistDialog(item)
  }

  const deletePlaylistFromMenu = () => {
    const item = playlistContextMenu.value?.item
    playlistContextMenu.value = null
    if (item) deletePlaylist(item)
  }

  const toggleAlbumPinFromMenu = () => {
    const item = albumContextMenu.value?.item
    if (!item || pinningAlbumId.value !== null) return
    const type = (String(item.type || 'album').toLowerCase()) as PinnableType
    const wasPinned = Boolean(item.pin_at)
    const currentIndex = albums.value.findIndex((album) => album.id === item.id)
    const previousIndex = wasPinned
      ? (albumOriginalIndexes.get(Number(item.id)) ?? currentIndex)
      : currentIndex
    item.pin_at = wasPinned ? null : new Date().toISOString()
    if (!wasPinned) {
      albumOriginalIndexes.set(Number(item.id), previousIndex)
      albums.value = [item, ...albums.value.filter((album) => album.id !== item.id)]
    } else if (currentIndex >= 0 && previousIndex >= 0 && currentIndex !== previousIndex) {
      const restored = [...albums.value]
      const [movedItem] = restored.splice(currentIndex, 1)
      restored.splice(Math.min(previousIndex, restored.length), 0, movedItem)
      albums.value = restored
      albumOriginalIndexes.delete(Number(item.id))
    }
    albumContextMenu.value = null
    pinningAlbumId.value = Number(item.id)

    void (async () => {
      try {
        if (wasPinned) await pinApi.unpin(type, Number(item.id))
        else await pinApi.pin(type, Number(item.id))
      } catch {
        item.pin_at = wasPinned ? new Date().toISOString() : null
        const rollbackIndex = albums.value.findIndex((album) => album.id === item.id)
        if (rollbackIndex >= 0 && previousIndex >= 0 && rollbackIndex !== previousIndex) {
          const restored = [...albums.value]
          const [movedItem] = restored.splice(rollbackIndex, 1)
          restored.splice(previousIndex, 0, movedItem)
          albums.value = restored
        }
        if (wasPinned) albumOriginalIndexes.set(Number(item.id), previousIndex)
        else albumOriginalIndexes.delete(Number(item.id))
      } finally {
        pinningAlbumId.value = null
      }
    })()
  }

  const closePlaylistDialog = () => {
    if (playlistSaving.value) return
    playlistDialogOpen.value = false
    playlistError.value = ''
  }

  const savePlaylist = async () => {
    const title = playlistDialogTitle.value.trim()
    if (!title) {
      playlistError.value = 'Playlist name is required.'
      return
    }
    playlistSaving.value = true
    playlistError.value = ''
    try {
      if (editingPlaylistId.value) {
        await playlistApi.update(editingPlaylistId.value, title)
      } else {
        await playlistApi.create(title)
      }
      await dashboardStore.fetchSidebarData()
      playlistDialogOpen.value = false
    } catch (error: any) {
      playlistError.value = error?.response?.data?.message || 'Could not save playlist. Please try again.'
    } finally {
      playlistSaving.value = false
    }
  }

  const deletePlaylist = async (item: { id: number; title: string }) => {
    if (!authStore.isAuthenticated) {
      router.push('/login')
      return
    }
    deletePlaylistTarget.value = item
    deletePlaylistError.value = ''
  }

  const closeDeletePlaylistDialog = () => {
    if (playlistDeleting.value) return
    deletePlaylistTarget.value = null
    deletePlaylistError.value = ''
  }

  const confirmDeletePlaylist = async () => {
    if (!deletePlaylistTarget.value) return
    playlistDeleting.value = true
    try {
      await playlistApi.delete(deletePlaylistTarget.value.id)
      playlists.value = playlists.value.filter((playlist) => playlist.id !== deletePlaylistTarget.value?.id)
      deletePlaylistTarget.value = null
    } catch (error: any) {
      deletePlaylistError.value = error?.response?.data?.message || 'Could not delete playlist. Please try again.'
    } finally {
      playlistDeleting.value = false
    }
  }

  const playHistoryTrack = (track: RecentMusicItem) => {
    const song = historyStore.toSong(track)
    if (currentSong.value?.id_music === song.id_music) {
      playerStore.togglePlayback()
      return
    }
    playerStore.playSong(song, historyStore.songsList, { type: 'history', id: 0 })
  }

  const isPlayingHistoryTrack = (track: RecentMusicItem) => {
    return Number(currentSong.value?.id_music) === Number(track.id_music) && playerStore.isPlaying
  }

  watch(sidebarTab, async (newTab) => {
    if (newTab === 'history' && authStore.isAuthenticated && authStore.user?.id) {
      await historyStore.fetchRecentMusic(Number(authStore.user.id))
    }
  })
</script>

<template>
  <AppLayout>
    <template #sidebar>
      <div class="dashboard__sidebar">
        <!-- Tab bar -->
        <div class="dashboard__sidebar-tabs">
          <button
            class="dashboard__sidebar-tab"
            :class="{ 'dashboard__sidebar-tab--active': sidebarTab === 'kategori' }"
            @click="sidebarTab = 'kategori'"
          >
            Categories
          </button>
          <button
            class="dashboard__sidebar-tab"
            :class="{ 'dashboard__sidebar-tab--active': sidebarTab === 'playlist' }"
            @click="sidebarTab = 'playlist'"
          >
            Playlists
          </button>
        </div>

        <!-- Categories -->
        <template v-if="sidebarTab === 'kategori'">
          <SidebarSkeleton v-if="isLoading && categories.length === 0" />
          <div v-else-if="categories.length === 0" class="dashboard__sidebar-empty">
            No categories available
          </div>
          <ul v-else class="dashboard__sidebar-list">
            <li
              v-for="item in categories"
              :key="item.id"
              class="dashboard__sidebar-item"
              :class="{ 'dashboard__sidebar-item--playing': isPlayingAlbum(item) }"
              @click="goToAlbum(item)"
            >
              <div
                class="dashboard__sidebar-cover"
                :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }"
              >
                <div v-if="getCoverUrls(item).length === 4" class="dashboard__sidebar-cover-grid">
                  <img
                    v-for="(coverUrl, index) in getCoverUrls(item)"
                    :key="`${item.id}-sc-${index}`"
                    v-img-cache="coverUrl"
                    :alt="`${item.title} cover ${index + 1}`"
                    loading="lazy"
                    @error="handleCoverError"
                  />
                </div>
                <img
                  v-else-if="getCoverUrls(item).length"
                  v-img-cache="getCoverUrls(item)[0]"
                  :alt="item.title"
                  loading="lazy"
                  @error="handleCoverError"
                />
                <img v-else v-img-cache="DEFAULT_COVER" :alt="item.title" />
              </div>
              <div class="dashboard__sidebar-info">
                <div class="dashboard__sidebar-title-row">
                  <svg
                    v-if="item.pin_at"
                    class="dashboard__sidebar-pin-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-label="Pinned"
                    title="Pinned"
                  >
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" />
                  </svg>
                  <span class="dashboard__sidebar-label" :title="item.title">{{ item.title }}</span>
                </div>
              </div>
              <svg
                v-if="isPlayingAlbum(item)"
                class="dashboard__sidebar-playing"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </li>
          </ul>
        </template>

        <!-- Playlist -->
        <template v-else-if="sidebarTab === 'playlist'">
          <div class="dashboard__playlist-toolbar">
            <div class="dashboard__playlist-heading">
              <span>Your playlists</span>
              <span class="dashboard__playlist-count">{{ playlists.length }}</span>
            </div>
            <button type="button" class="dashboard__playlist-create" aria-label="Create playlist" title="Create playlist" @click="openPlaylistDialog()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <SidebarSkeleton v-if="isLoading && playlists.length === 0" playlist subtitle />
          <div v-else-if="playlists.length === 0" class="dashboard__playlist-empty">
            <div class="dashboard__playlist-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <strong>Make it yours</strong>
            <p>Save your favorite tracks in a playlist.</p>
            <button type="button" @click="openPlaylistDialog()">Create playlist</button>
          </div>
          <ul v-else class="dashboard__sidebar-list">
            <li
              v-for="item in playlists"
              :key="item.id"
              class="dashboard__sidebar-item dashboard__sidebar-item--playlist"
              :class="{ 'dashboard__sidebar-item--playing': isPlayingAlbum(item) }"
              @click="goToAlbum(item)"
              @contextmenu.prevent.stop="openPlaylistMenu($event, item)"
            >
              <div
                class="dashboard__sidebar-cover"
                :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }"
              >
                <div v-if="getCoverUrls(item).length === 4" class="dashboard__sidebar-cover-grid">
                  <img
                    v-for="(coverUrl, index) in getCoverUrls(item)"
                    :key="`${item.id}-sp-${index}`"
                    v-img-cache="coverUrl"
                    :alt="`${item.title} cover ${index + 1}`"
                    loading="lazy"
                    @error="handleCoverError"
                  />
                </div>
                <img
                  v-else-if="getCoverUrls(item).length"
                  v-img-cache="getCoverUrls(item)[0]"
                  :alt="item.title"
                  loading="lazy"
                  @error="handleCoverError"
                />
                <img v-else v-img-cache="DEFAULT_COVER" :alt="item.title" />
              </div>
              <div class="dashboard__sidebar-info">
                <div class="dashboard__sidebar-title-row">
                  <svg
                    v-if="item.pin_at"
                    class="dashboard__sidebar-pin-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-label="Pinned"
                    title="Pinned"
                  >
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" />
                  </svg>
                  <span class="dashboard__sidebar-label" :title="item.title">{{ item.title }}</span>
                </div>
                <span v-if="item.author" class="dashboard__sidebar-sub" :title="item.author">{{
                  item.author
                }}</span>
              </div>
              <div class="dashboard__playlist-item-actions">
                <button type="button" data-playlist-menu-trigger :aria-label="`Options for ${item.title}`" :title="`Options for ${item.title}`" aria-haspopup="menu" @click.stop="openPlaylistMenu($event, item)">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
                  </svg>
                </button>
              </div>
              <svg
                v-if="isPlayingAlbum(item)"
                class="dashboard__sidebar-playing"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </li>
          </ul>
        </template>

        <!-- History -->
        <template v-else-if="sidebarTab === 'history'">
          <div v-if="!authStore.isAuthenticated" class="dashboard__sidebar-empty">
            <p style="margin: 0 0 0.5rem 0;">Sign in to see your listening history.</p>
            <button class="dashboard__sidebar-auth-btn" type="button" @click="router.push('/login')">
              Sign In
            </button>
          </div>
          <SidebarSkeleton v-else-if="isHistoryLoading && recentTracks.length === 0" subtitle />
          <div v-else-if="recentTracks.length === 0" class="dashboard__sidebar-empty">
            No recently played tracks
          </div>
          <div v-else class="dashboard__sidebar-history-container">
            <div class="dashboard__sidebar-history-header">
              <span class="dashboard__sidebar-history-count">{{ recentTracks.length }} tracks</span>
              <button class="dashboard__sidebar-history-link" type="button" @click="router.push('/history')">
                View all &rarr;
              </button>
            </div>
            <ul class="dashboard__sidebar-list">
              <li
                v-for="(item, index) in recentTracks"
                :key="`${item.id_music}-${item.played_at}-${index}`"
                class="dashboard__sidebar-item"
                :class="{ 'dashboard__sidebar-item--playing': isPlayingHistoryTrack(item) }"
                @click="playHistoryTrack(item)"
              >
                <div class="dashboard__sidebar-cover">
                  <img
                    v-img-cache="resolveCoverUrl(item.cover)"
                    :alt="item.title"
                    loading="lazy"
                    @error="handleCoverError"
                  />
                </div>
                <div class="dashboard__sidebar-info">
                  <div class="dashboard__sidebar-title-row">
                    <span class="dashboard__sidebar-label" :title="item.title">{{ item.title }}</span>
                  </div>
                  <span v-if="item.artist" class="dashboard__sidebar-sub" :title="item.artist">
                    {{ item.artist }}
                  </span>
                </div>
                <svg
                  v-if="isPlayingHistoryTrack(item)"
                  class="dashboard__sidebar-playing"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </template>

    <div class="dashboard">
      <ExploreCategoryPage
        v-if="selectedExploreCategory"
        :key="`${selectedExploreCategory}:${authStore.isAuthenticated}`"
        :category-id="selectedExploreCategory"
        embedded
      />
      <template v-else>
      <div class="dashboard__welcome">
        <div class="dashboard__welcome-icon" aria-hidden="true">👋</div>
        <div>
          <h1 class="dashboard__title">
            Welcome<template v-if="authStore.user?.name">, {{ authStore.user.name }}</template
            ><template v-else> to Cybeat</template>!
          </h1>
          <p class="dashboard__subtitle">
            <template v-if="authStore.isAuthenticated">
              You are signed in to Cybeat. Dashboard is currently under active development.
            </template>
            <template v-else>
              Please sign in to access all features. Dashboard is currently under active
              development.
            </template>
          </p>
        </div>
      </div>

        <!-- 5 Explore Category Sections (Lazy Load + Keyset Pagination) -->
        <div class="dashboard__explore-sections">
          <ExploreCategorySection
            v-for="cat in EXPLORE_CATEGORIES"
            :key="`${cat.id}:${authStore.isAuthenticated}`"
            :category-id="cat.id"
            :category-name="cat.name"
            :badge-label="cat.badge"
            :is-playing-album="isPlayingAlbum"
            @album-click="goToAlbum"
            @album-context-menu="openAlbumMenu($event.event, $event.item)"
          />
        </div>

        <!-- Dedicated CTA Section for All Albums -->
        <div class="dashboard__all-albums-cta">
          <div class="dashboard__all-albums-cta-content">
            <div class="dashboard__all-albums-cta-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div class="dashboard__all-albums-cta-text">
              <h3 class="dashboard__all-albums-cta-title">Looking for more music?</h3>
              <p class="dashboard__all-albums-cta-desc">
                Browse our complete catalog of albums, discographies, and artist collections.
              </p>
            </div>
            <router-link to="/albums" class="dashboard__all-albums-cta-btn">
              <span>View All Albums</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </router-link>
          </div>
        </div>
      </template>
    </div>

    <div v-if="playlistDialogOpen" class="dashboard__playlist-dialog-backdrop" @click.self="closePlaylistDialog" @keydown.esc="closePlaylistDialog">
      <section class="dashboard__playlist-dialog" role="dialog" aria-modal="true" aria-labelledby="playlist-dialog-title">
        <div class="dashboard__playlist-dialog-heading">
          <div>
            <p>PLAYLIST</p>
            <h2 id="playlist-dialog-title">{{ editingPlaylistId ? 'Rename playlist' : 'Create playlist' }}</h2>
          </div>
          <button type="button" aria-label="Close dialog" :disabled="playlistSaving" @click="closePlaylistDialog">×</button>
        </div>
        <form @submit.prevent="savePlaylist">
          <label for="playlist-title">Name</label>
          <input id="playlist-title" v-model="playlistDialogTitle" type="text" maxlength="255" autocomplete="off" autofocus placeholder="Give your playlist a name" />
          <p v-if="playlistError" class="dashboard__playlist-dialog-error" role="alert">{{ playlistError }}</p>
          <div class="dashboard__playlist-dialog-actions">
            <button type="button" class="dashboard__playlist-cancel" :disabled="playlistSaving" @click="closePlaylistDialog">Cancel</button>
            <button type="submit" class="dashboard__playlist-submit" :disabled="playlistSaving || !playlistDialogTitle.trim()">
              {{ playlistSaving ? 'Saving…' : editingPlaylistId ? 'Save changes' : 'Create playlist' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div
      v-if="playlistContextMenu"
      ref="playlistContextMenuRef"
      class="dashboard__playlist-context-menu"
      role="menu"
      :aria-label="`Options for ${playlistContextMenu.item.title}`"
      :style="{ left: `${playlistContextMenu.x}px`, top: `${playlistContextMenu.y}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <button type="button" role="menuitem" @click="renamePlaylistFromMenu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
        Rename playlist
      </button>
      <div class="dashboard__playlist-context-divider" role="separator"></div>
      <button type="button" class="dashboard__playlist-context-delete" role="menuitem" @click="deletePlaylistFromMenu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></svg>
        Delete playlist
      </button>
    </div>

    <div
      v-if="albumContextMenu"
      ref="albumContextMenuRef"
      class="dashboard__playlist-context-menu"
      role="menu"
      :aria-label="`Options for ${albumContextMenu.item.title}`"
      :style="{ left: `${albumContextMenu.x}px`, top: `${albumContextMenu.y}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <button type="button" role="menuitem" class="dashboard__pin-context-action" :class="{ 'dashboard__pin-context-action--active': albumContextMenu.item.pin_at }" :disabled="pinningAlbumId !== null" @click="toggleAlbumPinFromMenu">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" /></svg>
        {{ albumContextMenu.item.pin_at ? 'Unpin album' : 'Pin album' }}
      </button>
    </div>

    <div v-if="deletePlaylistTarget" class="dashboard__playlist-dialog-backdrop" @click.self="closeDeletePlaylistDialog" @keydown.esc="closeDeletePlaylistDialog">
      <section class="dashboard__playlist-dialog dashboard__playlist-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="playlist-delete-title" aria-describedby="playlist-delete-description">
        <div class="dashboard__playlist-delete-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
          </svg>
        </div>
        <h2 id="playlist-delete-title">Delete playlist?</h2>
        <p id="playlist-delete-description">
          <strong>{{ deletePlaylistTarget.title }}</strong> and its songs will be removed. This can't be undone.
        </p>
        <p v-if="deletePlaylistError" class="dashboard__playlist-dialog-error" role="alert">{{ deletePlaylistError }}</p>
        <div class="dashboard__playlist-dialog-actions">
          <button type="button" class="dashboard__playlist-cancel" :disabled="playlistDeleting" @click="closeDeletePlaylistDialog">Cancel</button>
          <button type="button" class="dashboard__playlist-delete-submit" :disabled="playlistDeleting" @click="confirmDeletePlaylist">
            {{ playlistDeleting ? 'Deleting…' : 'Delete playlist' }}
          </button>
        </div>
      </section>
    </div>

    <!-- Scroll To Top Button -->
    <Transition name="scroll-top-fade">
      <button
        v-if="showScrollTop"
        class="dashboard__scroll-top"
        :class="{ 'dashboard__scroll-top--player-active': !!currentSong }"
        type="button"
        aria-label="Scroll to top"
        title="Scroll to top"
        @click="scrollToTop"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </Transition>
  </AppLayout>
</template>

<style scoped src="../components/SidebarItemLayout.css"></style>
<style scoped src="./DashboardPage.css"></style>
