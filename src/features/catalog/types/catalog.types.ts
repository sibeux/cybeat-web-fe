export interface AdminAlbum {
  id: number
  name: string
  author: string
  cover: string | null
  have_disc: number
  is_private: number
}

export interface AdminCategory {
  id: number
  name: string
  cover: string | null
  album_ids: number[]
}

export interface AdminCatalogResponse {
  status: string
  data: { albums: AdminAlbum[]; categories: AdminCategory[] }
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
