<script setup lang="ts">
import { useSnackbarStore } from '../stores/snackbar.store'
import { usePlayerStore } from '@/features/album/store/player.store'

const snackbar = useSnackbarStore()
const player = usePlayerStore()
</script>

<template>
  <Teleport to="body">
    <div class="app-snackbar-host" :class="{ 'app-snackbar-host--player': player.currentSong }" role="status" aria-live="polite" aria-atomic="true">
      <Transition name="snackbar" mode="out-in">
        <div v-if="snackbar.notification" :key="snackbar.notification.id" class="app-snackbar" :class="{ 'app-snackbar--error': snackbar.notification.kind === 'error' }">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path v-if="snackbar.notification.kind === 'success'" d="m5 12 4 4L19 6" />
            <path v-else d="M12 8v5m0 3h.01M12 3 2 21h20L12 3Z" />
          </svg>
          <span>{{ snackbar.notification.message }}</span>
          <button type="button" aria-label="Dismiss notification" @click="snackbar.dismiss">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.app-snackbar-host {
  position: fixed;
  bottom: calc(1.5rem + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: min(32rem, calc(100vw - 2rem));
  z-index: 2000;
  pointer-events: none;
}
.app-snackbar-host--player { bottom: calc(9.5rem + env(safe-area-inset-bottom)); }
.app-snackbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-raised);
  color: var(--color-text);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  font-size: 0.875rem;
  pointer-events: auto;
}
.app-snackbar > svg { flex-shrink: 0; color: var(--color-success); }
.app-snackbar--error > svg { color: var(--color-danger); }
.app-snackbar span { min-width: 0; overflow-wrap: anywhere; }
.app-snackbar button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.app-snackbar button:hover { background: var(--color-surface); color: var(--color-text); }
.snackbar-enter-active, .snackbar-leave-active { transition: opacity .15s ease, transform .15s ease; }
.snackbar-enter-from, .snackbar-leave-to { opacity: 0; transform: translateY(0.5rem); }
@media (prefers-reduced-motion: reduce) {
  .snackbar-enter-active, .snackbar-leave-active { transition: none; }
}
</style>
