export interface ArtistLink {
  id_artist: number
  name: string
}

export interface Song {
  id_music: number
  title: string
  artist: string
  artists: ArtistLink[]
  cover: string
  disc_number: number
  album: string
  metadata_id_music: number
  codec_name: string
  music_quality: string
  sample_rate: string
  bit_rate: string
  bits_per_raw_sample: string
  bg_color: string | null
  text_color: string | null
  cache_music_id: number | null
  source_album_id?: number | null
  source_album_type?: string | null
  linked_album_id?: number | null
}
