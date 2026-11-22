<script setup lang="ts">
withDefaults(defineProps<{ playlist?: boolean; subtitle?: boolean }>(), {
  playlist: false,
  subtitle: false,
})
</script>

<template>
  <ul class="dashboard__sidebar-list" role="status" aria-label="Loading sidebar">
    <li v-for="row in 5" :key="row" class="dashboard__sidebar-item sidebar-skeleton__row"
      :class="{ 'dashboard__sidebar-item--playlist': playlist }" aria-hidden="true">
      <div class="dashboard__sidebar-cover sidebar-skeleton__cover"></div>
      <div class="dashboard__sidebar-info">
        <div class="dashboard__sidebar-title-row">
          <span class="dashboard__sidebar-label sidebar-skeleton__line">&nbsp;</span>
        </div>
        <span v-if="subtitle" class="dashboard__sidebar-sub sidebar-skeleton__line sidebar-skeleton__line--short">&nbsp;</span>
      </div>
    </li>
  </ul>
</template>

<style scoped src="./SidebarItemLayout.css"></style>

<style scoped>
.sidebar-skeleton__row,
.sidebar-skeleton__row:hover {
  cursor: default;
  background: transparent;
}
.sidebar-skeleton__cover,
.sidebar-skeleton__line {
  background: linear-gradient(100deg, var(--color-surface-raised) 25%, color-mix(in srgb, var(--color-text) 8%, var(--color-surface-raised)) 50%, var(--color-surface-raised) 75%);
  background-size: 200% 100%;
  animation: sidebar-shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
.sidebar-skeleton__cover {
  border-radius: var(--radius-md);
}
.sidebar-skeleton__line {
  width: 80%;
}
.sidebar-skeleton__line--short {
  width: 50%;
}
@keyframes sidebar-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sidebar-skeleton__cover,
  .sidebar-skeleton__line { animation: none; }
}
</style>
