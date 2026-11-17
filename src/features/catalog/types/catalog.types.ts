export interface AdminAlbum {
  id: number
  name: string
  author: string
  cover: string | null
  have_disc: number
  is_private: number
}

export interface UpdateCatalogCommand {
  type: 'album' | 'category'
  id: number
  name: string
  cover: string
  author?: string
  have_disc?: boolean
  is_private?: boolean
  album_ids?: number[]
}
