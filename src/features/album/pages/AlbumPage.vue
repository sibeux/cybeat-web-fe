<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { APP_NAME } from '@/core/app/config/app.config'
  import { albumApi, type GetSongsParams } from '../api/album.api'
  import { playlistTracksApi } from '../api/playlist-tracks.api'
  import { pinApi, type PinnableType } from '../api/pin.api'
  import type { Song } from '../types/song.types'
  import ArtistLinks from '@/features/artist/components/ArtistLinks.vue'
  import { usePlayerStore } from '../store/player.store'
  import { storeToRefs } from 'pinia'
  import { useTitle } from '@/core/shared/composables/useTitle'
  import { useAuthStore } from '@/features/auth/index'
  import { playlistApi, type PlaylistOption } from '@/features/dashboard/api/playlist.api'
  import { catalogApi } from '@/features/catalog/api/catalog.api'
  import type { AdminAlbum, UpdateCatalogCommand } from '@/features/catalog/types/catalog.types'
  import { artistApi } from '@/features/artist/api/artist.api'
  import type { ArtistCatalogItem } from '@/features/artist/types'
  import { parseArtistCredits } from '@/features/artist/utils/parseArtistCredits'

  const route = useRoute()
  const router = useRouter()
  const playerStore = usePlayerStore()
  const authStore = useAuthStore()
  const { currentSong, isPlaying } = storeToRefs(playerStore)
  const isAdmin = computed(() => authStore.user?.role === 'admin')
  const albumMenuRef = ref<HTMLElement | null>(null)
  const isPlaylistPickerOpen = ref(false)
  const songOptionsMenu = ref<{ song: Song; x: number; y: number; positioned: boolean } | null>(null)
  const songOptionsMenuRef = ref<HTMLElement | null>(null)
  const isLoadingPlaylists = ref(false)
  const playlistOptions = ref<PlaylistOption[]>([])
  const addingToPlaylistId = ref<number | null>(null)
  const removingFromPlaylistId = ref<number | null>(null)
  const isPlaylistPickerBusy = computed(() => addingToPlaylistId.value !== null || removingFromPlaylistId.value !== null)
  const removingSongId = ref<number | null>(null)
  const isBulkDeleteMode = ref(false)
  const selectedSongIds = ref<number[]>([])
  const isSongDeleteConfirmOpen = ref(false)
  const pendingSongDeleteIds = ref<number[]>([])
  const isDeletingSongs = ref(false)
  const songDeleteError = ref('')
  const selectedSongForPlaylist = ref<Song | null>(null)
  const playlistPickerError = ref('')
  const playlistActionNotice = ref('')
  const playlistActionIsError = ref(false)
  const playlistMetadata = ref<PlaylistOption | null>(null)
  const isEditPlaylistOpen = ref(false)
  const isSavingPlaylist = ref(false)
  const playlistForm = ref({ name: '', cover: '' })
  const playlistEditError = ref('')
  const playlistsContainingSong = computed(() => playlistOptions.value.filter((playlist) => playlist.contains_song))
  const playlistsAvailableForSong = computed(() => playlistOptions.value.filter((playlist) => !playlist.contains_song))
  let playlistNoticeTimer: ReturnType<typeof setTimeout> | null = null

  const songs = ref<Song[]>([])
  const unfilteredSongs = ref<Song[]>([])
  const totalSongs = ref(0)
  const isLoading = ref(true)
  const isSearching = ref(false)
  const error = ref<string | null>(null)
  const isAlbumMenuOpen = ref(false)
  const isEditAlbumOpen = ref(false)
  const isPreparingAlbumEdit = ref(false)
  const isResolvingAlbumArtists = ref(false)
  let artistEditorSession = 0
  const isLoadingAlbumArtists = ref(false)
  const isSavingAlbum = ref(false)
  const albumEditError = ref('')
  const albumEditMessage = ref('')
  const artistSelectionWarning = ref('')
  const editableAlbum = ref<AdminAlbum | null>(null)
  const artistOptions = ref<ArtistCatalogItem[]>([])
  const selectedArtists = ref<ArtistCatalogItem[]>([])
  const artistSearch = ref('')
  let artistSearchTimer: ReturnType<typeof setTimeout> | null = null
  let artistSearchController: AbortController | null = null
  let previousBodyOverflow: string | null = null
  let previousDocumentOverflow: string | null = null
  let previousBodyPaddingRight: string | null = null
  const editedAlbumName = ref<string | null>(null)
  const editedAlbumCover = ref<string | null>(null)
  const albumForm = ref({ name: '', cover: '', have_disc: false, is_private: false })
  const visibleArtistOptions = computed(() => [
    ...new Map([...selectedArtists.value, ...artistOptions.value].map((artist) => [artist.id_artist, artist])).values(),
  ])

  const restorePageScroll = () => {
    if (previousBodyOverflow !== null) document.body.style.overflow = previousBodyOverflow
    if (previousDocumentOverflow !== null) document.documentElement.style.overflow = previousDocumentOverflow
    if (previousBodyPaddingRight !== null) document.body.style.paddingRight = previousBodyPaddingRight
    previousBodyOverflow = null
    previousDocumentOverflow = null
    previousBodyPaddingRight = null
  }

  watch(isEditAlbumOpen, (isOpen) => {
    if (!isOpen) {
      artistEditorSession++
      artistSearchController?.abort()
      restorePageScroll()
      return
    }
    previousBodyOverflow = document.body.style.overflow
    previousDocumentOverflow = document.documentElement.style.overflow
    previousBodyPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }
  })
  const loadArtistOptions = async (query: string): Promise<ArtistCatalogItem[]> => {
    artistSearchController?.abort()
    artistSearchController = new AbortController()
    const controller = artistSearchController
    isLoadingAlbumArtists.value = true
    try {
      const response = await artistApi.getAllArtists(query, controller.signal)
      if (artistSearchController === controller) artistOptions.value = response.data.data
      return response.data.data
    } catch (requestError: any) {
      if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') {
        albumEditError.value = requestError.response?.data?.message || 'Artist search failed.'
      }
      return []
    } finally {
      if (artistSearchController === controller) isLoadingAlbumArtists.value = false
    }
  }

  const scheduleArtistSearch = () => {
    if (artistSearchTimer) clearTimeout(artistSearchTimer)
    artistSearchTimer = setTimeout(() => {
      artistSearchTimer = null
      void loadArtistOptions(artistSearch.value.trim())
    }, 250)
  }

  const type = computed(() =>
    String(route.params.type || 'album')
      .trim()
      .toLowerCase(),
  )
  const id = computed(() => Number(route.params.id))
  const canAddSongsToPlaylist = computed(() => ['album', 'category'].includes(type.value))

  // Prepare authoritative flags with the page, then reuse this album in the editor.
  watch([id, type, isAdmin], async ([albumId, pageType, admin], _previous, onCleanup) => {
    let stale = false
    onCleanup(() => { stale = true })
    editableAlbum.value = null
    albumEditError.value = ''
    isPreparingAlbumEdit.value = false
    if (!admin || pageType !== 'album' || !albumId) return
    isPreparingAlbumEdit.value = true
    try {
      const response = await catalogApi.getAlbum(albumId)
      if (!stale) editableAlbum.value = response.data.data.album
    } catch (requestError: any) {
      if (!stale) albumEditError.value = requestError.response?.data?.message || 'Could not load album details. Reload the page to retry.'
    } finally {
      if (!stale) isPreparingAlbumEdit.value = false
    }
  }, { immediate: true })

  const stateAlbumName = ref<string | undefined>(history.state?.albumName as string | undefined)
  const stateArtistName = ref<string | undefined>(history.state?.artistName as string | undefined)
  const isPinned = ref(Boolean(history.state?.isPinned))

  const isStickyVisible = ref(false)
  const isScrollTopVisible = ref(false)
  const isToolbarStuck = ref(false)
  const toolbarContainerRef = ref<HTMLElement | null>(null)
  let scrollHandler: (() => void) | null = null
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastSearchedQuery = ''
  let songsAbortController: AbortController | null = null

  type SortMode = 'default' | 'alphabetical' | 'artist'
  type SortDirection = 'asc' | 'desc'

  const searchQuery = ref('')
  const sortMode = ref<SortMode>('default')
  const sortDirection = ref<SortDirection>('asc')
  const isSortDropdownOpen = ref(false)
  const sortDropdownRef = ref<HTMLElement | null>(null)

  // Toolbar search & sort tetap tampil untuk album, playlist, maupun category
  const isToolbarVisible = computed(
    () => ['album', 'playlist', 'category'].includes(type.value) || !type.value,
  )

  // Search dan sort melalui API backend khusus aktif untuk 'playlist' dan 'category'
  const isServerSearchAndSort = computed(() =>
    ['playlist', 'category'].includes(type.value),
  )

  const sortLabel = computed(() => {
    switch (sortMode.value) {
      case 'alphabetical':
        return 'Alphabetical'
      case 'artist':
        return 'Artist'
      case 'default':
      default:
        return 'Default (ID)'
    }
  })

  // Lagu yang telah disort:
  // - Untuk category/playlist: langsung dari respon server (server-side)
  // - Untuk album: dilakukan secara client-side (agar album tetap bisa search & sort tanpa membebani backend)
  const allSortedSongs = computed<Song[]>(() => {
    if (isServerSearchAndSort.value) {
      return songs.value
    }

    const list = [...songs.value]
    const isAsc = sortDirection.value === 'asc'

    if (sortMode.value === 'alphabetical') {
      list.sort((a, b) => {
        const cmp = a.title.localeCompare(b.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
        if (cmp !== 0) {
          return isAsc ? cmp : -cmp
        }
        return isAsc ? a.id_music - b.id_music : b.id_music - a.id_music
      })
    } else if (sortMode.value === 'artist') {
      list.sort((a, b) => {
        const cmp = a.artist.localeCompare(b.artist, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
        if (cmp !== 0) {
          return isAsc ? cmp : -cmp
        }
        return isAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
      })
    } else {
      // default (id)
      list.sort((a, b) => (isAsc ? a.id_music - b.id_music : b.id_music - a.id_music))
    }

    return list
  })

  const sortedSongs = computed<Song[]>(() => {
    if (isServerSearchAndSort.value) {
      return songs.value
    }

    let list = allSortedSongs.value
    const query = searchQuery.value.trim().toLowerCase()
    if (query) {
      list = list.filter((song) => {
        const titleMatch = (song.title || '').toLowerCase().includes(query)
        const artistMatch = (song.artist || '').toLowerCase().includes(query)
        return titleMatch || artistMatch
      })
    }

    return list
  })
  const allVisibleSongsSelected = computed(() =>
    sortedSongs.value.length > 0 && sortedSongs.value.every((song) => selectedSongIds.value.includes(song.id_music)),
  )
  const pendingSongDeleteTitle = computed(() => {
    if (pendingSongDeleteIds.value.length !== 1) return ''
    return songs.value.find((song) => song.id_music === pendingSongDeleteIds.value[0])?.title || 'this song'
  })

  const showPlaylistNotice = (message: string, isError = false) => {
    playlistActionNotice.value = message
    playlistActionIsError.value = isError
    if (playlistNoticeTimer) clearTimeout(playlistNoticeTimer)
    playlistNoticeTimer = setTimeout(() => {
      playlistActionNotice.value = ''
      playlistNoticeTimer = null
    }, 3200)
  }

  const openPlaylistPicker = async (song: Song) => {
    if (!authStore.isAuthenticated) {
      void router.push('/login')
      return
    }
    selectedSongForPlaylist.value = song
    playlistPickerError.value = ''
    isPlaylistPickerOpen.value = true
    isLoadingPlaylists.value = true
    try {
      const response = await playlistApi.list(song.id_music)
      playlistOptions.value = response.data.data || []
    } catch (requestError: any) {
      playlistPickerError.value = requestError.response?.data?.message || 'Could not load your playlists.'
    } finally {
      isLoadingPlaylists.value = false
    }
  }

  const openSongOptions = async (event: MouseEvent, song: Song) => {
    event.preventDefault()
    if (type.value === 'playlist' && isBulkDeleteMode.value) return
    const anchor = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
    const clickX = event.clientX || anchor?.right || 8
    const clickY = event.clientY || anchor?.bottom || 8
    songOptionsMenu.value = {
      song,
      x: clickX + 6,
      y: clickY + 6,
      positioned: false,
    }

    await nextTick()
    if (songOptionsMenu.value?.song !== song || !songOptionsMenuRef.value) return

    const menuBounds = songOptionsMenuRef.value.getBoundingClientRect()
    const edge = 8
    const rightPosition = clickX + 6
    const leftPosition = clickX - menuBounds.width - 6
    const x = rightPosition + menuBounds.width <= window.innerWidth - edge
      ? rightPosition
      : leftPosition
    const belowPosition = clickY + 6
    const abovePosition = clickY - menuBounds.height - 6
    let y: number
    if (abovePosition >= edge) {
      y = abovePosition
    } else if (belowPosition + menuBounds.height <= window.innerHeight - edge) {
      y = belowPosition
    } else {
      y = Math.max(edge, Math.min(belowPosition, window.innerHeight - menuBounds.height - edge))
    }

    songOptionsMenu.value = {
      song,
      x: Math.max(edge, Math.min(x, window.innerWidth - menuBounds.width - edge)),
      y,
      positioned: true,
    }
  }

  const closeSongOptions = () => {
    songOptionsMenu.value = null
  }

  const addSongFromOptions = () => {
    const song = songOptionsMenu.value?.song
    closeSongOptions()
    if (song) void openPlaylistPicker(song)
  }

  const removeSongFromOptions = () => {
    const song = songOptionsMenu.value?.song
    closeSongOptions()
    if (song) removeSongFromPlaylist(song)
  }

  const handleSongOptionsKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeSongOptions()
  }

  const closePlaylistPicker = () => {
    if (isPlaylistPickerBusy.value) return
    isPlaylistPickerOpen.value = false
    selectedSongForPlaylist.value = null
    playlistPickerError.value = ''
  }

  const addSongToPlaylist = async (playlist: PlaylistOption) => {
    const song = selectedSongForPlaylist.value
    if (!song || isPlaylistPickerBusy.value) return
    addingToPlaylistId.value = playlist.id
    playlistPickerError.value = ''
    try {
      const response = await playlistTracksApi.add(playlist.id, song.id_music)
      isPlaylistPickerOpen.value = false
      selectedSongForPlaylist.value = null
      showPlaylistNotice(response.data.message || `Added to ${playlist.title}.`)
    } catch (requestError: any) {
      playlistPickerError.value = requestError.response?.data?.message || 'Could not add this song.'
    } finally {
      addingToPlaylistId.value = null
    }
  }

  const removeSongFromPlaylistPicker = async (playlist: PlaylistOption) => {
    const song = selectedSongForPlaylist.value
    if (!song || isPlaylistPickerBusy.value) return
    removingFromPlaylistId.value = playlist.id
    playlistPickerError.value = ''
    try {
      const response = await playlistTracksApi.remove(playlist.id, song.id_music)
      playlistOptions.value = playlistOptions.value.map((item) =>
        item.id === playlist.id ? { ...item, contains_song: false } : item,
      )
      if (type.value === 'playlist' && Number(id.value) === Number(playlist.id)) {
        await loadSongs(true)
      }
      showPlaylistNotice(response.data.message || `Removed from ${playlist.title}.`)
    } catch (requestError: any) {
      playlistPickerError.value = requestError.response?.data?.message || 'Could not remove this song.'
    } finally {
      removingFromPlaylistId.value = null
    }
  }

  const toggleBulkDeleteMode = () => {
    isBulkDeleteMode.value = !isBulkDeleteMode.value
    selectedSongIds.value = []
  }

  const toggleSongSelection = (songId: number) => {
    selectedSongIds.value = selectedSongIds.value.includes(songId)
      ? selectedSongIds.value.filter((id) => id !== songId)
      : [...selectedSongIds.value, songId]
  }

  const toggleVisibleSongSelection = () => {
    const visibleIds = sortedSongs.value.map((song) => song.id_music)
    selectedSongIds.value = allVisibleSongsSelected.value
      ? selectedSongIds.value.filter((id) => !visibleIds.includes(id))
      : [...new Set([...selectedSongIds.value, ...visibleIds])]
  }

  const requestSongDeletion = (songIds: number[]) => {
    const uniqueIds = [...new Set(songIds)].filter((songId) => songId > 0)
    if (uniqueIds.length === 0 || isDeletingSongs.value) return
    pendingSongDeleteIds.value = uniqueIds
    songDeleteError.value = ''
    isSongDeleteConfirmOpen.value = true
  }

  const closeSongDeleteConfirm = () => {
    if (isDeletingSongs.value) return
    isSongDeleteConfirmOpen.value = false
    pendingSongDeleteIds.value = []
    songDeleteError.value = ''
  }

  const confirmSongDeletion = async () => {
    if (pendingSongDeleteIds.value.length === 0 || isDeletingSongs.value) return
    isDeletingSongs.value = true
    removingSongId.value = pendingSongDeleteIds.value.length === 1 ? pendingSongDeleteIds.value[0] : null
    try {
      const response = await playlistTracksApi.removeMany(id.value, pendingSongDeleteIds.value)
      await loadSongs(true)
      selectedSongIds.value = selectedSongIds.value.filter((songId) => !pendingSongDeleteIds.value.includes(songId))
      showPlaylistNotice(response.data.message || 'Songs removed from this playlist.')
      isSongDeleteConfirmOpen.value = false
      pendingSongDeleteIds.value = []
    } catch (requestError: any) {
      songDeleteError.value = requestError.response?.data?.message || 'Could not remove the selected songs.'
    } finally {
      isDeletingSongs.value = false
      removingSongId.value = null
    }
  }

  const removeSongFromPlaylist = (song: Song) => requestSongDeletion([song.id_music])

  const toggleSortDropdown = () => {
    isSortDropdownOpen.value = !isSortDropdownOpen.value
  }

  const selectSortMode = (mode: SortMode) => {
    if (sortMode.value === mode) {
      // Toggle direction if same sort mode is clicked
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortMode.value = mode
      sortDirection.value = 'asc'
    }
    if (isServerSearchAndSort.value) {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
        searchDebounceTimer = null
      }
      lastSearchedQuery = searchQuery.value.trim()
      loadSongs(true)
    }
  }

  const selectSortDirection = (direction: SortDirection) => {
    if (sortDirection.value !== direction) {
      sortDirection.value = direction
      if (isServerSearchAndSort.value) {
        if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer)
          searchDebounceTimer = null
        }
        lastSearchedQuery = searchQuery.value.trim()
        loadSongs(true)
      }
    }
  }

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node | null
    if (!target) return
    if (sortDropdownRef.value && !sortDropdownRef.value.contains(target)) {
      isSortDropdownOpen.value = false
    }
    if (albumMenuRef.value && !albumMenuRef.value.contains(target)) {
      isAlbumMenuOpen.value = false
    }
    if (songOptionsMenuRef.value && !songOptionsMenuRef.value.contains(target)) {
      closeSongOptions()
    }
  }

  useTitle(() => {
    if (currentSong.value) {
      return `${currentSong.value.title} • ${currentSong.value.artist}`
    } else if (stateAlbumName.value) {
      return stateArtistName.value ? `${stateAlbumName.value} • ${stateArtistName.value}` : stateAlbumName.value
    } else if (songs.value.length > 0) {
      const firstSong = songs.value[0]
      return `${firstSong.album} • ${firstSong.artist}`
    }
    return APP_NAME
  })

  const loadSongs = async (isRefetch = false) => {
    const currentType = type.value
    const currentId = id.value

    if (!currentType || !currentId || Number.isNaN(currentId)) {
      error.value = 'Invalid album parameters'
      isLoading.value = false
      return
    }

    if (songsAbortController) {
      songsAbortController.abort()
    }
    songsAbortController = new AbortController()

    try {
      if (currentType === 'playlist' && !isRefetch) {
        const playlistResponse = await playlistApi.list()
        playlistMetadata.value = (playlistResponse.data.data || []).find((playlist) => playlist.id === currentId) || null
        if (!playlistMetadata.value) throw new Error('Playlist not found.')
        stateAlbumName.value = playlistMetadata.value.title
      }
      if (isRefetch) {
        isSearching.value = true
      } else {
        isLoading.value = true
      }
      error.value = null
      if (!isRefetch && ['album', 'playlist', 'category'].includes(currentType)) {
        const pinResponse = await pinApi.status(currentType as PinnableType, currentId)
        isPinned.value = Boolean(pinResponse.data.data?.pinned)
      }

      const options: GetSongsParams = {
        signal: songsAbortController.signal,
      }
      if (isServerSearchAndSort.value) {
        if (searchQuery.value.trim()) {
          options.search = searchQuery.value.trim()
        }
        if (sortMode.value && sortMode.value !== 'default') {
          options.sort = sortMode.value === 'alphabetical' ? 'title' : sortMode.value
        } else if (sortMode.value === 'default') {
          options.sort = type.value === 'category' ? 'id' : 'default'
        }
        if (sortDirection.value) {
          options.order = sortDirection.value
        }
      }

      const requestedSearch = options.search || ''
      const response = await albumApi.getSongs(currentType, currentId, options)
      songs.value = response.data.data || []
      // Keep playback context independent from server-side search results.
      if (!requestedSearch && !searchQuery.value.trim()) {
        unfilteredSongs.value = [...songs.value]
      }
      // Simpan total lagu asli ketika tidak sedang melakukan pencarian
      if (!searchQuery.value.trim() || totalSongs.value === 0) {
        totalSongs.value = (response.data as any).total || songs.value.length
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return
      }
      error.value = err.response?.data?.message || err.message || 'Failed to load data'
    } finally {
      isLoading.value = false
      isSearching.value = false
    }
  }

  onMounted(() => {
    scrollHandler = () => {
      // Show sticky title when scrolled down past the header (e.g., 80px)
      isStickyVisible.value = window.scrollY > 80
      isScrollTopVisible.value = window.scrollY > 320

      if (toolbarContainerRef.value) {
        // Sticky trigger when toolbar reaches beneath the sticky navbar (60px)
        const rect = toolbarContainerRef.value.getBoundingClientRect()
        isToolbarStuck.value = rect.top <= 61
      }
    }

    window.addEventListener('scroll', scrollHandler, { passive: true })
    window.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleSongOptionsKeydown)

    loadSongs()
  })

  const clearSearch = () => {
    if (!searchQuery.value) return
    searchQuery.value = ''
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
    if (isServerSearchAndSort.value) {
      if (lastSearchedQuery !== '') {
        lastSearchedQuery = ''
        loadSongs(true)
      }
    }
  }

  const handleSearchSubmit = () => {
    if (!isServerSearchAndSort.value) return
    const trimmed = searchQuery.value.trim()
    if (trimmed !== lastSearchedQuery) {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
        searchDebounceTimer = null
      }
      lastSearchedQuery = trimmed
      loadSongs(true)
    }
  }

  // Watcher untuk pencarian dengan debounce ketika type adalah category atau playlist
  watch(searchQuery, (newVal) => {
    if (isBulkDeleteMode.value) selectedSongIds.value = []
    if (!isServerSearchAndSort.value) return

    const trimmed = newVal.trim()
    if (trimmed === lastSearchedQuery) return

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }

    if (trimmed === '') {
      lastSearchedQuery = ''
      loadSongs(true)
      return
    }

    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = null
      lastSearchedQuery = trimmed
      loadSongs(true)
    }, 350)
  })

  watch(
    () => [route.params.type, route.params.id],
    ([newType, newId], [oldType, oldId]) => {
      if (newType !== oldType || newId !== oldId) {
        stateAlbumName.value = history.state?.albumName as string | undefined
        stateArtistName.value = history.state?.artistName as string | undefined
        editedAlbumName.value = null
        editedAlbumCover.value = null
        isAlbumMenuOpen.value = false
        isEditAlbumOpen.value = false
        isEditPlaylistOpen.value = false
        playlistMetadata.value = null
        isBulkDeleteMode.value = false
        selectedSongIds.value = []
        closeSongOptions()
        isSongDeleteConfirmOpen.value = false
        pendingSongDeleteIds.value = []
        if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer)
          searchDebounceTimer = null
        }
        lastSearchedQuery = ''
        searchQuery.value = ''
        unfilteredSongs.value = []
        sortMode.value = 'default'
        sortDirection.value = 'asc'
        isSortDropdownOpen.value = false
        loadSongs()
      }
    },
  )

  onUnmounted(() => {
    artistEditorSession++
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
    }
    window.removeEventListener('click', handleClickOutside)
    window.removeEventListener('keydown', handleSongOptionsKeydown)
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
    if (playlistNoticeTimer) {
      clearTimeout(playlistNoticeTimer)
      playlistNoticeTimer = null
    }
    if (songsAbortController) {
      songsAbortController.abort()
      songsAbortController = null
    }
    if (artistSearchTimer) clearTimeout(artistSearchTimer)
    artistSearchController?.abort()
    restorePageScroll()
  })

  const resolveCoverUrl = (cover: string | null) => {
    if (!cover) return ''
    if (cover.startsWith('http') || cover.startsWith('data:')) return cover

    if (cover.includes('cover_url=cdncloudflare/')) {
      const match = cover.match(/cover_url=cdncloudflare\/(.*)/)
      if (match && match[1]) return `https://cdn.sibeux.my.id/${match[1]}`
    }

    return `https://${cover}`
  }

  const DEFAULT_COVER = '/assets/images/placeholder_cover_music.png'

  const resolveQualityBadge = (song: Song) => {
    if (song.codec_name?.toLowerCase() === 'alac') return '/assets/images/badge-alac.png'

    const sampleRate = Number.parseFloat(song.sample_rate)
    if (sampleRate >= 96) return '/assets/images/badge-en-hires.png'
    if (sampleRate > 0 && song.music_quality?.toLowerCase() === 'lossless')
      return '/assets/images/badge-en-lossless.png'
    return undefined
  }

  const handleCoverError = (e: Event) => {
    const img = e.target as HTMLImageElement
    if (img.dataset.fallbackApplied) return
    img.dataset.fallbackApplied = 'true'
    img.src = DEFAULT_COVER
  }

  const goBack = () => {
    router.back()
  }

  const goToDashboard = () => {
    void router.push({ name: 'dashboard' })
  }


  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const playSong = (song: Song) => {
    if (song.codec_name?.toLowerCase() === 'alac') {
      alert('ALAC audio format cannot be played due to browser compatibility.')
      return
    }

    if (currentSong.value?.id_music === song.id_music) {
      playerStore.togglePlayback()
      return
    }

    const playlist = isServerSearchAndSort.value ? unfilteredSongs.value : allSortedSongs.value
    playerStore.playSong(song, playlist, { type: type.value, id: id.value })
  }

  const albumCovers = computed<string[]>(() => {
    if (songs.value.length === 0) return []

    if (['playlist', 'category'].includes(type.value)) {
      const covers = new Set<string>()
      for (const song of songs.value) {
        if (song.cover) {
          covers.add(resolveCoverUrl(song.cover))
        }
        if (covers.size === 4) break
      }

      const coverUrls = Array.from(covers)
      return coverUrls.length < 4 && coverUrls.length > 0 ? coverUrls.slice(-1) : coverUrls
    }

    if (songs.value[0].cover) {
      return [resolveCoverUrl(songs.value[0].cover)]
    }
    return [DEFAULT_COVER]
  })

  const albumCover = computed(() => {
    const explicitCover = editedAlbumCover.value !== null
      ? editedAlbumCover.value
      : type.value === 'playlist'
        ? playlistMetadata.value?.cover || ''
        : ''
    if (explicitCover) {
      return resolveCoverUrl(explicitCover) || DEFAULT_COVER
    }
    if (albumCovers.value.length > 0) {
      return albumCovers.value[0]
    }
    return DEFAULT_COVER
  })

  const albumType = computed(() => {
    return type.value === 'playlist' ? 'Playlist' : 'Album'
  })

  const displayAlbumName = computed(() => {
    return editedAlbumName.value || (type.value === 'playlist' ? playlistMetadata.value?.title : stateAlbumName.value) || (songs.value.length > 0 ? songs.value[0].album : 'Unknown')
  })

  const openAlbumEditor = async () => {
    const album = editableAlbum.value
    if (!album) return
    const session = ++artistEditorSession
    isAlbumMenuOpen.value = false
    isEditAlbumOpen.value = true
    isResolvingAlbumArtists.value = true
    albumEditError.value = ''
    albumEditMessage.value = ''
    artistSelectionWarning.value = ''
    albumForm.value = {
      name: album.name,
      cover: album.cover || '',
      have_disc: Boolean(album.have_disc),
      is_private: Boolean(album.is_private),
    }
    const creditText = album.author || stateArtistName.value || ''
    const songArtists = [...new Map(
      unfilteredSongs.value
        .flatMap((song) => song.artists || [])
        .map((artist) => [artist.id_artist, { ...artist, song_count: 0 }]),
    ).values()]
    selectedArtists.value = parseArtistCredits(creditText, songArtists).flatMap((credit) => credit.artist ? [credit.artist] : [])
    artistOptions.value = []
    artistSearch.value = ''
    const initialArtistsPromise = loadArtistOptions('')
    try {
      const initialArtists = await initialArtistsPromise
      if (session !== artistEditorSession) return
      const matchingArtists = parseArtistCredits(creditText, [...songArtists, ...initialArtists])
        .flatMap((credit) => credit.artist ? [credit.artist] : [])
      selectedArtists.value = [...new Map([
        ...selectedArtists.value,
        ...matchingArtists,
      ].map((artist) => [artist.id_artist, artist])).values()]
      artistOptions.value = [...new Map([...artistOptions.value, ...selectedArtists.value].map((artist) => [artist.id_artist, artist])).values()]
    } catch (requestError: any) {
      if (session === artistEditorSession) albumEditError.value = requestError.response?.data?.message || 'Could not load album artists.'
    } finally {
      if (session === artistEditorSession) isResolvingAlbumArtists.value = false
    }
  }

  const openPlaylistEditor = () => {
    if (type.value !== 'playlist' || !playlistMetadata.value) return
    isAlbumMenuOpen.value = false
    playlistForm.value = { name: playlistMetadata.value.title, cover: playlistMetadata.value.cover || '' }
    playlistEditError.value = ''
    isEditPlaylistOpen.value = true
  }

  const closePlaylistEditor = () => {
    if (isSavingPlaylist.value) return
    isEditPlaylistOpen.value = false
    playlistEditError.value = ''
  }

  const savePlaylist = async () => {
    if (!playlistMetadata.value || isSavingPlaylist.value || !playlistForm.value.name.trim()) return
    isSavingPlaylist.value = true
    playlistEditError.value = ''
    try {
      const title = playlistForm.value.name.trim()
      const cover = playlistForm.value.cover.trim()
      await playlistApi.update(playlistMetadata.value.id, title, cover)
      playlistMetadata.value = { ...playlistMetadata.value, title, cover }
      stateAlbumName.value = title
      editedAlbumCover.value = cover
      closePlaylistEditor()
      showPlaylistNotice('Playlist updated.')
    } catch (requestError: any) {
      playlistEditError.value = requestError.response?.data?.message || 'Could not save playlist changes.'
    } finally {
      isSavingPlaylist.value = false
    }
  }

  const closeAlbumEditor = () => {
    if (isSavingAlbum.value) return
    isEditAlbumOpen.value = false
    albumEditError.value = ''
    if (artistSearchTimer) clearTimeout(artistSearchTimer)
    artistSearchTimer = null
    artistSearchController?.abort()
    artistSearchController = null
  }

  const saveAlbum = async () => {
    if (!editableAlbum.value || isSavingAlbum.value || isResolvingAlbumArtists.value) return
    if (!albumForm.value.name.trim()) {
      albumEditError.value = 'Album name is required.'
      return
    }
    if (selectedArtists.value.length === 0) {
      albumEditError.value = 'Select at least one artist.'
      return
    }
    const selectedArtistNames = selectedArtists.value.map((artist) => artist.name)
    isSavingAlbum.value = true
    albumEditError.value = ''
    const command: UpdateCatalogCommand = {
      type: 'album',
      id: editableAlbum.value.id,
      name: albumForm.value.name.trim(),
      author: selectedArtistNames.join(', '),
      cover: albumForm.value.cover.trim(),
      have_disc: albumForm.value.have_disc,
      is_private: albumForm.value.is_private,
    }
    let saved = false
    try {
      await catalogApi.updateCatalog(command)
      editedAlbumName.value = command.name
      editedAlbumCover.value = command.cover
      songs.value = songs.value.map((song) => ({ ...song, album: command.name }))
      unfilteredSongs.value = unfilteredSongs.value.map((song) => ({ ...song, album: command.name }))
      if (editableAlbum.value) {
        editableAlbum.value = {
          ...editableAlbum.value,
          name: command.name,
          author: command.author || '',
          cover: command.cover,
          have_disc: Number(command.have_disc),
          is_private: Number(command.is_private),
        }
      }
      stateArtistName.value = command.author || undefined
      saved = true
    } catch (requestError: any) {
      albumEditError.value = requestError.response?.data?.message || 'Could not save album changes.'
    } finally {
      isSavingAlbum.value = false
      if (saved) closeAlbumEditor()
    }
  }

  const toggleAlbumArtist = (artist: ArtistCatalogItem) => {
    if (isResolvingAlbumArtists.value) return
    const isSelected = selectedArtists.value.some((selected) => selected.id_artist === artist.id_artist)
    if (isSelected && selectedArtists.value.length === 1) {
      artistSelectionWarning.value = 'At least one artist must remain selected.'
      return
    }
    selectedArtists.value = isSelected
      ? selectedArtists.value.filter((selected) => selected.id_artist !== artist.id_artist)
      : [...selectedArtists.value, artist]
    artistSelectionWarning.value = ''
    albumEditError.value = ''
  }

  const displayArtistName = computed(() => {
    return stateArtistName.value || (songs.value.length > 0 ? songs.value[0].artist : 'Unknown Artist')
  })

  const heroArtistLinks = computed(() => {
    return songs.value
      .flatMap((song) => song.artists || [])
      .filter((artist, index, all) =>
        all.findIndex((candidate) => candidate.id_artist === artist.id_artist) === index,
      )
  })
  const headerStyle = computed(() => {
    const bg =
      songs.value.length > 0 && songs.value[0].bg_color ? songs.value[0].bg_color : '#3b3b3b'
    return {
      background: `linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.7) 100%), ${bg}`,
    }
  })

  const stickyNavBackground = computed(() => {
    const bg =
      songs.value.length > 0 && songs.value[0].bg_color ? songs.value[0].bg_color : '#3b3b3b'
    return `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), ${bg}`
  })

  const toolbarStickyStyle = computed(() => {
    if (!isToolbarStuck.value) return undefined
    const bg =
      songs.value.length > 0 && songs.value[0].bg_color ? songs.value[0].bg_color : '#161922'
    return {
      background: `linear-gradient(rgba(14, 17, 26, 0.86), rgba(14, 17, 26, 0.86)), ${bg}`,
    }
  })
</script>

<template>
  <AppLayout
    :override-brand="isStickyVisible"
    :nav-background="isStickyVisible ? stickyNavBackground : undefined"
  >
    <template #nav-brand>
      <div class="album-page__sticky-brand">
        <button
          class="album-page__back-btn album-page__back-btn--sticky"
          aria-label="Go back"
          @click="goBack"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div class="album-page__sticky-title">
          {{ displayAlbumName }}
        </div>
      </div>
    </template>

    <div class="album-page">
      <div class="album-page__hero" :style="headerStyle">
        <div class="album-page__hero-topbar">
          <button
            class="album-page__back-btn album-page__back-btn--hero"
            aria-label="Go back"
            title="Go back"
            @click="goBack"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
        </div>
      <div v-if="(isAdmin && type === 'album') || type === 'playlist'" ref="albumMenuRef" class="album-page__admin-actions">
        <button
          class="album-page__more-btn"
          type="button"
          :aria-label="type === 'playlist' ? 'Playlist menu' : 'Album menu'"
          :title="type === 'playlist' ? 'Playlist menu' : 'Album menu'"
          :aria-expanded="isAlbumMenuOpen"
          @click.stop="isAlbumMenuOpen = !isAlbumMenuOpen"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
        </button>
        <div v-if="isAlbumMenuOpen" class="album-page__more-menu" @click.stop>
          <button v-if="type === 'album'" type="button" :disabled="isPreparingAlbumEdit || !editableAlbum" @click="openAlbumEditor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
            Edit album
          </button>
          <button v-else type="button" :disabled="!playlistMetadata" @click="openPlaylistEditor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
            Edit playlist
          </button>
          <p v-if="albumEditError && !editableAlbum" role="alert">{{ albumEditError }}</p>
        </div>
      </div>
        <div class="album-page__hero-content">
          <div class="album-page__hero-cover-wrapper">
            <div v-if="albumCovers.length === 4" class="album-page__hero-cover-grid">
              <img
                v-for="(coverUrl, index) in albumCovers"
                :key="`hero-grid-${index}`"
                v-img-cache="coverUrl"
                :alt="`Cover ${index + 1}`"
                @error="handleCoverError"
              />
            </div>
            <img
              v-else
              v-img-cache="albumCover"
              alt="Album Cover"
              class="album-page__hero-cover"
              @error="handleCoverError"
            />
          </div>
          <div class="album-page__hero-details">
            <div class="album-page__hero-tag-row">
              <span class="album-page__hero-type">{{ albumType }}</span>
              <span v-if="isPinned" class="album-page__hero-pinned" title="Pinned">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8.8.8-.8v-6H18v-2l-2-2z" />
                </svg>
                Pinned
              </span>
            </div>
            <h1 class="album-page__hero-title">{{ displayAlbumName }}</h1>
            <div class="album-page__hero-meta">
              <div class="album-page__hero-artist-avatar-wrapper">
                <img
                  v-img-cache="albumCover"
                  alt="Artist"
                  class="album-page__hero-artist-avatar"
                  @error="handleCoverError"
                />
              </div>
              <span class="album-page__hero-artist"><ArtistLinks :artists="heroArtistLinks" :fallback="displayArtistName" preserve-fallback-credits /></span>
              <span class="album-page__hero-dot">•</span>
              <span class="album-page__hero-tracks">{{ totalSongs }} songs</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="album-page__state">
        <svg
          class="album-page__spinner"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        Loading songs...
      </div>

      <div v-else-if="error" class="album-page__state album-page__state--error">
        {{ error }}
      </div>

      <div v-else-if="sortedSongs.length === 0 && !searchQuery" class="album-page__state">No songs found.</div>

      <div v-else class="album-page__song-section">
        <!-- Sticky Glass Sub-Toolbar -->
        <div
          v-if="isToolbarVisible"
          ref="toolbarContainerRef"
          class="album-page__toolbar-container"
          :class="{ 'album-page__toolbar-container--stuck': isToolbarStuck }"
          :style="toolbarStickyStyle"
        >
          <div class="album-page__toolbar">
            <div class="album-page__toolbar-left">
              <div
                class="album-page__search-wrapper"
                :class="{ 'album-page__search-wrapper--searching': isSearching }"
              >
                <!-- Animated Spinner saat mencari lagu -->
                <span
                  v-if="isSearching"
                  class="album-page__search-spinner"
                  aria-label="Searching songs..."
                ></span>
                <svg
                  v-else
                  class="album-page__search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  v-model="searchQuery"
                  type="search"
                  class="album-page__search-input"
                  placeholder="Search songs..."
                  aria-label="Search songs in album"
                  autocomplete="off"
                  @keydown.enter="handleSearchSubmit"
                  @keydown.esc="clearSearch"
                />
                <button
                  v-if="searchQuery"
                  type="button"
                  class="album-page__search-clear"
                  aria-label="Clear search"
                  @click="clearSearch"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <span v-if="searchQuery" class="album-page__toolbar-count">
                {{ sortedSongs.length }} {{ sortedSongs.length === 1 ? 'song' : 'songs' }}
              </span>
            </div>

            <div v-if="type === 'playlist'" class="album-page__playlist-controls">
              <button
                type="button"
                class="album-page__playlist-select-btn"
                :class="{ 'album-page__playlist-select-btn--active': isBulkDeleteMode }"
                :aria-pressed="isBulkDeleteMode"
                @click="toggleBulkDeleteMode"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="16" rx="3" />
                  <path v-if="isBulkDeleteMode" d="m8 12 2.5 2.5L16 9" />
                </svg>
                {{ isBulkDeleteMode ? 'Cancel' : 'Select songs' }}
              </button>
              <template v-if="isBulkDeleteMode">
                <span class="album-page__playlist-selected-count">{{ selectedSongIds.length }} selected</span>
                <button
                  type="button"
                  class="album-page__playlist-delete-btn"
                  :disabled="selectedSongIds.length === 0 || isDeletingSongs"
                  @click="requestSongDeletion(selectedSongIds)"
                >
                  Delete
                </button>
              </template>
            </div>

            <div ref="sortDropdownRef" class="album-page__sort-wrapper">
            <button
              type="button"
              class="album-page__sort-btn"
              :class="{ 'album-page__sort-btn--active': isSortDropdownOpen }"
              aria-label="Sort songs"
              aria-haspopup="true"
              :aria-expanded="isSortDropdownOpen"
              @click.stop="toggleSortDropdown"
            >
              <!-- Ascending icon -->
              <svg
                v-if="sortDirection === 'asc'"
                class="album-page__sort-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m3 8 4-4 4 4" />
                <path d="M7 4v16" />
                <path d="M11 12h4" />
                <path d="M11 16h7" />
                <path d="M11 20h10" />
              </svg>
              <!-- Descending icon -->
              <svg
                v-else
                class="album-page__sort-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m3 16 4 4 4-4" />
                <path d="M7 20V4" />
                <path d="M11 4h10" />
                <path d="M11 8h7" />
                <path d="M11 12h4" />
              </svg>
              <span>Sort: {{ sortLabel }}</span>
              <span class="album-page__sort-indicator">{{
                sortDirection === 'asc' ? 'Asc' : 'Desc'
              }}</span>
              <svg
                class="album-page__sort-chevron"
                :class="{ 'album-page__sort-chevron--open': isSortDropdownOpen }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div v-if="isSortDropdownOpen" class="album-page__sort-menu">
              <div class="album-page__sort-menu-header">Sort By</div>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortMode === 'default' }"
                @click="selectSortMode('default')"
              >
                <span>Default (ID)</span>
                <svg
                  v-if="sortMode === 'default'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortMode === 'alphabetical' }"
                @click="selectSortMode('alphabetical')"
              >
                <span>Alphabetical</span>
                <svg
                  v-if="sortMode === 'alphabetical'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortMode === 'artist' }"
                @click="selectSortMode('artist')"
              >
                <span>Artist</span>
                <svg
                  v-if="sortMode === 'artist'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>

              <div class="album-page__sort-divider"></div>
              <div class="album-page__sort-menu-header">Order</div>

              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortDirection === 'asc' }"
                @click="selectSortDirection('asc')"
              >
                <div class="album-page__sort-option-content">
                  <svg
                    class="album-page__sort-option-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m3 8 4-4 4 4" />
                    <path d="M7 4v16" />
                  </svg>
                  <span>Ascending</span>
                </div>
                <svg
                  v-if="sortDirection === 'asc'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
              <button
                type="button"
                class="album-page__sort-option"
                :class="{ 'album-page__sort-option--active': sortDirection === 'desc' }"
                @click="selectSortDirection('desc')"
              >
                <div class="album-page__sort-option-content">
                  <svg
                    class="album-page__sort-option-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m3 16 4 4 4-4" />
                    <path d="M7 20V4" />
                  </svg>
                  <span>Descending</span>
                </div>
                <svg
                  v-if="sortDirection === 'desc'"
                  class="album-page__sort-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Indeterminate progress bar saat pencarian berjalan -->
        <div
          class="album-page__search-progress-bar"
          :class="{ 'album-page__search-progress-bar--active': isSearching }"
          aria-hidden="true"
        >
          <div v-if="isSearching" class="album-page__search-progress-indeterminate"></div>
        </div>
      </div>

      <div class="album-page__content">
          <table class="song-list" :class="{ 'song-list--searching': isSearching }">
            <thead>
              <tr>
                <th
                  class="song-list__th song-list__th--index song-list__th--sortable"
                  :class="{ 'song-list__th--active': sortMode === 'default' }"
                  title="Sort by default order"
                  @click="selectSortMode('default')"
                >
                  <span class="song-list__th-content">
                    <input
                      v-if="type === 'playlist' && isBulkDeleteMode"
                      type="checkbox"
                      class="playlist-track-checkbox"
                      aria-label="Select all visible songs"
                      :checked="allVisibleSongsSelected"
                      @click.stop
                      @change="toggleVisibleSongSelection"
                    />
                    <span v-else>#</span>
                    <svg
                      v-if="sortMode === 'default' && !(type === 'playlist' && isBulkDeleteMode)"
                      class="song-list__th-arrow"
                      :class="{ 'song-list__th-arrow--desc': sortDirection === 'desc' }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </span>
                </th>
                <th
                  class="song-list__th song-list__th--title song-list__th--sortable"
                  :class="{ 'song-list__th--active': sortMode === 'alphabetical' }"
                  title="Sort by title"
                  @click="selectSortMode('alphabetical')"
                >
                  <span class="song-list__th-content">
                    <span>Title</span>
                    <svg
                      v-if="sortMode === 'alphabetical'"
                      class="song-list__th-arrow"
                      :class="{ 'song-list__th-arrow--desc': sortDirection === 'desc' }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </span>
                </th>
                <th
                  class="song-list__th song-list__th--artist song-list__th--sortable"
                  :class="{ 'song-list__th--active': sortMode === 'artist' }"
                  title="Sort by artist"
                  @click="selectSortMode('artist')"
                >
                  <span class="song-list__th-content">
                    <span>Artist</span>
                    <svg
                      v-if="sortMode === 'artist'"
                      class="song-list__th-arrow"
                      :class="{ 'song-list__th-arrow--desc': sortDirection === 'desc' }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                  </span>
                </th>
                <th v-if="canAddSongsToPlaylist || type === 'playlist'" class="song-list__th song-list__th--actions" aria-label="Song options"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Shimmer skeleton jika mencari saat list sebelumnya kosong -->
              <template v-if="isSearching && sortedSongs.length === 0">
                <tr
                  v-for="n in 5"
                  :key="`search-skeleton-${n}`"
                  class="album-page__skeleton-row"
                >
                  <td class="song-list__td song-list__td--index">
                    <div class="album-page__skeleton-box album-page__skeleton-box--index"></div>
                  </td>
                  <td class="song-list__td song-list__td--title-cover">
                    <div class="album-page__skeleton-cell">
                      <div class="album-page__skeleton-cover"></div>
                      <div class="album-page__skeleton-meta">
                        <div class="album-page__skeleton-box album-page__skeleton-box--title"></div>
                        <div class="album-page__skeleton-box album-page__skeleton-box--artist"></div>
                      </div>
                    </div>
                  </td>
                  <td class="song-list__td song-list__td--artist">
                    <div class="album-page__skeleton-box album-page__skeleton-box--artist"></div>
                  </td>
                  <td v-if="canAddSongsToPlaylist || type === 'playlist'" class="song-list__td song-list__td--actions"></td>
                </tr>
              </template>
              <tr v-else-if="sortedSongs.length === 0" class="album-page__no-results-row">
                <td :colspan="canAddSongsToPlaylist || type === 'playlist' ? 4 : 3" class="album-page__no-results">
                  No songs found matching "{{ searchQuery }}"
                </td>
              </tr>
              <tr
                v-for="(song, index) in sortedSongs"
                v-else
                :key="song.id_music"
                class="song-list__tr"
                :class="{
                  'song-list__tr--active': currentSong?.id_music === song.id_music,
                  'song-list__tr--playlist': type === 'playlist',
                }"
                @contextmenu.prevent.stop="openSongOptions($event, song)"
              >
                <td class="song-list__td song-list__td--index">
                  <input
                    v-if="type === 'playlist' && isBulkDeleteMode"
                    type="checkbox"
                    class="playlist-track-checkbox"
                    :aria-label="`Select ${song.title}`"
                    :checked="selectedSongIds.includes(song.id_music)"
                    :disabled="isDeletingSongs"
                    @click.stop
                    @change="toggleSongSelection(song.id_music)"
                  />
                  <span v-else>{{ index + 1 }}</span>
                </td>
                <td class="song-list__td song-list__td--title-cover">
                  <div
                    class="song-list__cover-wrapper"
                    :title="
                      song.codec_name?.toLowerCase() === 'alac' ? 'ALAC format is unsupported' : ''
                    "
                    :style="
                      song.codec_name?.toLowerCase() === 'alac'
                        ? 'cursor: not-allowed; opacity: 0.7;'
                        : ''
                    "
                    @click="playSong(song)"
                  >
                    <div class="song-list__cover-surface">
                      <img
                        v-if="resolveCoverUrl(song.cover)"
                        v-img-cache="resolveCoverUrl(song.cover)"
                        :alt="song.title"
                        class="song-list__cover"
                        loading="lazy"
                        @error="handleCoverError"
                      />
                      <div v-else class="song-list__cover-placeholder">
                        <img
                          v-img-cache="DEFAULT_COVER"
                          :alt="song.title"
                          class="song-list__cover"
                        />
                      </div>
                      <div
                        class="song-list__play-overlay"
                        :class="{
                          'song-list__play-overlay--active':
                            currentSong?.id_music === song.id_music && isPlaying,
                          'song-list__play-overlay--disabled':
                            song.codec_name?.toLowerCase() === 'alac',
                        }"
                      >
                        <svg
                          v-if="currentSong?.id_music === song.id_music && isPlaying"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                        <svg
                          v-else-if="song.codec_name?.toLowerCase() === 'alac'"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                        </svg>
                        <svg v-else viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    <img
                      v-if="resolveQualityBadge(song)"
                      v-img-cache="resolveQualityBadge(song)"
                      :alt="`${song.codec_name} quality badge`"
                      class="song-list__quality-badge"
                    />
                  </div>
                  <span
                    class="song-list__title"
                    :class="{ 'song-list__title--active': currentSong?.id_music === song.id_music }"
                    :title="song.title"
                    >{{ song.title }}</span
                  >
                </td>
                <td class="song-list__td song-list__td--artist" :title="song.artist">
                  <ArtistLinks :artists="song.artists" :fallback="song.artist" />
                </td>
                <td v-if="canAddSongsToPlaylist || type === 'playlist'" class="song-list__td song-list__td--actions">
                  <button
                    v-if="!(type === 'playlist' && isBulkDeleteMode)"
                    type="button"
                    class="song-list__action-btn song-list__action-btn--menu"
                    :aria-label="`Options for ${song.title}`"
                    :title="`Options for ${song.title}`"
                    aria-haspopup="menu"
                    @click.stop="openSongOptions($event, song)"
                    @contextmenu.prevent.stop="openSongOptions($event, song)"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <button
      v-if="isScrollTopVisible"
      type="button"
      class="album-page__scroll-top"
      aria-label="Scroll to top"
      title="Scroll to top"
      @click="scrollToTop"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
    <Transition name="playlist-notice">
      <div v-if="playlistActionNotice" class="playlist-notice" :class="{ 'playlist-notice--error': playlistActionIsError }" :role="playlistActionIsError ? 'alert' : 'status'">
        <svg v-if="!playlistActionIsError" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
        <span>{{ playlistActionNotice }}</span>
      </div>
    </Transition>
    <div
      v-if="songOptionsMenu"
      ref="songOptionsMenuRef"
      class="song-options-context-menu"
      :class="{ 'song-options-context-menu--measuring': !songOptionsMenu.positioned }"
      role="menu"
      :aria-label="`Options for ${songOptionsMenu.song.title}`"
      :style="{ left: `${songOptionsMenu.x}px`, top: `${songOptionsMenu.y}px` }"
      @click.stop
      @contextmenu.prevent
    >
      <div class="song-options-context-menu__heading">
        <strong :title="songOptionsMenu.song.title">{{ songOptionsMenu.song.title }}</strong>
        <span :title="songOptionsMenu.song.artist">{{ songOptionsMenu.song.artist }}</span>
      </div>
      <button v-if="canAddSongsToPlaylist" type="button" role="menuitem" @click="addSongFromOptions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /><path d="M17 5h6m-3-3v6" /></svg>
        Add to playlist
      </button>
      <button v-if="type === 'playlist'" type="button" class="song-options-context-menu__remove" role="menuitem" @click="removeSongFromOptions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>
        Remove from playlist
      </button>
    </div>
    <div v-if="isPlaylistPickerOpen" class="playlist-picker-backdrop" @click.self="closePlaylistPicker" @keydown.esc="closePlaylistPicker">
      <section class="playlist-picker" role="dialog" aria-modal="true" aria-labelledby="playlist-picker-title">
        <header class="playlist-picker__header">
          <div>
            <span class="playlist-picker__eyebrow">ADD SONG</span>
            <h2 id="playlist-picker-title">Choose a playlist</h2>
            <p v-if="selectedSongForPlaylist" :title="selectedSongForPlaylist.title">{{ selectedSongForPlaylist.title }}</p>
          </div>
          <button type="button" aria-label="Close" :disabled="isPlaylistPickerBusy" @click="closePlaylistPicker">×</button>
        </header>
        <div v-if="isLoadingPlaylists" class="playlist-picker__state" role="status">Loading your playlists…</div>
        <div v-else-if="playlistOptions.length" class="playlist-picker__groups">
          <div v-if="playlistsContainingSong.length" class="playlist-picker__group">
            <h3 class="playlist-picker__group-title">Already in</h3>
            <div class="playlist-picker__list">
              <div v-for="playlist in playlistsContainingSong" :key="`existing-${playlist.id}`" class="playlist-picker__item playlist-picker__item--existing">
                <span class="playlist-picker__item-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                </span>
                <span class="playlist-picker__item-copy"><strong>{{ playlist.title }}</strong><small>This song is already here</small></span>
                <span v-if="removingFromPlaylistId === playlist.id" class="playlist-picker__item-pending playlist-picker__item-pending--danger">Removing…</span>
                <button
                  v-else
                  type="button"
                  class="playlist-picker__remove-btn"
                  :disabled="isPlaylistPickerBusy"
                  :title="`Remove from ${playlist.title}`"
                  :aria-label="`Remove from ${playlist.title}`"
                  @click="removeSongFromPlaylistPicker(playlist)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>
                </button>
              </div>
            </div>
          </div>
          <div v-if="playlistsAvailableForSong.length" class="playlist-picker__group">
            <h3 class="playlist-picker__group-title">Add to playlist</h3>
            <div class="playlist-picker__list">
          <button
            v-for="playlist in playlistsAvailableForSong"
            :key="playlist.id"
            type="button"
            class="playlist-picker__item"
            :disabled="isPlaylistPickerBusy"
            @click="addSongToPlaylist(playlist)"
          >
            <span class="playlist-picker__item-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            </span>
            <span class="playlist-picker__item-copy"><strong>{{ playlist.title }}</strong><small>Your playlist</small></span>
            <span v-if="addingToPlaylistId === playlist.id" class="playlist-picker__item-pending">Adding…</span>
            <svg v-else class="playlist-picker__item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
            </div>
          </div>
          <div v-if="!playlistsAvailableForSong.length" class="playlist-picker__state playlist-picker__state--compact">This song is already in all your playlists.</div>
        </div>
        <div v-else-if="!playlistPickerError" class="playlist-picker__state">
          <strong>No playlists yet</strong>
          <span>Create a playlist first, then add this song.</span>
          <button type="button" @click="closePlaylistPicker(); goToDashboard()">Go to playlists</button>
        </div>
        <p v-if="playlistPickerError" class="playlist-picker__error" role="alert">{{ playlistPickerError }}</p>
      </section>
    </div>
    <div v-if="isSongDeleteConfirmOpen" class="playlist-picker-backdrop" @click.self="closeSongDeleteConfirm" @keydown.esc="closeSongDeleteConfirm">
      <section class="playlist-delete-confirm" role="alertdialog" aria-modal="true" aria-labelledby="playlist-delete-confirm-title" aria-describedby="playlist-delete-confirm-description">
        <div class="playlist-delete-confirm__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>
        </div>
        <h2 id="playlist-delete-confirm-title">{{ pendingSongDeleteIds.length > 1 ? 'Remove selected songs?' : 'Remove song?' }}</h2>
        <p id="playlist-delete-confirm-description" v-if="pendingSongDeleteIds.length === 1">
          Remove <strong>{{ pendingSongDeleteTitle }}</strong> from this playlist? The song itself will not be deleted.
        </p>
        <p id="playlist-delete-confirm-description" v-else>
          Remove <strong>{{ pendingSongDeleteIds.length }} songs</strong> from this playlist? The songs themselves will not be deleted.
        </p>
        <p v-if="songDeleteError" class="playlist-delete-confirm__error" role="alert">{{ songDeleteError }}</p>
        <footer>
          <button type="button" class="playlist-delete-confirm__cancel" :disabled="isDeletingSongs" @click="closeSongDeleteConfirm">Cancel</button>
          <button type="button" class="playlist-delete-confirm__submit" :disabled="isDeletingSongs" @click="confirmSongDeletion">
            {{ isDeletingSongs ? 'Removing…' : pendingSongDeleteIds.length > 1 ? `Remove ${pendingSongDeleteIds.length} songs` : 'Remove song' }}
          </button>
        </footer>
      </section>
    </div>
    <div v-if="isEditAlbumOpen" class="album-edit-modal" role="presentation" @click.self="closeAlbumEditor" @keydown.esc.prevent="closeAlbumEditor">
      <section class="album-edit-modal__panel" role="dialog" aria-modal="true" aria-labelledby="album-edit-title" tabindex="-1">
        <header class="album-edit-modal__header">
          <div><p>ADMIN · ALBUM</p><h2 id="album-edit-title">Edit album</h2><span>Changes are applied directly to the catalog.</span></div>
          <button type="button" aria-label="Close" :disabled="isSavingAlbum" @click="closeAlbumEditor">×</button>
        </header>
        <form v-if="editableAlbum" class="album-edit-modal__form" :class="{ 'album-edit-modal__form--saving': isSavingAlbum }" @submit.prevent="saveAlbum">
          <label><span>Album name <i class="album-edit-modal__required" aria-hidden="true">*</i></span><input v-model="albumForm.name" required maxlength="255" autofocus :aria-invalid="!albumForm.name.trim()" :aria-describedby="!albumForm.name.trim() ? 'album-name-error' : undefined"><small v-if="!albumForm.name.trim()" id="album-name-error" class="album-edit-modal__field-error">Can't be null</small></label>
          <section class="album-edit-modal__artist-picker" aria-label="Select album artists">
            <p v-if="artistSelectionWarning" class="album-edit-modal__artist-warning" role="alert">{{ artistSelectionWarning }}</p>
            <div class="album-edit-modal__artist-heading"><span>Album artists <i class="album-edit-modal__required" aria-hidden="true">*</i></span><small v-if="!isResolvingAlbumArtists">{{ selectedArtists.length }} selected</small></div>
            <div v-if="!isResolvingAlbumArtists" class="album-edit-modal__selected-artists">
              <span class="album-edit-modal__selected-label">Selected</span>
              <div v-if="selectedArtists.length" class="album-edit-modal__artist-chips">
                <button v-for="artist in selectedArtists" :key="artist.id_artist" type="button" class="album-edit-modal__artist-chip" :disabled="selectedArtists.length === 1" :aria-label="selectedArtists.length === 1 ? 'At least one artist must remain selected' : `Remove ${artist.name}`" :title="selectedArtists.length === 1 ? 'At least one artist must remain selected' : `Remove ${artist.name}`" @click="toggleAlbumArtist(artist)">
                  {{ artist.name }} <span aria-hidden="true">×</span>
                </button>
              </div>
              <span v-else class="album-edit-modal__artist-none">No artists selected yet.</span>
            </div>
            <input v-model="artistSearch" :disabled="isResolvingAlbumArtists" class="album-edit-modal__artist-search" type="search" placeholder="Search artists…" autocomplete="off" @input="scheduleArtistSearch">
            <div v-if="isLoadingAlbumArtists || isResolvingAlbumArtists" class="album-edit-modal__artist-skeleton" role="status" aria-label="Loading artists" aria-busy="true">
              <div v-for="row in 5" :key="row" class="album-edit-modal__skeleton-row" aria-hidden="true"><span></span><span></span></div>
            </div>
            <div v-else class="album-edit-modal__artist-list" :class="{ 'album-edit-modal__artist-list--invalid': selectedArtists.length === 0 }">
              <label v-for="artist in visibleArtistOptions" :key="artist.id_artist" class="album-edit-modal__artist-option">
                <input type="checkbox" :checked="selectedArtists.some((selected) => selected.id_artist === artist.id_artist)" :disabled="selectedArtists.length === 1 && selectedArtists[0]?.id_artist === artist.id_artist" :title="selectedArtists.length === 1 && selectedArtists[0]?.id_artist === artist.id_artist ? 'At least one artist must remain selected' : ''" @change="toggleAlbumArtist(artist)">
                <span>{{ artist.name }}</span>
              </label>
              <p v-if="artistOptions.length === 0 && selectedArtists.length === 0" class="album-edit-modal__artist-empty">{{ artistSearch ? 'No artists found.' : 'No artists to display.' }}</p>
            </div>
            <p v-if="!isResolvingAlbumArtists && selectedArtists.length === 0" class="album-edit-modal__field-error" role="alert">Can't be null</p>
            <small>Select one or more artists from the catalog. Search results are limited to 50.</small>
          </section>
          <label><span>Cover image</span><input v-model="albumForm.cover" type="text" maxlength="2048" placeholder="Image URL or path"></label>
          <div class="album-edit-modal__options">
            <label><input v-model="albumForm.is_private" type="checkbox"><span><strong>Premium album</strong><small>Only premium members and admins can access it.</small></span></label>
            <label><input v-model="albumForm.have_disc" type="checkbox"><span><strong>Has multiple discs</strong><small>Show disc grouping on the album page.</small></span></label>
          </div>
          <p v-if="albumEditMessage" class="album-edit-modal__success" role="status">{{ albumEditMessage }}</p>
          <p v-if="albumEditError" class="album-edit-modal__error" role="alert">{{ albumEditError }}</p>
          <footer><button type="button" class="album-edit-modal__cancel" :disabled="isSavingAlbum" @click="closeAlbumEditor">Close</button><button type="submit" class="album-edit-modal__save" :aria-busy="isSavingAlbum" :disabled="isSavingAlbum || isResolvingAlbumArtists || !albumForm.name.trim() || selectedArtists.length === 0 || !!artistSelectionWarning"><span v-if="isSavingAlbum" class="album-edit-modal__save-spinner" aria-hidden="true"></span>{{ isSavingAlbum ? 'Saving…' : 'Save changes' }}</button></footer>
        </form>
        <div v-else class="album-edit-modal__state album-edit-modal__state--error">{{ albumEditError }}</div>
      </section>
    </div>
    <div v-if="isEditPlaylistOpen" class="album-edit-modal" role="presentation" @click.self="closePlaylistEditor" @keydown.esc.prevent="closePlaylistEditor">
      <section class="album-edit-modal__panel" role="dialog" aria-modal="true" aria-labelledby="playlist-edit-title" tabindex="-1">
        <header class="album-edit-modal__header">
          <div><p>PLAYLIST</p><h2 id="playlist-edit-title">Edit playlist</h2><span>Update your playlist details.</span></div>
          <button type="button" aria-label="Close" :disabled="isSavingPlaylist" @click="closePlaylistEditor">×</button>
        </header>
        <form class="album-edit-modal__form" :class="{ 'album-edit-modal__form--saving': isSavingPlaylist }" @submit.prevent="savePlaylist">
          <label><span>Playlist name <i class="album-edit-modal__required" aria-hidden="true">*</i></span><input v-model="playlistForm.name" required maxlength="255" autofocus :aria-invalid="!playlistForm.name.trim()"><small v-if="!playlistForm.name.trim()" class="album-edit-modal__field-error">Can't be null</small></label>
          <label><span>Cover image</span><input v-model="playlistForm.cover" type="text" maxlength="2048" placeholder="Image URL or path"></label>
          <p v-if="playlistEditError" class="album-edit-modal__error" role="alert">{{ playlistEditError }}</p>
          <footer><button type="button" class="album-edit-modal__cancel" :disabled="isSavingPlaylist" @click="closePlaylistEditor">Close</button><button type="submit" class="album-edit-modal__save" :aria-busy="isSavingPlaylist" :disabled="isSavingPlaylist || !playlistForm.name.trim()"><span v-if="isSavingPlaylist" class="album-edit-modal__save-spinner" aria-hidden="true"></span>{{ isSavingPlaylist ? 'Saving…' : 'Save changes' }}</button></footer>
        </form>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped src="./AlbumPage.css"></style>
