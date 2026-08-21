<script setup lang="ts">
  import LoginForm from '@/features/auth/components/LoginForm.vue'
  import { APP_NAME } from '@/app/config/app.config'
</script>

<template>
  <div class="login-page">
    <!-- Left Panel — Branding -->
    <aside class="login-page__panel" aria-hidden="true">
      <div class="login-page__panel-inner">
        <div class="login-page__brand">
          <div class="login-page__logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />
              <path d="M12 20C12 15.582 15.582 12 20 12C22.122 12 24.05 12.822 25.485 14.172L22.657 17C21.908 16.372 20.996 16 20 16C17.791 16 16 17.791 16 20C16 22.209 17.791 24 20 24C20.996 24 21.908 23.628 22.657 23L25.485 25.828C24.05 27.178 22.122 28 20 28C15.582 28 12 24.418 12 20Z" fill="white"/>
              <path d="M24 20L28 16V24L24 20Z" fill="white" opacity="0.7"/>
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6366f1"/>
                  <stop offset="1" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="login-page__brand-name">{{ APP_NAME }}</span>
        </div>

        <div class="login-page__panel-content">
          <h2 class="login-page__panel-title">Platform Enterprise<br />untuk Tim Modern</h2>
          <p class="login-page__panel-desc">
            Kelola proyek, tim, dan aset bisnis Anda dalam satu platform terintegrasi yang dirancang untuk skala enterprise.
          </p>

          <ul class="login-page__features">
            <li class="login-page__feature">
              <span class="login-page__feature-icon">✦</span>
              Manajemen proyek real-time
            </li>
            <li class="login-page__feature">
              <span class="login-page__feature-icon">✦</span>
              Laporan analitik mendalam
            </li>
            <li class="login-page__feature">
              <span class="login-page__feature-icon">✦</span>
              Keamanan enterprise-grade
            </li>
          </ul>
        </div>

        <!-- Decorative blobs -->
        <div class="login-page__blob login-page__blob--1" aria-hidden="true" />
        <div class="login-page__blob login-page__blob--2" aria-hidden="true" />
      </div>
    </aside>

    <!-- Right Panel — Form -->
    <main class="login-page__form-area">
      <div class="login-page__form-container">
        <!-- Mobile brand -->
        <div class="login-page__mobile-brand" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="url(#logo-grad-m)" />
            <path d="M12 20C12 15.582 15.582 12 20 12C22.122 12 24.05 12.822 25.485 14.172L22.657 17C21.908 16.372 20.996 16 20 16C17.791 16 16 17.791 16 20C16 22.209 17.791 24 20 24C20.996 24 21.908 23.628 22.657 23L25.485 25.828C24.05 27.178 22.122 28 20 28C15.582 28 12 24.418 12 20Z" fill="white"/>
            <path d="M24 20L28 16V24L24 20Z" fill="white" opacity="0.7"/>
            <defs>
              <linearGradient id="logo-grad-m" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6366f1"/>
                <stop offset="1" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          <span>{{ APP_NAME }}</span>
        </div>

        <div class="login-page__header">
          <h1 class="login-page__title">Selamat datang kembali</h1>
          <p class="login-page__subtitle">Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        <LoginForm />
      </div>
    </main>
  </div>
</template>

<style scoped>
  .login-page {
    min-height: 100vh;
    display: flex;
  }

  /* ── Left Panel ── */
  .login-page__panel {
    display: none;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%);
  }

  @media (min-width: 1024px) {
    .login-page__panel {
      display: flex;
      flex: 0 0 480px;
    }
  }

  .login-page__panel-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    padding: 3rem;
    width: 100%;
    color: #fff;
  }

  .login-page__brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .login-page__logo svg {
    width: 2.5rem;
    height: 2.5rem;
  }

  .login-page__brand-name {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #fff;
  }

  .login-page__panel-content {
    margin-top: auto;
    margin-bottom: auto;
    padding: 2rem 0;
  }

  .login-page__panel-title {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.02em;
    margin: 0 0 1rem;
    color: #fff;
  }

  .login-page__panel-desc {
    font-size: 1rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 2rem;
  }

  .login-page__features {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .login-page__feature {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .login-page__feature-icon {
    color: #a78bfa;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  /* Decorative blobs */
  .login-page__blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.25;
    pointer-events: none;
  }

  .login-page__blob--1 {
    width: 300px;
    height: 300px;
    background: #818cf8;
    top: -100px;
    right: -80px;
  }

  .login-page__blob--2 {
    width: 250px;
    height: 250px;
    background: #a78bfa;
    bottom: -60px;
    left: -80px;
  }

  /* ── Right Panel ── */
  .login-page__form-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    background: var(--color-bg);
    overflow-y: auto;
  }

  .login-page__form-container {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .login-page__mobile-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .login-page__mobile-brand svg {
    width: 2rem;
    height: 2rem;
  }

  @media (min-width: 1024px) {
    .login-page__mobile-brand {
      display: none;
    }
  }

  .login-page__header {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .login-page__title {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-text);
    margin: 0;
  }

  .login-page__subtitle {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
