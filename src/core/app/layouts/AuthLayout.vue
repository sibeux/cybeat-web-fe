<script setup lang="ts">
  // Minimal layout wrapper for auth pages.
  // No business logic — just structural shell.
</script>

<template>
  <div class="auth-layout">
    <slot />
  </div>
</template>

<style scoped>
  .auth-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>
