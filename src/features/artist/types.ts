export interface ArtistLink {
  id_artist: number
  name: string
}

export interface ArtistAlbum {
  id: number
  type: 'album'
  title: string
  cover: string | null
  bg_color: string | null
  author: string | null
  have_disc: number
}

export interface ArtistPageData {
  artist: ArtistLink
  albums: ArtistAlbum[]
}

export interface ArtistCatalogItem extends ArtistLink {
  song_count: number
}

export interface ArtistCatalogResponse {
  status: string
  count: number
  data: ArtistCatalogItem[]
}

export interface ArtistMergePreview {
  source: ArtistCatalogItem
  target: ArtistCatalogItem
  shared_song_count: number
  result_song_count: number
}

export interface ArtistMergeCommand {
  source_artist_id: number
  target_artist_id: number
  confirm_source_name: string
}

export interface ArtistMergeResult {
  removed_artist: ArtistLink
  kept_artist: ArtistLink
  source_song_count: number
  target_song_count_before: number
  shared_song_count: number
  moved_link_count: number
  target_song_count_after: number
}

export interface ArtistSplitPreview {
  source: ArtistLink
  targets: (ArtistLink & { is_new: boolean; id_artist: number | null })[]
  song_count: number
  song_sample: { id_music: number; title: string }[]
  albums: { id: number; name: string; author_before: string; author_after: string }[]
  preview_token: string
}

export interface ArtistSplitResult {
  source: ArtistLink
  targets: ArtistSplitPreview['targets']
  song_count: number
  album_count: number
}

export interface ArtistEditPreview {
  artist: ArtistLink
  albums: { id: number; name: string; author_before: string }[]
  preview_token: string
}

export interface ArtistEditResult {
  artist: ArtistLink
  album_count: number
}
