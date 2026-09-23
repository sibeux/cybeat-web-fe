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
          <h2 class="register-page__panel-title">Start your journey<br />with us today</h2>
          <p class="register-page__panel-desc">
            Join thousands of users and creators using Cybeat to experience superior audio playback and enterprise performance.
          </p>

          <div class="register-page__stats">
            <div class="register-page__stat">
              <span class="register-page__stat-value">500+</span>
              <span class="register-page__stat-label">Companies</span>
            </div>
            <div class="register-page__stat-divider" />
            <div class="register-page__stat">
              <span class="register-page__stat-value">10K+</span>
              <span class="register-page__stat-label">Active users</span>
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
          <h1 class="register-page__title">Create an account</h1>
          <p class="register-page__subtitle">Sign up and get started in minutes</p>
        </div>

        <RegisterForm />
      </div>
    </main>
  </div>
</template>

<style scoped src="./RegisterPage.css"></style>
