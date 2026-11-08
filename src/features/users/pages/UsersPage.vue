<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useRouter } from 'vue-router'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { useTitle } from '@/core/shared/composables/useTitle'
  import { useAuthStore } from '@/features/auth/index'
  import { useUsersStore } from '../store/users.store'
  import type { ManagedUser, UserRole } from '../types/user.types'

  const usersStore = useUsersStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const { users, isLoading, error, totalUsers } = storeToRefs(usersStore)
  const searchQuery = ref('')
  const savingUserIds = ref<number[]>([])
  const statusMessage = ref('')
  const editingUser = ref<ManagedUser | null>(null)
  const draftRole = ref<UserRole>('free')

  useTitle(() => 'Manage users')

  function goToDashboard(): void {
    void router.push({ name: 'dashboard' })
  }

  const filteredUsers = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return users.value
    return users.value.filter((user) =>
      [user.name, user.email, user.role].some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      ),
    )
  })

  onMounted(() => {
    void usersStore.fetchUsers().catch(() => undefined)
  })

  function isCurrentAdmin(user: ManagedUser): boolean {
    return Boolean(
      authStore.user?.email &&
      user.email.toLowerCase() === authStore.user.email.toLowerCase() &&
      user.role === 'admin',
    )
  }

  function startEditing(user: ManagedUser): void {
    editingUser.value = user
    draftRole.value = ['free', 'premium', 'admin'].includes(user.role)
      ? (user.role as UserRole)
      : 'free'
    statusMessage.value = ''
  }

  function cancelEditing(): void {
    if (editingUser.value && savingUserIds.value.includes(Number(editingUser.value.user_id))) return
    editingUser.value = null
  }

  async function saveRole(): Promise<void> {
    const user = editingUser.value
    if (!user) return

    const userId = Number(user.user_id)
    savingUserIds.value.push(userId)
    statusMessage.value = ''
    try {
      await usersStore.changeRole(userId, draftRole.value)
      statusMessage.value = `Role for ${user.email} changed to ${draftRole.value}.`
      editingUser.value = null
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
      <div class="users-page__header">
        <div class="users-page__title-area">
          <button class="users-page__back-btn" type="button" title="Back to dashboard" aria-label="Back to dashboard" @click="goToDashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 class="users-page__title">Manage users</h1>
            <p class="users-page__subtitle">Review accounts and control access levels.</p>
          </div>
        </div>
        <div class="users-page__actions">
          <div class="users-page__count"><strong>{{ totalUsers }}</strong><span>registered users</span></div>
        </div>
      </div>

      <div class="users-page__toolbar">
        <label class="users-page__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input v-model="searchQuery" type="search" placeholder="Search name or email" aria-label="Search users" />
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
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.user_id">
                <td><div class="users-page__identity"><span class="users-page__avatar">{{ (user.name || user.email || 'U').slice(0, 1).toUpperCase() }}</span><span class="users-page__name">{{ user.name || 'Unnamed user' }}</span></div></td>
                <td class="users-page__email">{{ user.email }}</td>
                <td><span class="users-page__role-badge" :class="`users-page__role-badge--${['free', 'premium', 'admin'].includes(user.role) ? user.role : 'free'}`">{{ user.role }}</span></td>
                <td class="users-page__actions">
                  <button class="users-page__action" type="button" @click="startEditing(user)">Modify</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="users-page__status" :class="{ 'users-page__status--error': error }" aria-live="polite">{{ statusMessage || (isLoading && users.length ? 'Refreshing user list…' : error) }}</p>

      <div
        v-if="editingUser"
        class="users-page__modal-backdrop"
        @click.self="cancelEditing"
        @keydown.esc="cancelEditing"
      >
        <section
          class="users-page__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modify-user-title"
          aria-describedby="modify-user-description"
        >
          <div class="users-page__modal-heading">
            <div>
              <p class="users-page__modal-eyebrow">USER ACCESS</p>
              <h2 id="modify-user-title" class="users-page__modal-title">Modify user</h2>
            </div>
            <button class="users-page__modal-close" type="button" aria-label="Close dialog" :disabled="savingUserIds.includes(Number(editingUser.user_id))" @click="cancelEditing">×</button>
          </div>

          <div class="users-page__modal-user">
            <span class="users-page__avatar">{{ (editingUser.name || editingUser.email || 'U').slice(0, 1).toUpperCase() }}</span>
            <span><strong>{{ editingUser.name || 'Unnamed user' }}</strong><small>{{ editingUser.email }}</small></span>
          </div>

          <p id="modify-user-description" class="users-page__modal-copy">Choose the access role for this account.</p>
          <label class="users-page__modal-label" for="modify-user-role">Role</label>
          <select id="modify-user-role" v-model="draftRole" class="users-page__modal-select" :disabled="savingUserIds.includes(Number(editingUser.user_id))">
            <option value="free" :disabled="isCurrentAdmin(editingUser)">Free</option>
            <option value="premium" :disabled="isCurrentAdmin(editingUser)">Premium</option>
            <option value="admin">Admin</option>
          </select>
          <p v-if="isCurrentAdmin(editingUser)" class="users-page__modal-note">Your admin role cannot be changed here.</p>
          <p v-if="statusMessage && error" class="users-page__modal-error" role="alert">{{ statusMessage }}</p>

          <div class="users-page__modal-actions">
            <button class="users-page__modal-cancel" type="button" :disabled="savingUserIds.includes(Number(editingUser.user_id))" @click="cancelEditing">Cancel</button>
            <button class="users-page__modal-update" type="button" :disabled="savingUserIds.includes(Number(editingUser.user_id))" @click="saveRole">
              {{ savingUserIds.includes(Number(editingUser.user_id)) ? 'Updating…' : 'Update role' }}
            </button>
          </div>
        </section>
      </div>
    </section>
  </AppLayout>
</template>

<style src="./UsersPage.css"></style>
