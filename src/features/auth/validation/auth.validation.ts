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
    errors.email = 'Email address is required.'
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Invalid email address format.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

export function validateRegisterForm(values: RegisterFormValues): FormErrors<RegisterFormValues> {
  const errors: FormErrors<RegisterFormValues> = {}

  if (!values.name.trim()) {
    errors.name = 'Full name is required.'
  } else if (values.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }

  if (!values.email.trim()) {
    errors.email = 'Email address is required.'
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Invalid email address format.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.'
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

export function isEmailValid(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export function hasErrors(errors: FormErrors<Record<string, string>>): boolean {
  return Object.keys(errors).length > 0
}
