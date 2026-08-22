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
            <img src="/assets/images/logo.png" alt="Logo" class="login-page__logo-img" />
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
          <img src="/assets/images/logo.png" alt="Logo" class="login-page__logo-img-m" />
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

<style scoped src="./LoginPage.css"></style>
