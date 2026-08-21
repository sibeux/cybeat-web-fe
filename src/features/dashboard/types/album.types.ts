export interface Album {
  id: number
  type: string
  title: string
  cover: string | null
  bg_color: string | null
  author: string
  played_at: string | null
  pin_at: string | null
  have_disc: number
  created_at: string
}

export interface CategoryCoverObject {
  category_id: number
  cover_1: string | null
  cover_2: string | null
  cover_3: string | null
  cover_4: string | null
  total_non_null_cover: number
}

export interface Category {
  id: number
  type: string
  title: string
  cover: string | CategoryCoverObject | null
  bg_color: string | null
  author: number
  played_at: string | null
  pin_at: string | null
  have_disc: number
  created_at: string
}

export interface MusicDashboardData {
  album: Album[]
  category: Category[]
  playlist: any[]
}
