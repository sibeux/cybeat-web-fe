import { watchEffect } from 'vue'

export function useTitle(titleFn: () => string) {
  watchEffect(() => {
    const title = titleFn()
    document.title = title
    // Defeat browser popstate title restoration
    setTimeout(() => {
      document.title = title
    }, 50)
  })
}
