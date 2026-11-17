import apiClient from '@/core/infrastructure/http/axios'
import type { AdminAlbum, UpdateCatalogCommand } from '../types/catalog.types'

export const catalogApi = {
  getAlbum(albumId: number) {
    return apiClient.get<{ status: string; data: { album: AdminAlbum } }>('/admin/catalog/', {
      params: { album_id: albumId },
    })
  },

  updateCatalog(command: UpdateCatalogCommand) {
    return apiClient.patch('/admin/catalog/', command)
  },
}
