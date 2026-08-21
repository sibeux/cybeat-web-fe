import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './app/router/index'
import { setupInterceptors } from './infrastructure/http/interceptors'
import { useAuthStore } from './features/auth/index'
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

  // 1. Install Pinia before using any store
  const pinia = createPinia()
  app.use(pinia)

  // 2. Install Router
  app.use(router)

  // 3. Set up HTTP interceptors (no store dependency — reads storage only)
  setupInterceptors()

  // 4. Restore auth session from persisted storage
  //    This MUST complete before mount so the router guard
  //    can make correct decisions on first navigation.
  const authStore = useAuthStore()
  await authStore.restoreSession()

  // 5. Mount — router starts its initial navigation here
  app.mount('#app')
}

bootstrap().catch((err: unknown) => {
  console.error('Application failed to start:', err)
})
