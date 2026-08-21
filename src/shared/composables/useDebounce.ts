import { ref, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * Returns a debounced ref that only updates after the specified delay.
 *
 * @param value - The source reactive ref to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns A new ref that mirrors `value` with the specified delay
 */
export function useDebounce<T>(value: Ref<T>, delay: number): Ref<T> {
  const debouncedValue = ref<T>(value.value) as Ref<T>
  let timeout: ReturnType<typeof setTimeout> | null = null

  watch(value, (newValue) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      debouncedValue.value = newValue
    }, delay)
  })

  return debouncedValue
}
