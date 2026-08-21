<script setup lang="ts">
  withDefaults(
    defineProps<{
      size?: 'sm' | 'md' | 'lg'
      label?: string
    }>(),
    {
      size: 'md',
      label: 'Memuat...',
    },
  )
</script>

<template>
  <div class="loading-spinner" :class="`loading-spinner--${size}`" role="status" :aria-label="label">
    <div class="loading-spinner__ring" aria-hidden="true" />
    <span class="loading-spinner__sr-text">{{ label }}</span>
  </div>
</template>

<style scoped>
  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-spinner__ring {
    border-radius: 50%;
    border-style: solid;
    border-color: var(--color-primary-subtle);
    border-top-color: var(--color-primary);
    animation: spin 0.75s linear infinite;
  }

  .loading-spinner--sm .loading-spinner__ring {
    width: 1.25rem;
    height: 1.25rem;
    border-width: 2px;
  }

  .loading-spinner--md .loading-spinner__ring {
    width: 2.5rem;
    height: 2.5rem;
    border-width: 3px;
  }

  .loading-spinner--lg .loading-spinner__ring {
    width: 4rem;
    height: 4rem;
    border-width: 4px;
  }

  .loading-spinner__sr-text {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
