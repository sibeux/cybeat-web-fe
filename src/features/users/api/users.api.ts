import apiClient from '@/core/infrastructure/http/axios'
import type {
  ChangeUserRoleCommand,
  ChangeUserRoleResponse,
  UserListResponse,
} from '../types/user.types'

export const usersApi = {
  listUsers() {
    return apiClient.get<UserListResponse>('/admin/users/')
  },

  changeUserRole(command: ChangeUserRoleCommand) {
    return apiClient.patch<ChangeUserRoleResponse>('/admin/users/', command)
  },
}
