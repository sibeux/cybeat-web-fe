<script setup lang="ts">
  import AppLayout from '@/app/layouts/AppLayout.vue'
  import { useAuthStore } from '@/features/auth/index'

  const authStore = useAuthStore()
</script>

<template>
  <AppLayout>
    <div class="dashboard">
      <div class="dashboard__welcome">
        <div class="dashboard__welcome-icon" aria-hidden="true">👋</div>
        <div>
          <h1 class="dashboard__title">
            Selamat datang{{ authStore.user?.name ? `, ${authStore.user.name}` : '' }}!
          </h1>
          <p class="dashboard__subtitle">
            Anda berhasil masuk ke CyBeat. Dashboard sedang dalam pengembangan.
          </p>
        </div>
      </div>

      <div class="dashboard__cards">
        <div class="dashboard__card">
          <div class="dashboard__card-icon dashboard__card-icon--blue" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div class="dashboard__card-content">
            <span class="dashboard__card-label">Proyek</span>
            <span class="dashboard__card-value">—</span>
          </div>
        </div>

        <div class="dashboard__card">
          <div class="dashboard__card-icon dashboard__card-icon--purple" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div class="dashboard__card-content">
            <span class="dashboard__card-label">Anggota Tim</span>
            <span class="dashboard__card-value">—</span>
          </div>
        </div>

        <div class="dashboard__card">
          <div class="dashboard__card-icon dashboard__card-icon--green" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div class="dashboard__card-content">
            <span class="dashboard__card-label">Aktivitas</span>
            <span class="dashboard__card-value">—</span>
          </div>
        </div>
      </div>

      <div class="dashboard__placeholder">
        <div class="dashboard__placeholder-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </div>
        <h2 class="dashboard__placeholder-title">Dashboard dalam pengembangan</h2>
        <p class="dashboard__placeholder-desc">
          Fitur dashboard akan segera hadir. Arsitektur sudah siap untuk menerima
          fitur-fitur baru tanpa restrukturisasi.
        </p>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .dashboard__welcome {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.75rem 2rem;
    background: linear-gradient(135deg, var(--color-primary-subtle), transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .dashboard__welcome-icon {
    font-size: 2.5rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .dashboard__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.375rem;
    letter-spacing: -0.02em;
  }

  .dashboard__subtitle {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .dashboard__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .dashboard__card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: box-shadow 0.2s ease;
  }

  .dashboard__card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .dashboard__card-icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dashboard__card-icon svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .dashboard__card-icon--blue {
    background: rgba(99, 102, 241, 0.12);
    color: #6366f1;
  }

  .dashboard__card-icon--purple {
    background: rgba(139, 92, 246, 0.12);
    color: #8b5cf6;
  }

  .dashboard__card-icon--green {
    background: rgba(16, 185, 129, 0.12);
    color: #10b981;
  }

  .dashboard__card-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .dashboard__card-label {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }

  .dashboard__card-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .dashboard__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 4rem 2rem;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    gap: 1rem;
  }

  .dashboard__placeholder-icon {
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-raised);
    border-radius: var(--radius-lg);
    color: var(--color-text-muted);
  }

  .dashboard__placeholder-icon svg {
    width: 2rem;
    height: 2rem;
  }

  .dashboard__placeholder-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .dashboard__placeholder-desc {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin: 0;
    max-width: 40ch;
    line-height: 1.7;
  }
</style>
