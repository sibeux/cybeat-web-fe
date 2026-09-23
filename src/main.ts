import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './core/app/router/index'
import { setupInterceptors } from './core/infrastructure/http/interceptors'
import { useAuthStore } from './features/auth/index'
import { imageCacheDirective } from './core/directives/imageCache'
import { logger } from './core/infrastructure/logger'
import './style.css'

/**
 * Application startup sequence.
 *
 * Order matters:
 *  1. Create app
 *  2. Install Pinia (required before using any store)
 *  3. Install Router (required before using useRouter/RouterView)
 *  4. Register Axios interceptors (reads from storage, dispatches DOM events)
 *  5. Restore authentication session (reads tokens, populates auth state)
 *     → Sets isInitializing = false
 *  6. Mount app
 *     → Router begins its initial navigation AFTER mount
 *     → Navigation guard sees isInitializing === false, makes correct decisions
 *
 * This order prevents:
 * - Auth flicker (dashboard → login → dashboard)
 * - Race conditions between router guard and session state
 */
async function bootstrap(): Promise<void> {
  const app = createApp(App)

  // Global Vue error handler
  app.config.errorHandler = (err, instance, info) => {
    logger.error('VueErrorHandler', `Unhandled error in component: ${info}`, err, {
      component: instance?.$options?.name || 'AnonymousComponent',
      info,
    })
  }

  // Global window unhandled error listener
  window.addEventListener('error', (event) => {
    logger.fatal('WindowError', event.message || 'Unhandled script error', event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  // Global unhandled promise rejection listener
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('UnhandledRejection', 'Unhandled Promise Rejection', event.reason)
  })

  logger.info('Bootstrap', 'Starting CyBeat Web Application...')

  // 1. Install Pinia before using any store
  const pinia = createPinia()
  app.use(pinia)

  app.directive('img-cache', imageCacheDirective)

  // 2. Set up HTTP interceptors (no store dependency — reads storage only)
  setupInterceptors()

  // 3. Restore auth session from persisted storage
  //    This MUST complete before router installation so the router guard
  //    can make correct decisions on first navigation.
  const authStore = useAuthStore()
  await authStore.restoreSession()

  // 4. Install Router AFTER auth state is resolved
  //    This triggers the initial navigation with isInitializing = false
  app.use(router)

  // 5. Wait for the lazy-loaded initial route before mounting the view.
  //    This prevents RouterView from rendering an empty shell on first load.
  await router.isReady()

  // 6. Mount the fully resolved initial route
  app.mount('#app')
  logger.info('Bootstrap', 'CyBeat Web Application mounted successfully.')
}

bootstrap().catch((err: unknown) => {
  logger.fatal('Bootstrap', 'Application failed to start', err)
  console.error('Application failed to start:', err)
})

