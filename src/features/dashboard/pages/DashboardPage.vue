<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import AppLayout from '@/core/app/layouts/AppLayout.vue'
  import { useAuthStore } from '@/features/auth/index'
  import { useDashboardStore } from '../store/dashboard.store'

  const authStore = useAuthStore()
  const router = useRouter()
  const dashboardStore = useDashboardStore()
  
  const { albums, categories, playlists, isLoading, error } = storeToRefs(dashboardStore)

  onMounted(async () => {
    await dashboardStore.fetchDashboardData()
  })

  const resolveCoverUrl = (cover: any) => {
    if (!cover) return ''
    let coverStr = ''
    if (typeof cover === 'object') {
      coverStr = cover.cover_1 || cover.cover_2 || cover.cover_3 || cover.cover_4 || ''
    } else if (typeof cover === 'string') {
      coverStr = cover
    }
    if (!coverStr) return ''
    if (coverStr.startsWith('http') || coverStr.startsWith('data:')) return coverStr
    return `https://${coverStr}`
  }

  const goToAlbum = (item: any) => {
    if (!item.type || !item.id) return
    router.push({ 
      name: 'album', 
      params: { type: item.type, id: item.id },
      state: { albumName: item.title, artistName: item.author || '' }
    })
  }
</script>

<template>
  <AppLayout>
    <div class="dashboard">
      <div class="dashboard__welcome">
        <div class="dashboard__welcome-icon" aria-hidden="true">👋</div>
        <div>
          <h1 class="dashboard__title">
            Selamat datang{{ authStore.user?.name ? `, ${authStore.user.name}` : ' di CyBeat' }}!
          </h1>
          <p class="dashboard__subtitle">
            <template v-if="authStore.isAuthenticated">
              Anda berhasil masuk ke CyBeat. Dashboard sedang dalam pengembangan.
            </template>
            <template v-else>
              Silakan masuk untuk mengakses fitur penuh CyBeat. Dashboard sedang dalam pengembangan.
            </template>
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

      <div v-if="isLoading" class="dashboard__loading">
        <svg class="dashboard__spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        Memuat data...
      </div>
      <div v-else-if="error" class="dashboard__error">
        {{ error }}
      </div>
      <template v-else>
        <!-- Kategori Section -->
        <div class="dashboard__albums-section" v-if="categories.length > 0">
          <h2 class="dashboard__section-title">Kategori</h2>
          <div class="dashboard__album-grid">
            <div v-for="item in categories" :key="item.id" class="dashboard__album-card" @click="goToAlbum(item)">
              <div class="dashboard__album-cover" :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }">
                <img v-if="resolveCoverUrl(item.cover)" :src="resolveCoverUrl(item.cover)" :alt="item.title" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <div v-else class="dashboard__album-cover-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </div>
              </div>
              <div class="dashboard__album-info">
                <h3 class="dashboard__album-title" :title="item.title">{{ item.title }}</h3>
                <p v-if="item.author" class="dashboard__album-artist">Author: {{ item.author }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Album Section -->
        <div class="dashboard__albums-section" v-if="albums.length > 0">
          <h2 class="dashboard__section-title">Album Terbaru</h2>
          <div class="dashboard__album-grid">
            <div v-for="item in albums" :key="item.id" class="dashboard__album-card" @click="goToAlbum(item)">
              <div class="dashboard__album-cover" :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }">
                <img v-if="resolveCoverUrl(item.cover)" :src="resolveCoverUrl(item.cover)" :alt="item.title" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <div v-else class="dashboard__album-cover-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </div>
              </div>
              <div class="dashboard__album-info">
                <h3 class="dashboard__album-title" :title="item.title">{{ item.title }}</h3>
                <p class="dashboard__album-artist" :title="item.author">{{ item.author }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Playlist Section -->
        <div class="dashboard__albums-section" v-if="playlists.length > 0">
          <h2 class="dashboard__section-title">Playlist</h2>
          <div class="dashboard__album-grid">
            <div v-for="item in playlists" :key="item.id" class="dashboard__album-card" @click="goToAlbum(item)">
              <div class="dashboard__album-cover" :style="{ backgroundColor: item.bg_color || 'var(--color-surface-raised)' }">
                <img v-if="resolveCoverUrl(item.cover)" :src="resolveCoverUrl(item.cover)" :alt="item.title" loading="lazy" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                <div v-else class="dashboard__album-cover-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                </div>
              </div>
              <div class="dashboard__album-info">
                <h3 class="dashboard__album-title" :title="item.title">{{ item.title }}</h3>
                <p v-if="item.author" class="dashboard__album-artist" :title="item.author">{{ item.author }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
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

  .dashboard__albums-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .dashboard__section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .dashboard__loading,
  .dashboard__error,
  .dashboard__empty {
    padding: 3rem;
    text-align: center;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .dashboard__spinner {
    width: 2rem;
    height: 2rem;
    animation: spin 2s linear infinite;
    color: var(--color-primary);
  }

  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }

  .dashboard__error {
    color: #ef4444;
    border-color: #ef4444;
  }

  .dashboard__album-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.5rem;
  }

  .dashboard__album-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .dashboard__album-card:hover {
    transform: translateY(-4px);
  }

  .dashboard__album-cover {
    aspect-ratio: 1;
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .dashboard__album-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
  }

  .dashboard__album-card:hover .dashboard__album-cover img {
    transform: scale(1.05);
  }

  .dashboard__album-cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
  }

  .dashboard__album-cover-placeholder svg {
    width: 3rem;
    height: 3rem;
  }

  .dashboard__album-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .dashboard__album-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard__album-artist {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
