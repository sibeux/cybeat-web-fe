import type { ObjectDirective } from 'vue'

const cleanups = new WeakMap<HTMLElement, () => void>()

export const vSidebarFade: ObjectDirective<HTMLElement> = {
  mounted(element) {
    const sidebar = element.closest<HTMLElement>('.dashboard__sidebar')
    const viewport = element.closest<HTMLElement>('.app-layout__sidebar')
    if (!sidebar) return
    let frame = 0
    let hasMore = false
    const update = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const lastCard = element.lastElementChild
        const bottom = Math.min(element.getBoundingClientRect().bottom,
          viewport?.getBoundingClientRect().bottom ?? window.innerHeight, window.innerHeight)
        const remaining = lastCard ? lastCard.getBoundingClientRect().bottom - bottom : 0
        // Separate thresholds avoid flickering from fractional pixel rounding.
        const next = hasMore ? remaining > 0 : remaining > 4
        if (next !== hasMore) {
          hasMore = next
          sidebar.classList.toggle('dashboard__sidebar--more', hasMore)
        }
      })
    }
    const resize = new ResizeObserver(update)
    const observeItems = () => {
      resize.disconnect()
      resize.observe(element)
      resize.observe(sidebar)
      if (element.lastElementChild) resize.observe(element.lastElementChild)
      update()
    }
    const mutation = new MutationObserver(observeItems)
    mutation.observe(element, { childList: true })
    const scrollTarget = viewport || sidebar
    scrollTarget.addEventListener('scroll', update, { passive: true, capture: true })
    window.addEventListener('resize', update)
    observeItems()
    cleanups.set(element, () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutation.disconnect()
      scrollTarget.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      sidebar.classList.remove('dashboard__sidebar--more')
    })
  },
  unmounted(element) {
    cleanups.get(element)?.()
    cleanups.delete(element)
  },
}
