<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/features/auth/index'
  import { SESSION_EXPIRED_EVENT } from '@/core/infrastructure/http/interceptors'
  import LoadingSpinner from '@/core/shared/components/LoadingSpinner.vue'
  import MusicPlayerWidget from '@/features/album/components/MusicPlayerWidget.vue'

  const router = useRouter()
  const authStore = useAuthStore()

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
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
        <rect width="48" height="48" rx="12" fill="url(#app-logo-grad)" />
        <path d="M14 24C14 18.477 18.477 14 24 14C26.546 14 28.86 14.985 30.582 16.606L27.188 20C26.29 19.219 25.2 18.8 24 18.8C21.126 18.8 18.8 21.126 18.8 24C18.8 26.874 21.126 29.2 24 29.2C25.2 29.2 26.29 28.781 27.188 28L30.582 31.394C28.86 33.015 26.546 34 24 34C18.477 34 14 29.523 14 24Z" fill="white"/>
        <path d="M29 24L34 19V29L29 24Z" fill="white" opacity="0.7"/>
        <defs>
          <linearGradient id="app-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6366f1"/>
            <stop offset="1" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <LoadingSpinner size="sm" label="Memuat aplikasi..." />
  </div>

  <!-- Once session is restored, hand off to the router -->
  <template v-else>
    <RouterView />
    <MusicPlayerWidget />
  </template>
</template>
