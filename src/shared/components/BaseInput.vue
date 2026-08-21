<script setup lang="ts">
  defineProps<{
    id: string
    label: string
    modelValue: string
    type?: string
    placeholder?: string
    error?: string
    hint?: string
    autocomplete?: string
    disabled?: boolean
    required?: boolean
  }>()

  defineEmits<{
    'update:modelValue': [value: string]
  }>()
</script>

<template>
  <div class="base-input">
    <label :for="id" class="base-input__label">
      {{ label }}
      <span v-if="required" class="base-input__required" aria-hidden="true">*</span>
    </label>

    <div class="base-input__wrapper" :class="{ 'base-input__wrapper--error': error }">
      <input
        :id="id"
        :type="type ?? 'text'"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :required="required"
        :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
        :aria-invalid="!!error"
        class="base-input__field"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <slot name="append" />
    </div>

    <p v-if="error" :id="`${id}-error`" class="base-input__error" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" class="base-input__hint">
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>
  .base-input {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .base-input__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-muted);
    user-select: none;
  }

  .base-input__required {
    color: var(--color-danger);
    margin-left: 0.2em;
  }

  .base-input__wrapper {
    display: flex;
    align-items: center;
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
    overflow: hidden;
  }

  .base-input__wrapper:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-ring);
  }

  .base-input__wrapper--error {
    border-color: var(--color-danger);
  }

  .base-input__wrapper--error:focus-within {
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }

  .base-input__field {
    flex: 1;
    padding: 0.625rem 0.875rem;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.9375rem;
    color: var(--color-text);
    font-family: inherit;
    min-width: 0;
  }

  .base-input__field::placeholder {
    color: var(--color-text-placeholder);
  }

  .base-input__field:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .base-input__error {
    font-size: 0.8125rem;
    color: var(--color-danger);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .base-input__hint {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
