<script setup lang="ts">
  import { ref, reactive } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/features/auth/stores/auth.store'
  import { validateLoginForm, hasErrors } from '@/features/auth/validation/auth.validation'
  import BaseInput from '@/core/shared/components/BaseInput.vue'
  import BaseButton from '@/core/shared/components/BaseButton.vue'
  import type { LoginFormValues, FormErrors } from '@/features/auth/types/auth.types'

  const router = useRouter()
  const authStore = useAuthStore()

  const values = reactive<LoginFormValues>({
    email: '',
    password: '',
  })

  const errors = ref<FormErrors<LoginFormValues>>({})
  const showPassword = ref(false)

  function validate(): boolean {
    errors.value = validateLoginForm(values)
    return !hasErrors(errors.value)
  }

  function clearFieldError(field: keyof LoginFormValues): void {
    if (errors.value[field]) {
      const next = { ...errors.value }
      delete next[field]
      errors.value = next
    }
  }

  async function handleSubmit(): Promise<void> {
    authStore.clearError()
    if (!validate()) return

    try {
      await authStore.login({ email: values.email, password: values.password })
      await router.push('/')
    } catch {
      // Error is already set in the store by the login action
    }
  }
</script>

<template>
  <form class="login-form" novalidate @submit.prevent="handleSubmit">
    <div class="login-form__fields">
      <BaseInput
        id="login-email"
        v-model="values.email"
        label="Email"
        type="email"
        placeholder="nama@perusahaan.com"
        autocomplete="email"
        :error="errors.email"
        :disabled="authStore.isLoading"
        required
        @update:model-value="clearFieldError('email')"
      />

      <BaseInput
        id="login-password"
        v-model="values.password"
        label="Password"
        :type="showPassword ? 'text' : 'password'"
        placeholder="Masukkan password"
        autocomplete="current-password"
        :error="errors.password"
        :disabled="authStore.isLoading"
        required
        @update:model-value="clearFieldError('password')"
      >
        <template #append>
          <button
            type="button"
            class="login-form__toggle"
            :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </button>
        </template>
      </BaseInput>
    </div>

    <!-- API Error -->
    <div v-if="authStore.error" class="login-form__api-error" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ authStore.error }}
    </div>

    <BaseButton
      id="login-submit"
      type="submit"
      variant="primary"
      full-width
      :loading="authStore.isLoading"
      :disabled="authStore.isLoading"
    >
      Masuk
    </BaseButton>

    <p class="login-form__footer">
      Belum punya akun?
      <router-link to="/register" class="login-form__link">Daftar sekarang</router-link>
    </p>
  </form>
</template>

<style scoped>
  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .login-form__fields {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .login-form__toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: color 0.2s ease;
    flex-shrink: 0;
  }

  .login-form__toggle:hover {
    color: var(--color-text);
  }

  .login-form__toggle svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  .login-form__api-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: var(--radius-md);
    color: var(--color-danger);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .login-form__api-error svg {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .login-form__footer {
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .login-form__link {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .login-form__link:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
  }
</style>
