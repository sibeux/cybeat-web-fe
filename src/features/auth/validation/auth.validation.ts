import type {
  LoginFormValues,
  RegisterFormValues,
  FormErrors,
} from '@/features/auth/types/auth.types'

/**
 * Authentication form validation.
 *
 * Pure functions — no Vue dependency, no side effects.
 * Independently testable.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export function validateLoginForm(values: LoginFormValues): FormErrors<LoginFormValues> {
  const errors: FormErrors<LoginFormValues> = {}

  if (!values.email.trim()) {
    errors.email = 'Email wajib diisi.'
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Format email tidak valid.'
  }

  if (!values.password) {
    errors.password = 'Password wajib diisi.'
  }

  return errors
}

export function validateRegisterForm(values: RegisterFormValues): FormErrors<RegisterFormValues> {
  const errors: FormErrors<RegisterFormValues> = {}

  if (!values.name.trim()) {
    errors.name = 'Nama wajib diisi.'
  } else if (values.name.trim().length < 2) {
    errors.name = 'Nama minimal 2 karakter.'
  }

  if (!values.email.trim()) {
    errors.email = 'Email wajib diisi.'
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Format email tidak valid.'
  }

  if (!values.password) {
    errors.password = 'Password wajib diisi.'
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Konfirmasi password wajib diisi.'
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Password tidak cocok.'
  }

  return errors
}

export function isEmailValid(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export function hasErrors(errors: FormErrors<Record<string, string>>): boolean {
  return Object.keys(errors).length > 0
}
