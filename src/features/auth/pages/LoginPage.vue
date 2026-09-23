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
          <h2 class="login-page__panel-title">Enterprise Platform<br />for Modern Teams</h2>
          <p class="login-page__panel-desc">
            Manage your projects, teams, and high-fidelity audio streams in one integrated platform designed for enterprise scale.
          </p>

          <ul class="login-page__features">
            <li class="login-page__feature">
              <span class="login-page__feature-icon">✦</span>
              Real-time media playback & sync
            </li>
            <li class="login-page__feature">
              <span class="login-page__feature-icon">✦</span>
              Lossless & Hi-Res audio experience
            </li>
            <li class="login-page__feature">
              <span class="login-page__feature-icon">✦</span>
              Enterprise-grade security
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
          <h1 class="login-page__title">Welcome back</h1>
          <p class="login-page__subtitle">Sign in to your account to continue</p>
        </div>

        <LoginForm />
      </div>
    </main>
  </div>
</template>

<style scoped src="./LoginPage.css"></style>
