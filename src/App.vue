<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/features/auth/index'
  import { usePlayerStore } from '@/features/album/store/player.store'
  import { SESSION_EXPIRED_EVENT } from '@/core/infrastructure/http/interceptors'
  import LoadingSpinner from '@/core/shared/components/LoadingSpinner.vue'
  import MusicPlayerWidget from '@/features/album/components/MusicPlayerWidget.vue'

  const router = useRouter()
  const authStore = useAuthStore()
  const playerStore = usePlayerStore()

  /**
   * Application-level session expiration coordinator.
   *
   * The Axios interceptor dispatches SESSION_EXPIRED_EVENT when it receives
   * a 401 response. App.vue handles it here — not in the auth store —
   * keeping the feature store free of DOM event dependencies.
   *
   * Flow:
   *   Axios 401
   *     → interceptor clears storage + dispatches event
   *     → App.vue receives event
   *     → clears auth state in store
   *     → redirects to /login
   */
  function handleSessionExpired(): void {
    playerStore.closePlayer()
    authStore.clearSession()
    router.push('/login')
  }

  onMounted(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  })

  onUnmounted(() => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  })
</script>

<template>
  <!-- Show a minimal loading screen while session is being restored.
       This prevents auth flicker (dashboard → login → dashboard). -->
  <div v-if="authStore.isInitializing" class="app-init" role="status" aria-label="Memuat aplikasi">
    <div class="app-init__logo" aria-hidden="true">
      <img src="/assets/images/logo.png" alt="Logo" width="48" height="48" class="app-init__logo-img" />
    </div>
    <LoadingSpinner size="sm" label="Memuat aplikasi..." />
  </div>

  <!-- Once session is restored, hand off to the router -->
  <template v-else>
    <RouterView />
    <MusicPlayerWidget v-if="authStore.isAuthenticated" />
  </template>
</template>
