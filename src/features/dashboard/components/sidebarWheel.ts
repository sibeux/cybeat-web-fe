import type { ObjectDirective } from 'vue'

const cleanups = new WeakMap<HTMLElement, () => void>()

export const vSidebarWheel: ObjectDirective<HTMLElement> = {
  mounted(sidebar) {
    let frame = 0
    let target = 0
    let direction = 0
    let previousTime = 0
    let activeList: HTMLElement | null = null
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animate = (time: number) => {
      frame = 0
      if (!activeList) return
      const limit = Math.max(0, activeList.scrollHeight - activeList.clientHeight)
      target = Math.max(0, Math.min(limit, target))
      const elapsed = previousTime ? Math.min(64, time - previousTime) : 16
      previousTime = time
      const distance = target - activeList.scrollTop
      if (Math.abs(distance) <= 1) {
        activeList.scrollTop = target
        previousTime = 0
        return
      }
      activeList.scrollTop += distance * (1 - Math.exp(-elapsed / 40))
      frame = requestAnimationFrame(animate)
    }
    const onWheel = (event: WheelEvent) => {
      // Preserve browser zoom and horizontal gestures.
      if (event.ctrlKey || !event.cancelable || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return
      const list = sidebar.querySelector<HTMLElement>('.dashboard__sidebar-list')
      if (!list) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientHeight : 1
      const limit = Math.max(0, list.scrollHeight - list.clientHeight)
      const nextDirection = Math.sign(event.deltaY)
      // Discard pending motion when direction changes or the filter changes.
      if (!frame || direction !== nextDirection || activeList !== list) target = list.scrollTop
      activeList = list
      direction = nextDirection
      target = Math.max(0, Math.min(limit, target + event.deltaY * unit))
      if (reducedMotion.matches) {
        cancelAnimationFrame(frame)
        frame = 0
        previousTime = 0
        list.scrollTop = target
      } else if (!frame && Math.abs(target - list.scrollTop) > 1) {
        previousTime = 0
        frame = requestAnimationFrame(animate)
      }
    }
    sidebar.addEventListener('wheel', onWheel, { passive: false })
    cleanups.set(sidebar, () => {
      cancelAnimationFrame(frame)
      sidebar.removeEventListener('wheel', onWheel)
    })
  },
  unmounted(sidebar) {
    cleanups.get(sidebar)?.()
    cleanups.delete(sidebar)
  },
}
