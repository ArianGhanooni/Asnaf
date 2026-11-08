<script setup lang="ts">
defineProps<{
  title: string;
  desc?: string;
}>();
</script>

<template>
  <div class="page-header">
    <div>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="desc" class="page-desc">{{ desc }}</p>
    </div>
    <div v-if="$slots.default" class="page-actions">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-header {
  margin-bottom: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 640px) {
    margin-bottom: 1rem;
    gap: 0.75rem;
  }
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin: 0;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }

  @media (max-width: 480px) {
    font-size: clamp(0.9rem, 4.4vw, 1.1rem);
  }

  @media (max-width: 360px) {
    font-size: 0.85rem;
  }
}

.page-desc {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

.page-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
