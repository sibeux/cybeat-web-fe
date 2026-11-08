import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { usersApi } from '../api/users.api'
import type { ManagedUser, UserRole } from '../types/user.types'
import { normalizeError } from '@/core/shared/utils/error-normalizer'

export const useUsersStore = defineStore('users', () => {
  const users = ref<ManagedUser[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalUsers = computed(() => users.value.length)

  async function fetchUsers(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { data } = await usersApi.listUsers()
      users.value = data.data
    } catch (cause) {
      error.value = normalizeError(cause)
      throw cause
    } finally {
      isLoading.value = false
    }
  }

  async function changeRole(userId: number, role: UserRole): Promise<void> {
    const user = users.value.find((item) => Number(item.user_id) === userId)
    if (!user) throw new Error('User not found')
    const previousRole = user.role
    user.role = role
    error.value = null
    try {
      const { data } = await usersApi.changeUserRole({ user_id: userId, role })
      user.role = data.data.role
    } catch (cause) {
      user.role = previousRole
      error.value = normalizeError(cause)
      throw cause
    }
  }

  return { users, isLoading, error, totalUsers, fetchUsers, changeRole }
})
