<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/features/auth/index'
  import { APP_NAME } from '@/app/config/app.config'

  const router = useRouter()
  const authStore = useAuthStore()

  async function handleLogout(): Promise<void> {
    await authStore.logout()
    await router.push('/login')
  }
</script>

<template>
  <div class="app-layout">
    <header class="app-layout__nav">
      <div class="app-layout__nav-inner">
        <!-- Brand -->
        <div class="app-layout__brand">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="url(#nav-logo-grad)" />
            <path d="M9 16C9 12.134 12.134 9 16 9C17.897 9 19.64 9.758 20.94 11.007L18.526 13.42C17.926 12.91 17.142 12.6 16.3 12.6C14.198 12.6 12.5 14.298 12.5 16.4C12.5 18.502 14.198 20.2 16.3 20.2C17.142 20.2 17.926 19.89 18.526 19.38L20.94 21.793C19.64 23.042 17.897 23.8 16 23.8C12.134 23.8 9 20.666 9 16.8V16Z" fill="white"/>
            <path d="M19.5 16L23 12.5V19.5L19.5 16Z" fill="white" opacity="0.7"/>
            <defs>
              <linearGradient id="nav-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6366f1"/>
                <stop offset="1" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="app-layout__brand-name">{{ APP_NAME }}</span>
        </div>

        <!-- Right side: user info + logout -->
        <div class="app-layout__nav-actions">
          <span v-if="authStore.user?.name" class="app-layout__user-name">
            {{ authStore.user.name }}
          </span>
          <button
            id="logout-button"
            class="app-layout__logout"
            type="button"
            @click="handleLogout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Keluar
          </button>
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

  .app-layout__brand svg {
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

  .app-layout__logout svg {
    width: 1rem;
    height: 1rem;
  }

  .app-layout__content {
    flex: 1;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }
</style>
