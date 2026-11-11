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
