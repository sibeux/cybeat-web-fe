<script setup lang="ts">
  import LoginForm from '@/features/auth/components/LoginForm.vue'
  import { APP_NAME } from '@/core/app/config/app.config'
</script>

<template>
  <div class="login-page">
    <!-- Left Panel — Branding -->
    <aside class="login-page__panel" aria-hidden="true">
      <div class="login-page__panel-inner">
        <div class="login-page__brand">
          <div class="login-page__logo">
            <img src="/logo.png" alt="Logo" class="login-page__logo-img" />
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
          <img src="/logo.png" alt="Logo" class="login-page__logo-img-m" />
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

  .login-page__logo-img {
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

  .login-page__logo-img-m {
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
