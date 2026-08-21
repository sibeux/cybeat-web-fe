<script setup lang="ts">
  withDefaults(
    defineProps<{
      variant?: 'primary' | 'secondary' | 'ghost'
      loading?: boolean
      disabled?: boolean
      type?: 'button' | 'submit' | 'reset'
      fullWidth?: boolean
    }>(),
    {
      variant: 'primary',
      loading: false,
      disabled: false,
      type: 'button',
      fullWidth: false,
    },
  )
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-disabled="disabled || loading"
    :aria-busy="loading"
    :class="[
      'base-button',
      `base-button--${variant}`,
      { 'base-button--loading': loading, 'base-button--full': fullWidth },
    ]"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true" />
    <span :class="{ 'base-button__label--hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
  .base-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-radius: var(--radius-md);
    font-size: 0.9375rem;
    font-weight: 600;
    font-family: inherit;
    line-height: 1.5;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.2s ease;
    position: relative;
    white-space: nowrap;
    user-select: none;
    outline: none;
  }

  .base-button--full {
    width: 100%;
  }

  /* Primary */
  .base-button--primary {
    background: var(--color-primary);
    color: #fff;
    border-color: var(--color-primary);
  }

  .base-button--primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
    box-shadow: 0 4px 16px var(--color-primary-shadow);
  }

  .base-button--primary:focus-visible {
    box-shadow: 0 0 0 3px var(--color-primary-ring);
  }

  /* Secondary */
  .base-button--secondary {
    background: transparent;
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  .base-button--secondary:hover:not(:disabled) {
    background: var(--color-primary-subtle);
  }

  .base-button--secondary:focus-visible {
    box-shadow: 0 0 0 3px var(--color-primary-ring);
  }

  /* Ghost */
  .base-button--ghost {
    background: transparent;
    color: var(--color-text-muted);
    border-color: transparent;
  }

  .base-button--ghost:hover:not(:disabled) {
    background: var(--color-surface-raised);
    color: var(--color-text);
  }

  /* Disabled */
  .base-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Loading */
  .base-button--loading {
    cursor: wait;
  }

  .base-button__label--hidden {
    visibility: hidden;
  }

  .base-button__spinner {
    position: absolute;
    width: 1.1rem;
    height: 1.1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: btn-spin 0.7s linear infinite;
  }

  .base-button--secondary .base-button__spinner,
  .base-button--ghost .base-button__spinner {
    border-color: var(--color-primary-subtle);
    border-top-color: var(--color-primary);
  }

  @keyframes btn-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
