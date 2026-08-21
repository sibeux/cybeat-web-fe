export interface Song {
  id_music: number
  title: string
  artist: string
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
}
