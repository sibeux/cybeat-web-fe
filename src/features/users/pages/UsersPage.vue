<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { useTitle } from '@/core/shared/composables/useTitle'
  import { useUsersStore } from '../store/users.store'
  import type { ManagedUser, UserRole } from '../types/user.types'

  const usersStore = useUsersStore()
  const { users, isLoading, error, totalUsers } = storeToRefs(usersStore)
  const searchQuery = ref('')
  const savingUserIds = ref<number[]>([])
  const statusMessage = ref('')

  useTitle(() => 'Manage users')

  const filteredUsers = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return users.value
    return users.value.filter((user) =>
      [user.user_id, user.name, user.email, user.role].some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      ),
    )
  })

  onMounted(() => {
    void usersStore.fetchUsers().catch(() => undefined)
  })

  async function handleRoleChange(user: ManagedUser, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement
    const role = select.value as UserRole
    const userId = Number(user.user_id)
    savingUserIds.value.push(userId)
    statusMessage.value = ''
    try {
      await usersStore.changeRole(userId, role)
      statusMessage.value = `Role for ${user.email} changed to ${role}.`
    } catch {
      statusMessage.value = error.value || 'Could not update the user role.'
    } finally {
      savingUserIds.value = savingUserIds.value.filter((id) => id !== userId)
    }
  }
</script>

<template>
  <AppLayout>
    <section class="users-page">
      <div class="users-page__heading">
        <div>
          <p class="users-page__eyebrow">ADMINISTRATION</p>
          <h1 class="users-page__title">Manage users</h1>
          <p class="users-page__subtitle">Review accounts and control access levels.</p>
        </div>
        <div class="users-page__count"><strong>{{ totalUsers }}</strong><span>registered users</span></div>
      </div>

      <div class="users-page__toolbar">
        <label class="users-page__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input v-model="searchQuery" type="search" placeholder="Search name, email, or ID" aria-label="Search users" />
        </label>
        <button class="users-page__refresh" type="button" :disabled="isLoading" @click="usersStore.fetchUsers()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></svg>
          Refresh
        </button>
      </div>

      <div class="users-page__card">
        <div v-if="isLoading && users.length === 0" class="users-page__state">Loading users…</div>
        <div v-else-if="error && users.length === 0" class="users-page__state users-page__state--error">
          <p>{{ error }}</p>
          <button class="users-page__retry" type="button" @click="usersStore.fetchUsers()">Try again</button>
        </div>
        <div v-else-if="filteredUsers.length === 0" class="users-page__state">
          {{ users.length ? 'No users match this search.' : 'No users found.' }}
        </div>
        <div v-else class="users-page__table-wrap">
          <table class="users-page__table">
            <thead><tr><th>User</th><th>Email</th><th>ID</th><th>Role</th></tr></thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.user_id">
                <td><div class="users-page__identity"><span class="users-page__avatar">{{ (user.name || user.email || 'U').slice(0, 1).toUpperCase() }}</span><span class="users-page__name">{{ user.name || 'Unnamed user' }}</span></div></td>
                <td class="users-page__email">{{ user.email }}</td>
                <td class="users-page__id">#{{ user.user_id }}</td>
                <td>
                  <select
                    class="users-page__role"
                    :class="`users-page__role--${['free', 'premium', 'admin'].includes(user.role) ? user.role : 'free'}`"
                    :value="['free', 'premium', 'admin'].includes(user.role) ? user.role : 'free'"
                    :disabled="savingUserIds.includes(Number(user.user_id))"
                    :aria-label="`Role for ${user.name || user.email}`"
                    @change="handleRoleChange(user, $event)"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="users-page__status" :class="{ 'users-page__status--error': error }" aria-live="polite">{{ statusMessage || (isLoading && users.length ? 'Refreshing user list…' : error) }}</p>
    </section>
  </AppLayout>
</template>

<style src="./UsersPage.css"></style>
