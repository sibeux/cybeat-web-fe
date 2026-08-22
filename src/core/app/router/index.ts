import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/index'

/**
 * Route meta type augmentation.
 * Enables typed route meta across the application.
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** If true, user must be authenticated to access this route. */
    requiresAuth?: boolean
    /** If true, authenticated users are redirected away (e.g. /login, /register). */
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ─── Auth Routes ─────────────────────────────────────────────────────────
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/pages/LoginPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/features/auth/pages/RegisterPage.vue'),
      meta: { guestOnly: true },
    },

    // ─── Dashboard Route ──────────────────────────────────────────────────────
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
    },

    // ─── Album Route ──────────────────────────────────────────────────────────
    {
      path: '/album/:type/:id',
      name: 'album',
      component: () => import('@/features/album/pages/AlbumPage.vue'),
    },

    // ─── 404 Fallback ─────────────────────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

/**
 * Navigation Guard
 *
 * Startup sequence guarantee:
 * - `restoreSession()` in main.ts sets `isInitializing = false` before mount.
 * - The router starts navigating only after `app.mount()` is called.
 * - Therefore `isInitializing` is always false by the time this guard runs.
 *
 * Guard behavior:
 * - requiresAuth + not authenticated → /login
 * - guestOnly + authenticated → /
 * - Otherwise → proceed
 */
router.beforeEach((to) => {
  const authStore = useAuthStore()

  // Safety net: if somehow called before session is restored, block navigation.
  // This should not happen in normal flow given the startup sequence in main.ts.
  if (authStore.isInitializing) {
    return false
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
