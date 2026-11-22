import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSnackbarStore = defineStore('snackbar', () => {
  const notification = ref<{ id: number; message: string; kind: 'success' | 'error' } | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let sequence = 0
  const dismiss = () => {
    clearTimeout(timer)
    notification.value = null
  }
  const show = (message: string, kind: 'success' | 'error' = 'success') => {
    clearTimeout(timer)
    notification.value = { id: ++sequence, message, kind }
    timer = setTimeout(dismiss, kind === 'error' ? 6000 : 3500)
  }
  return { notification, show, dismiss }
})
