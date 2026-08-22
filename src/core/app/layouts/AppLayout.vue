<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/features/auth/index'
  import { APP_NAME } from '@/core/app/config/app.config'

  const router = useRouter()
  const authStore = useAuthStore()

  const isLoggingOut = ref(false)
  const isLoggingIn = ref(false)

  async function handleLogout(): Promise<void> {
    if (isLoggingOut.value) return
    isLoggingOut.value = true
    try {
      await authStore.logout()
      await router.push('/login')
    } finally {
      isLoggingOut.value = false
    }
  }

  async function handleLogin(): Promise<void> {
    if (isLoggingIn.value) return
    isLoggingIn.value = true
    try {
      await router.push('/login')
    } finally {
      isLoggingIn.value = false
    }
  }
</script>

<template>
  <div class="app-layout">
    <header class="app-layout__nav">
      <div class="app-layout__nav-inner">
        <!-- Brand -->
        <div class="app-layout__brand">
          <img src="/logo.png" alt="Logo" class="app-layout__brand-logo" />
          <span class="app-layout__brand-name">{{ APP_NAME }}</span>
        </div>

        <!-- Right side: user info + auth actions -->
        <div class="app-layout__nav-actions">
          <template v-if="authStore.isAuthenticated">
            <span v-if="authStore.user?.name" class="app-layout__user-name">
              {{ authStore.user.name }}
            </span>
            <button
              id="logout-button"
              class="app-layout__logout"
              type="button"
              @click="handleLogout"
              :disabled="isLoggingOut"
              :class="{ 'app-layout__btn--loading': isLoggingOut }"
            >
              <svg v-if="isLoggingOut" class="app-layout__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {{ isLoggingOut ? 'Keluar...' : 'Keluar' }}
            </button>
          </template>
          <template v-else>
            <button
              class="app-layout__login"
              type="button"
              @click="handleLogin"
              :disabled="isLoggingIn"
              :class="{ 'app-layout__btn--loading': isLoggingIn }"
            >
              <svg v-if="isLoggingIn" class="app-layout__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {{ isLoggingIn ? 'Memuat...' : 'Masuk' }}
            </button>
          </template>
        </div>
      </div>
    </header>

    <main class="app-layout__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
  }

  .app-layout__nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    backdrop-filter: blur(8px);
  }

  .app-layout__nav-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1.5rem;
    height: 3.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .app-layout__brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .app-layout__brand-logo {
    width: 2rem;
    height: 2rem;
  }

  .app-layout__brand-name {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.01em;
  }

  .app-layout__nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .app-layout__user-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .app-layout__login,
  .app-layout__logout {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4375rem 0.875rem;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  .app-layout__logout:hover {
    color: var(--color-danger);
    border-color: var(--color-danger);
    background: rgba(239, 68, 68, 0.05);
  }

  .app-layout__login:hover {
    color: var(--color-primary, #6366f1);
    border-color: var(--color-primary, #6366f1);
    background: rgba(99, 102, 241, 0.05);
  }

  .app-layout__login svg,
  .app-layout__logout svg {
    width: 1rem;
    height: 1rem;
  }

  .app-layout__btn--loading {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .app-layout__spinner {
    animation: spin 2s linear infinite;
  }

  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }

  .app-layout__content {
    flex: 1;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
</style>
