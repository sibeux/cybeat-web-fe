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
            <img src="/assets/images/logo.png" alt="Logo" class="register-page__logo-img" />
          </div>
          <span class="register-page__brand-name">{{ APP_NAME }}</span>
        </div>

        <div class="register-page__panel-content">
          <h2 class="register-page__panel-title">Mulai perjalanan<br />Anda bersama kami</h2>
          <p class="register-page__panel-desc">
            Bergabunglah dengan ribuan tim yang sudah menggunakan Cybeat untuk meningkatkan produktivitas dan efisiensi bisnis mereka.
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
          <img src="/assets/images/logo.png" alt="Logo" class="register-page__logo-img-m" />
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

<style scoped src="./RegisterPage.css"></style>
