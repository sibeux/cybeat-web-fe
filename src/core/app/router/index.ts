import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/index'
import { isTokenExpired } from '@/features/auth/utils/jwt'
import { logger } from '@/core/infrastructure/logger'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false })
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
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return { ...savedPosition, behavior: 'instant' }
    }
    return { top: 0, behavior: 'instant' }
  },
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
      path: '/:type/:id',
      name: 'album',
      component: () => import('@/features/album/pages/AlbumPage.vue'),
    },

    // ─── Logs Route ───────────────────────────────────────────────────────────
    {
      path: '/logs',
      name: 'logs',
      component: () => import('@/features/logs/pages/LogsPage.vue'),
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
router.beforeEach(async (to) => {
  NProgress.start()
  const authStore = useAuthStore()

  // Safety net: if somehow called before session is restored, block navigation.
  // This should not happen in normal flow given the startup sequence in main.ts.
  if (authStore.isInitializing) {
    logger.warn('RouterGuard', `Blocked navigation to ${to.path} because session is initializing`)
    return false
  }

  if (authStore.isAuthenticated && authStore.accessToken) {
    if (isTokenExpired(authStore.accessToken)) {
      const refreshed = await authStore.refreshSession()
      if (!refreshed) {
        logger.warn('RouterGuard', 'Session expired during navigation guard. Redirecting to login')
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    logger.info('RouterGuard', `Protected route ${to.path} requires authentication. Redirecting to login`)
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

router.afterEach((to) => {
  NProgress.done()
  logger.info('Router', `Navigated to ${to.fullPath} (${String(to.name || 'unnamed')})`)
})

router.onError((error) => {
  NProgress.done()
  logger.error('Router', 'Router navigation error', error)
})

export default router

