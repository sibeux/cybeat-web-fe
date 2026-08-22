<script setup lang="ts">
  import RegisterForm from '@/features/auth/components/RegisterForm.vue'
  import { APP_NAME } from '@/core/app/config/app.config'
</script>

<template>
  <div class="register-page">
    <!-- Left Panel — Branding -->
    <aside class="register-page__panel" aria-hidden="true">
      <div class="register-page__panel-inner">
        <div class="register-page__brand">
          <div class="register-page__logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="url(#logo-grad-r)" />
              <path d="M12 20C12 15.582 15.582 12 20 12C22.122 12 24.05 12.822 25.485 14.172L22.657 17C21.908 16.372 20.996 16 20 16C17.791 16 16 17.791 16 20C16 22.209 17.791 24 20 24C20.996 24 21.908 23.628 22.657 23L25.485 25.828C24.05 27.178 22.122 28 20 28C15.582 28 12 24.418 12 20Z" fill="white"/>
              <path d="M24 20L28 16V24L24 20Z" fill="white" opacity="0.7"/>
              <defs>
                <linearGradient id="logo-grad-r" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6366f1"/>
                  <stop offset="1" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="register-page__brand-name">{{ APP_NAME }}</span>
        </div>

        <div class="register-page__panel-content">
          <h2 class="register-page__panel-title">Mulai perjalanan<br />Anda bersama kami</h2>
          <p class="register-page__panel-desc">
            Bergabunglah dengan ribuan tim yang sudah menggunakan CyBeat untuk meningkatkan produktivitas dan efisiensi bisnis mereka.
          </p>

          <div class="register-page__stats">
            <div class="register-page__stat">
              <span class="register-page__stat-value">500+</span>
              <span class="register-page__stat-label">Perusahaan</span>
            </div>
            <div class="register-page__stat-divider" />
            <div class="register-page__stat">
              <span class="register-page__stat-value">10K+</span>
              <span class="register-page__stat-label">Pengguna aktif</span>
            </div>
            <div class="register-page__stat-divider" />
            <div class="register-page__stat">
              <span class="register-page__stat-value">99.9%</span>
              <span class="register-page__stat-label">Uptime</span>
            </div>
          </div>
        </div>

        <div class="register-page__blob register-page__blob--1" aria-hidden="true" />
        <div class="register-page__blob register-page__blob--2" aria-hidden="true" />
      </div>
    </aside>

    <!-- Right Panel — Form -->
    <main class="register-page__form-area">
      <div class="register-page__form-container">
        <!-- Mobile brand -->
        <div class="register-page__mobile-brand" aria-hidden="true">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="url(#logo-grad-rm)" />
            <path d="M12 20C12 15.582 15.582 12 20 12C22.122 12 24.05 12.822 25.485 14.172L22.657 17C21.908 16.372 20.996 16 20 16C17.791 16 16 17.791 16 20C16 22.209 17.791 24 20 24C20.996 24 21.908 23.628 22.657 23L25.485 25.828C24.05 27.178 22.122 28 20 28C15.582 28 12 24.418 12 20Z" fill="white"/>
            <path d="M24 20L28 16V24L24 20Z" fill="white" opacity="0.7"/>
            <defs>
              <linearGradient id="logo-grad-rm" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6366f1"/>
                <stop offset="1" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          <span>{{ APP_NAME }}</span>
        </div>

        <div class="register-page__header">
          <h1 class="register-page__title">Buat akun baru</h1>
          <p class="register-page__subtitle">Daftarkan diri Anda dan mulai dalam hitungan menit</p>
        </div>

        <RegisterForm />
      </div>
    </main>
  </div>
</template>

<style scoped>
  .register-page {
    min-height: 100vh;
    display: flex;
  }

  /* ── Left Panel ── */
  .register-page__panel {
    display: none;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%);
  }

  @media (min-width: 1024px) {
    .register-page__panel {
      display: flex;
      flex: 0 0 480px;
    }
  }

  .register-page__panel-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    padding: 3rem;
    width: 100%;
    color: #fff;
  }

  .register-page__brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .register-page__logo svg {
    width: 2.5rem;
    height: 2.5rem;
  }

  .register-page__brand-name {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #fff;
  }

  .register-page__panel-content {
    margin-top: auto;
    margin-bottom: auto;
    padding: 2rem 0;
  }

  .register-page__panel-title {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.02em;
    margin: 0 0 1rem;
    color: #fff;
  }

  .register-page__panel-desc {
    font-size: 1rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 2.5rem;
  }

  .register-page__stats {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .register-page__stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .register-page__stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .register-page__stat-label {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .register-page__stat-divider {
    width: 1px;
    height: 2.5rem;
    background: rgba(255, 255, 255, 0.2);
  }

  .register-page__blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.25;
    pointer-events: none;
  }

  .register-page__blob--1 {
    width: 300px;
    height: 300px;
    background: #818cf8;
    top: -100px;
    right: -80px;
  }

  .register-page__blob--2 {
    width: 250px;
    height: 250px;
    background: #a78bfa;
    bottom: -60px;
    left: -80px;
  }

  /* ── Right Panel ── */
  .register-page__form-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    background: var(--color-bg);
    overflow-y: auto;
  }

  .register-page__form-container {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 1rem 0;
  }

  .register-page__mobile-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .register-page__mobile-brand svg {
    width: 2rem;
    height: 2rem;
  }

  @media (min-width: 1024px) {
    .register-page__mobile-brand {
      display: none;
    }
  }

  .register-page__header {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .register-page__title {
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-text);
    margin: 0;
  }

  .register-page__subtitle {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin: 0;
  }
</style>
